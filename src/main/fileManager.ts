import { promises as fs, existsSync, mkdirSync } from 'fs';
import { join, extname, basename } from 'path';
import { app, clipboard, nativeImage } from 'electron';
import sharp from 'sharp';
import { v4 as uuidv4 } from './uuid';
import { Database } from './database';
import { EmojiItem, ImportOptions, ExportOptions, AppSettings } from '../shared/types';
import { fileURLToPath } from 'url';
type NamingConvention = AppSettings['namingConvention'];

// Track temporary files for cleanup
const tempFiles = new Set<string>();

// Cleanup temporary files on exit
process.on('exit', () => {
  for (const file of tempFiles) {
    try {
      if (existsSync(file)) {
        fs.unlink(file).catch(() => {
          // Silently ignore cleanup errors
        });
      }
    } catch {
      // Silently ignore errors
    }
  }
});

export class FileManager {
  private storageDir: string;
  private database: Database;
  private storageDirInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(database: Database) {
    this.database = database;
    this.storageDir = join(app.getPath('userData'), 'emojis');
    this.ensureStorageDir();
  }

  private ensureStorageDir(): void {
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private async refreshStorageDir(): Promise<void> {
    // Prevent concurrent initialization
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        const configured = await this.database.getSetting('storageLocation');
        if (configured && typeof configured === 'string' && configured !== this.storageDir) {
          this.storageDir = configured;
        }
      } catch (_e) {
        // fallback to default already set
      }
      this.ensureStorageDir();
      this.storageDirInitialized = true;
    })();

    return this.initializationPromise;
  }

  private toNativePath(p: string): string {
    if (!p) return p;
    // Handle Windows UNC paths
    if (p.startsWith('\\\\')) return p;
    // Handle file URLs
    if (p.startsWith('file:')) {
      try {
        return fileURLToPath(p);
      } catch {
        // If conversion fails, return original
        return p;
      }
    }
    return p;
  }

  async importEmojis(options: ImportOptions): Promise<{ success: number; failed: number; duplicates: number }> {
    const stats = { success: 0, failed: 0, duplicates: 0 };

    try {
      if (!this.storageDirInitialized) {
        await this.refreshStorageDir();
      }

      let sources: string[] = [];
      if (Array.isArray(options.sourcePaths) && options.sourcePaths.length > 0) {
        sources = options.sourcePaths.map((s: string) => this.toNativePath(s));
      } else if (options.sourcePath) {
        const raw = options.sourcePath.includes(';') ? options.sourcePath.split(';') : [options.sourcePath];
        sources = raw.map(s => this.toNativePath(s.trim())).filter(Boolean);
      }

      const discoveredFiles: string[] = [];
      for (const source of sources) {
        try {
          const filesFromSource = await this.getImageFiles(source);
          discoveredFiles.push(...filesFromSource);
        } catch (_err) {
          stats.failed++;
        }
      }

      const uniqueFiles = Array.from(new Set(discoveredFiles));
      const importResult = await this.importFromPreparedFiles(uniqueFiles, {
        targetCategory: options.targetCategory,
        skipDuplicates: options.skipDuplicates,
        autoGenerateTags: options.autoGenerateTags
      });

      return {
        success: importResult.success,
        failed: importResult.failed + stats.failed,
        duplicates: importResult.duplicates
      };
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }

  async importFromPreparedFiles(files: string[], options: {
    targetCategory?: string;
    skipDuplicates?: boolean;
    autoGenerateTags?: boolean;
    extraTags?: string[];
  } = {}): Promise<{ success: number; failed: number; duplicates: number }> {
    const stats = { success: 0, failed: 0, duplicates: 0 };

    if (!files || files.length === 0) {
      return stats;
    }

    try {
      if (!this.storageDirInitialized) {
        await this.refreshStorageDir();
      }

      const uniqueFiles = Array.from(new Set(files.map((file) => this.toNativePath(file))));
      for (const filePath of uniqueFiles) {
        try {
          if (options.skipDuplicates && await this.checkDuplicate(filePath)) {
            stats.duplicates++;
            continue;
          }

          const emojiItem = await this.processFile(
            filePath,
            options.targetCategory,
            options.autoGenerateTags !== false,
            options.extraTags || []
          );
          await this.database.addEmoji(emojiItem);
          stats.success++;
        } catch (error) {
          console.error(`Failed to import prepared file ${filePath}:`, error);
          stats.failed++;
        }
      }
    } catch (error) {
      console.error('Import prepared files failed:', error);
      throw error;
    }

    return stats;
  }

  async isDuplicate(filePath: string): Promise<boolean> {
    return this.checkDuplicate(this.toNativePath(filePath));
  }

  private async getImageFiles(sourcePath: string): Promise<string[]> {
    const files: string[] = [];
    // Extended format support
    const supportedFormats = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
      '.svg', '.ico', '.tif', '.tiff', '.heic', '.heif',
      '.avif', '.jxl', '.apng'
    ];

    const stat = await fs.stat(sourcePath);
    
    if (stat.isFile()) {
      const ext = extname(sourcePath).toLowerCase();
      if (supportedFormats.includes(ext)) {
        files.push(sourcePath);
      }
    } else if (stat.isDirectory()) {
      const entries = await fs.readdir(sourcePath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(sourcePath, entry.name);
        
        if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (supportedFormats.includes(ext)) {
            files.push(fullPath);
          }
        } else if (entry.isDirectory()) {
          const subFiles = await this.getImageFiles(fullPath);
          files.push(...subFiles);
        }
      }
    }

    return files;
  }

  private async checkDuplicate(filePath: string): Promise<boolean> {
    const fileStats = await fs.stat(filePath);
    const filename = basename(filePath);
    
    const existingEmojis = await this.database.getEmojis({
      keyword: filename
    });

    return existingEmojis.some(emoji => 
      emoji.filename === filename && emoji.size === fileStats.size
    );
  }

  private async processFile(filePath: string, categoryId?: string, autoGenerateTags: boolean = true, extraTags: string[] = []): Promise<Omit<EmojiItem, 'createdAt' | 'updatedAt'>> {
    const fileStats = await fs.stat(filePath);
    const filename = basename(filePath);
    const ext = extname(filePath).toLowerCase();
    const id = uuidv4();

    const storagePath = join(this.storageDir, `${id}${ext}`);

    await fs.copyFile(filePath, storagePath);

    let width = 0;
    let height = 0;
    try {
      const metadata = await sharp(filePath).metadata();
      width = metadata.width || 0;
      height = metadata.height || 0;
    } catch (error) {
      try {
        const img = nativeImage.createFromPath(filePath);
        const size = img.getSize();
        width = size.width || 0;
        height = size.height || 0;
      } catch (e2) {
        console.warn(`Could not get dimensions for ${filePath}:`, e2);
      }
    }

    const tags = autoGenerateTags ? this.generateTags(filename) : [];
    if (extraTags.length > 0) {
      tags.push(...extraTags);
    }

    const uniqueTags = [...new Set(tags.map(tag => tag.toLowerCase()))];

    return {
      id,
      filename,
      originalPath: filePath,
      storagePath,
      format: ext.substring(1),
      size: fileStats.size,
      width,
      height,
      tags: uniqueTags,
      categoryId: categoryId || 'default',
      isFavorite: false,
      usageCount: 0
    };
  }

  private generateTags(filename: string): string[] {
    const tags: string[] = [];
    const nameWithoutExt = basename(filename, extname(filename));
    
    const words = nameWithoutExt
      .replace(/[_-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1);
    
    tags.push(...words);
    
    return [...new Set(tags.map(tag => tag.toLowerCase()))];
  }

  async exportEmojis(options: ExportOptions): Promise<void> {
    if (!this.storageDirInitialized) {
      await this.refreshStorageDir();
    }

    const {
      targetPath,
      emojiIds,
      maintainStructure,
      format,
      groupByCategory,
      groupByTag,
      includeMetadata,
      generateIndex,
      namingPattern = '{name}'
    } = options;

    await fs.mkdir(targetPath, { recursive: true });

    // 批量获取表情包
    const allEmojis = await this.database.getEmojis();
    const targetEmojis = allEmojis.filter(emoji => emojiIds.includes(emoji.id));

    // 获取分类信息
    const categories = await this.database.getCategories();
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const exportedFiles: Array<{ emoji: EmojiItem; outputPath: string }> = [];

    for (const emoji of targetEmojis) {
      try {
        // 确定输出目录
        let outputDir = targetPath;

        if (groupByCategory && emoji.categoryId) {
          const category = categoryMap.get(emoji.categoryId);
          if (category) {
            outputDir = join(targetPath, this.sanitizePath(category.name));
            await fs.mkdir(outputDir, { recursive: true });
          }
        }

        if (groupByTag && emoji.tags.length > 0) {
          // 为每个标签创建副本
          for (const tag of emoji.tags) {
            const tagDir = join(targetPath, 'tags', this.sanitizePath(tag));
            await fs.mkdir(tagDir, { recursive: true });
            const tagFilePath = join(tagDir, this.generateFileName(emoji, namingPattern));
            await fs.copyFile(emoji.storagePath, tagFilePath);
          }
        }

        // 生成文件名
        const outputFileName = this.generateFileName(emoji, namingPattern);
        const outputPath = join(outputDir, outputFileName);

        // 复制或转换文件
        if (format && format !== extname(emoji.filename).slice(1).toLowerCase()) {
          const convertedPath = await this.convertFormat(emoji.storagePath, format);
          if (convertedPath) {
            await fs.copyFile(convertedPath, outputPath.replace(extname(outputPath), `.${format}`));
          } else {
            await fs.copyFile(emoji.storagePath, outputPath);
          }
        } else {
          await fs.copyFile(emoji.storagePath, outputPath);
        }

        exportedFiles.push({ emoji, outputPath });
      } catch (error) {
        console.error(`Failed to export ${emoji.filename}:`, error);
      }
    }

    // 生成元数据文件
    if (includeMetadata) {
      const metadataPath = join(targetPath, 'metadata.json');
      const metadata = {
        exportDate: new Date().toISOString(),
        totalFiles: exportedFiles.length,
        files: exportedFiles.map(({ emoji, outputPath }) => ({
          id: emoji.id,
          filename: basename(outputPath),
          originalName: emoji.filename,
          tags: emoji.tags,
          category: emoji.categoryId ? categoryMap.get(emoji.categoryId)?.name : undefined,
          size: emoji.size,
          dimensions: `${emoji.width}x${emoji.height}`,
          format: emoji.format
        }))
      };
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    // 生成索引HTML
    if (generateIndex) {
      const indexPath = join(targetPath, 'index.html');
      const indexHtml = this.generateIndexHtml(exportedFiles.map(f => f.emoji));
      await fs.writeFile(indexPath, indexHtml);
    }
  }

  private generateFileName(emoji: EmojiItem, pattern: string): string {
    const now = new Date();
    const replacements: Record<string, string> = {
      '{name}': basename(emoji.filename, extname(emoji.filename)),
      '{date}': now.toISOString().split('T')[0],
      '{time}': now.toTimeString().split(' ')[0].replace(/:/g, '-'),
      '{index}': emoji.id.slice(0, 8),
      '{format}': extname(emoji.filename).slice(1)
    };

    let fileName = pattern;
    for (const [key, value] of Object.entries(replacements)) {
      fileName = fileName.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    if (!extname(fileName)) {
      fileName += extname(emoji.filename);
    }

    return this.sanitizePath(fileName);
  }

  private sanitizePath(name: string): string {
    return name.replace(/[<>:"|?*]/g, '_');
  }

  private generateIndexHtml(emojis: EmojiItem[]): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>表情包导出 - ${new Date().toLocaleDateString()}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f0f0f0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; }
    .card { background: white; border-radius: 8px; padding: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .card img { width: 100%; height: 120px; object-fit: contain; }
    .card .name { margin-top: 5px; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <h1>表情包导出</h1>
  <p>导出时间：${new Date().toLocaleString()} | 文件数量：${emojis.length}</p>
  <div class="grid">
    ${emojis.map(e => `
      <div class="card">
        <img src="${e.filename}" alt="${e.filename}">
        <div class="name">${e.filename}</div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;
  }

  async deleteEmojiFile(emojiId: string): Promise<void> {
    if (!this.storageDirInitialized) {
      await this.refreshStorageDir();
    }
    const emojis = await this.database.getEmojis();
    const emoji = emojis.find(e => e.id === emojiId);
    
    if (emoji && existsSync(emoji.storagePath)) {
      await fs.unlink(emoji.storagePath);
    }
  }

  async copyToClipboard(filePath: string): Promise<void> {
    try {
      const image = nativeImage.createFromPath(this.toNativePath(filePath));
      clipboard.writeImage(image);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw error;
    }
  }

  async getFileInfo(filePath: string): Promise<{
    size: number;
    width: number;
    height: number;
    format: string;
    createdAt: Date;
    modifiedAt: Date;
  }> {
    try {
      const stats = await fs.stat(this.toNativePath(filePath));
      let width = 0;
      let height = 0;
      try {
        const metadata = await sharp(this.toNativePath(filePath)).metadata();
        width = metadata.width || 0;
        height = metadata.height || 0;
      } catch (_e) {
        try {
          const img = nativeImage.createFromPath(this.toNativePath(filePath));
          const size = img.getSize();
          width = size.width || 0;
          height = size.height || 0;
        } catch (error) {
          console.warn('Failed to get image dimensions:', error);
        }
      }

      return {
        size: stats.size,
        width,
        height,
        format: extname(this.toNativePath(filePath)).substring(1),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch (error) {
      console.error('Failed to get file info:', error);
      throw error;
    }
  }

  async readAsDataURL(filePath: string): Promise<string> {
    try {
      const src = this.toNativePath(filePath);
      const buf = await fs.readFile(src);
      const ext = extname(src).toLowerCase();
      const mime = ext === '.png' ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
        : ext === '.gif' ? 'image/gif'
        : ext === '.webp' ? 'image/webp'
        : ext === '.bmp' ? 'image/bmp'
        : 'application/octet-stream';
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch (error) {
      console.error('Failed to read file as data URL:', error);
      throw error;
    }
  }

  async convertFormat(filePath: string, targetFormat: string): Promise<string> {
    try {
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(targetFormat.toLowerCase())) {
        throw new Error('Unsupported target format');
      }
      const src = this.toNativePath(filePath);
      const currentExt = extname(src).replace(/^\./, '').toLowerCase();
      const target = targetFormat.toLowerCase();
      if (currentExt === target) {
        return src;
      }

      // Get naming convention settings
      const namingSettings = await this.getNamingConvention();

      const tmpDir = app.getPath('temp');
      const originalName = basename(src, extname(src));

      // Generate filename based on naming convention
      const filename = this.generateConvertedFilename(originalName, target, namingSettings);
      const outputPath = join(tmpDir, filename);

      // Track temp file for cleanup
      tempFiles.add(outputPath);

      let pipeline = sharp(src);
      switch (target) {
        case 'jpg':
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality: 90 });
          break;
        case 'png':
          pipeline = pipeline.png();
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality: 90 });
          break;
      }
      try {
        await pipeline.toFile(outputPath);
        // Schedule cleanup after 15 minutes
        setTimeout(() => {
          tempFiles.delete(outputPath);
          fs.unlink(outputPath).catch(() => {});
        }, 15 * 60 * 1000);
        return outputPath;
      } catch (sharpErr) {
        // Fallback: try Electron nativeImage for png/jpeg
        if (target === 'png' || target === 'jpg' || target === 'jpeg') {
          try {
            const img = nativeImage.createFromPath(src);
            const buf = target === 'png' ? img.toPNG() : img.toJPEG(90);
            await fs.writeFile(outputPath, buf);
            // Schedule cleanup after 15 minutes
            setTimeout(() => {
              tempFiles.delete(outputPath);
              fs.unlink(outputPath).catch(() => {});
            }, 15 * 60 * 1000);
            return outputPath;
          } catch (_fallbackErr) {
            throw sharpErr;
          }
        }
        throw sharpErr;
      }
    } catch (error) {
      console.error('Failed to convert format:', error);
      throw error;
    }
  }

  private async getNamingConvention(): Promise<NamingConvention> {
    const namingSettings = await this.database.getSetting('namingConvention');
    if (namingSettings && typeof namingSettings === 'object') {
      return namingSettings as NamingConvention;
    }
    // Default naming convention
    return {
      pattern: '{name}_{timestamp}',
      useOriginalName: true,
      includeTimestamp: true,
      includeFormat: true,
      customPrefix: '',
      customSuffix: ''
    };
  }

  private generateConvertedFilename(originalName: string, targetFormat: string, namingSettings: NamingConvention): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    let filename = '';

    if (namingSettings.pattern) {
      // Use custom pattern
      filename = namingSettings.pattern
        .replace('{name}', namingSettings.useOriginalName ? originalName : 'converted')
        .replace('{timestamp}', timestamp)
        .replace('{format}', targetFormat)
        .replace('{prefix}', namingSettings.customPrefix || '')
        .replace('{suffix}', namingSettings.customSuffix || '');
    } else {
      // Build filename from components
      const parts = [];

      if (namingSettings.customPrefix) {
        parts.push(namingSettings.customPrefix);
      }

      if (namingSettings.useOriginalName) {
        parts.push(originalName);
      }

      if (namingSettings.includeTimestamp) {
        parts.push(timestamp);
      }

      if (namingSettings.customSuffix) {
        parts.push(namingSettings.customSuffix);
      }

      filename = parts.join('_') || 'converted';
    }

    // Add format extension
    if (namingSettings.includeFormat) {
      return `${filename}.${targetFormat}`;
    } else {
      return `${filename}.${targetFormat}`;
    }
  }

  // Method to update storage location
  async updateStorageLocation(newPath: string): Promise<void> {
    try {
      // Validate path
      if (!existsSync(newPath)) {
        mkdirSync(newPath, { recursive: true });
      }

      // Update setting
      await this.database.setSetting('storageLocation', newPath);

      // Update internal storage directory
      this.storageDir = newPath;
      this.storageDirInitialized = false;

      console.log(`Storage location updated to: ${newPath}`);
    } catch (error) {
      console.error('Failed to update storage location:', error);
      throw error;
    }
  }

  // Method to rename emoji
  async renameEmoji(emojiId: string, newName: string): Promise<boolean> {
    try {
      // Get emoji from database
      const emojis = await this.database.getEmojis({});
      const emoji = emojis.find(e => e.id === emojiId);

      if (!emoji) {
        throw new Error('表情包不存在');
      }

      const oldPath = emoji.storagePath;

      // Get file extension
      const extension = extname(emoji.filename);
      const newFilename = newName + extension;

      // Create new file path
      const newPath = join(this.storageDir, newFilename);

      // Check if new name already exists
      if (existsSync(newPath) && oldPath !== newPath) {
        throw new Error('文件名已存在');
      }

      // Rename file
      await fs.rename(oldPath, newPath);

      // Update database
      await this.database.updateEmoji(emojiId, {
        filename: newFilename,
        storagePath: newPath,
        updatedAt: new Date()
      });

      console.log(`Emoji renamed from ${emoji.filename} to ${newFilename}`);
      return true;
    } catch (error) {
      console.error('Failed to rename emoji:', error);
      throw error;
    }
  }
}
