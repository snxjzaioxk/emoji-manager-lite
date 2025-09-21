import { promises as fs, existsSync, mkdirSync } from 'fs';
import { join, extname, basename } from 'path';
import { app, clipboard, nativeImage } from 'electron';
import sharp from 'sharp';
import { v4 as uuidv4 } from './uuid';
import { Database } from './database';
import { EmojiItem, ImportOptions, ExportOptions } from '../shared/types';

export class FileManager {
  private storageDir: string;
  private database: Database;
  private storageDirInitialized = false;

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
  }

  async importEmojis(options: ImportOptions): Promise<{ success: number; failed: number; duplicates: number }> {
    const stats = { success: 0, failed: 0, duplicates: 0 };
    
    try {
      if (!this.storageDirInitialized) {
        await this.refreshStorageDir();
      }

      // Build list of sources from array or semicolon-separated string
      let sources: string[] = [];
      if (Array.isArray((options as any).sourcePaths) && (options as any).sourcePaths.length > 0) {
        sources = (options as any).sourcePaths as string[];
      } else if (options.sourcePath) {
        const raw = options.sourcePath.includes(';') ? options.sourcePath.split(';') : [options.sourcePath];
        sources = raw.map(s => s.trim()).filter(Boolean);
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

      // de-duplicate file list
      const files = Array.from(new Set(discoveredFiles));
      
      for (const filePath of files) {
        try {
          const isDuplicate = await this.checkDuplicate(filePath);
          
          if (isDuplicate && options.skipDuplicates) {
            stats.duplicates++;
            continue;
          }

          const emojiItem = await this.processFile(filePath, options.targetCategory);
          await this.database.addEmoji(emojiItem);
          stats.success++;
        } catch (error) {
          console.error(`Failed to import ${filePath}:`, error);
          stats.failed++;
        }
      }
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }

    return stats;
  }

  private async getImageFiles(sourcePath: string): Promise<string[]> {
    const files: string[] = [];
    const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

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

  private async processFile(filePath: string, categoryId?: string): Promise<Omit<EmojiItem, 'createdAt' | 'updatedAt'>> {
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

    const tags = this.generateTags(filename);

    return {
      id,
      filename,
      originalPath: filePath,
      storagePath,
      format: ext.substring(1),
      size: fileStats.size,
      width,
      height,
      tags,
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
    const emojis = await this.database.getEmojis();
    const targetEmojis = emojis.filter(emoji => options.emojiIds.includes(emoji.id));

    for (const emoji of targetEmojis) {
      const targetPath = join(options.targetPath, emoji.filename);
      await fs.copyFile(emoji.storagePath, targetPath);
    }
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
      const image = nativeImage.createFromPath(filePath);
      clipboard.writeImage(image);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw error;
    }
  }

  async getFileInfo(filePath: string): Promise<any> {
    try {
      const stats = await fs.stat(filePath);
      let width = 0;
      let height = 0;
      try {
        const metadata = await sharp(filePath).metadata();
        width = metadata.width || 0;
        height = metadata.height || 0;
      } catch (_e) {
        try {
          const img = nativeImage.createFromPath(filePath);
          const size = img.getSize();
          width = size.width || 0;
          height = size.height || 0;
        } catch (_) {}
      }

      return {
        size: stats.size,
        width,
        height,
        format: extname(filePath).substring(1),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch (error) {
      console.error('Failed to get file info:', error);
      throw error;
    }
  }

  async convertFormat(filePath: string, targetFormat: string): Promise<string> {
    try {
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(targetFormat.toLowerCase())) {
        throw new Error('Unsupported target format');
      }
      const currentExt = extname(filePath).replace(/^\./, '').toLowerCase();
      const target = targetFormat.toLowerCase();
      if (currentExt === target) {
        return filePath;
      }
      const tmpDir = app.getPath('temp');
      const base = basename(filePath, extname(filePath));
      const outputPath = join(tmpDir, `${base}_${Date.now()}.${target}`);
      let pipeline = sharp(filePath);
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
      await pipeline.toFile(outputPath);
      return outputPath;
    } catch (error) {
      console.error('Failed to convert format:', error);
      throw error;
    }
  }
}
