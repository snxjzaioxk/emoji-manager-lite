import sharp from 'sharp';
import { promises as fs } from 'fs';
import { extname, basename, join } from 'path';
import { app, nativeImage } from 'electron';

export interface ConversionOptions {
  format: 'jpeg' | 'png' | 'webp' | 'gif' | 'avif' | 'tiff';
  quality?: number;
  lossless?: boolean;
  compressionLevel?: number;
  progressive?: boolean;
  optimizeScans?: boolean;
  effort?: number; // For AVIF
  animated?: boolean; // Preserve animation
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  };
}

export interface FormatInfo {
  format: string;
  mimeType: string;
  supportsAnimation: boolean;
  supportsTransparency: boolean;
  maxQuality: number;
  defaultQuality: number;
  description: string;
}

export const SUPPORTED_FORMATS: Record<string, FormatInfo> = {
  jpeg: {
    format: 'jpeg',
    mimeType: 'image/jpeg',
    supportsAnimation: false,
    supportsTransparency: false,
    maxQuality: 100,
    defaultQuality: 90,
    description: 'JPEG - 最广泛支持的有损压缩格式'
  },
  jpg: {
    format: 'jpeg',
    mimeType: 'image/jpeg',
    supportsAnimation: false,
    supportsTransparency: false,
    maxQuality: 100,
    defaultQuality: 90,
    description: 'JPEG - 最广泛支持的有损压缩格式'
  },
  png: {
    format: 'png',
    mimeType: 'image/png',
    supportsAnimation: false,
    supportsTransparency: true,
    maxQuality: 9,
    defaultQuality: 6,
    description: 'PNG - 无损压缩，支持透明度'
  },
  webp: {
    format: 'webp',
    mimeType: 'image/webp',
    supportsAnimation: true,
    supportsTransparency: true,
    maxQuality: 100,
    defaultQuality: 80,
    description: 'WebP - 现代格式，支持动画和透明度，文件更小'
  },
  gif: {
    format: 'gif',
    mimeType: 'image/gif',
    supportsAnimation: true,
    supportsTransparency: true,
    maxQuality: 100,
    defaultQuality: 100,
    description: 'GIF - 支持动画，颜色有限'
  },
  avif: {
    format: 'avif',
    mimeType: 'image/avif',
    supportsAnimation: true,
    supportsTransparency: true,
    maxQuality: 100,
    defaultQuality: 50,
    description: 'AVIF - 最新格式，压缩率最高'
  },
  tiff: {
    format: 'tiff',
    mimeType: 'image/tiff',
    supportsAnimation: false,
    supportsTransparency: true,
    maxQuality: 100,
    defaultQuality: 100,
    description: 'TIFF - 专业图像格式，无损'
  },
  bmp: {
    format: 'bmp',
    mimeType: 'image/bmp',
    supportsAnimation: false,
    supportsTransparency: false,
    maxQuality: 100,
    defaultQuality: 100,
    description: 'BMP - Windows位图，文件较大'
  },
  svg: {
    format: 'svg',
    mimeType: 'image/svg+xml',
    supportsAnimation: true,
    supportsTransparency: true,
    maxQuality: 100,
    defaultQuality: 100,
    description: 'SVG - 矢量图形，可无限缩放'
  },
  ico: {
    format: 'ico',
    mimeType: 'image/x-icon',
    supportsAnimation: false,
    supportsTransparency: true,
    maxQuality: 100,
    defaultQuality: 100,
    description: 'ICO - Windows图标格式'
  },
  heic: {
    format: 'heic',
    mimeType: 'image/heic',
    supportsAnimation: false,
    supportsTransparency: true,
    maxQuality: 100,
    defaultQuality: 80,
    description: 'HEIC - 苹果设备使用的高效格式'
  }
};

export class FormatConverter {
  /**
   * Convert an image to a different format
   */
  async convert(
    inputPath: string,
    outputPath: string,
    options: ConversionOptions
  ): Promise<void> {
    const inputExt = extname(inputPath).toLowerCase().slice(1);
    const inputFormat = SUPPORTED_FORMATS[inputExt];

    if (!inputFormat) {
      throw new Error(`Unsupported input format: ${inputExt}`);
    }

    try {
      let pipeline = sharp(inputPath);

      // Apply resize if specified
      if (options.resize) {
        pipeline = pipeline.resize({
          width: options.resize.width,
          height: options.resize.height,
          fit: options.resize.fit || 'inside',
          withoutEnlargement: true
        });
      }

      // Convert to target format
      switch (options.format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({
            quality: options.quality || 90,
            progressive: options.progressive !== false,
            optimizeScans: options.optimizeScans !== false
          });
          break;

        case 'png':
          pipeline = pipeline.png({
            compressionLevel: options.compressionLevel || 6,
            progressive: options.progressive !== false
          });
          break;

        case 'webp':
          pipeline = pipeline.webp({
            quality: options.quality || 80,
            lossless: options.lossless || false,
            effort: options.effort || 4
          });
          break;

        case 'avif':
          pipeline = pipeline.avif({
            quality: options.quality || 50,
            lossless: options.lossless || false,
            effort: options.effort || 4
          });
          break;

        case 'tiff':
          pipeline = pipeline.tiff({
            quality: options.quality || 100,
            compression: options.lossless ? 'lzw' : 'jpeg'
          });
          break;

        case 'gif':
          // GIF conversion is complex, especially for animated GIFs
          // For now, use a fallback approach
          if (inputFormat.supportsAnimation) {
            // Try to preserve animation (requires additional library)
            await this.convertAnimatedGif(inputPath, outputPath, options);
            return;
          } else {
            pipeline = pipeline.gif();
          }
          break;

        default:
          throw new Error(`Unsupported output format: ${options.format}`);
      }

      await pipeline.toFile(outputPath);
    } catch (error) {
      // Fallback to Electron's nativeImage for formats Sharp doesn't support well
      console.warn('Sharp conversion failed, trying nativeImage:', error);
      await this.convertWithNativeImage(inputPath, outputPath, options);
    }
  }

  /**
   * Fallback conversion using Electron's nativeImage
   */
  private async convertWithNativeImage(
    inputPath: string,
    outputPath: string,
    options: ConversionOptions
  ): Promise<void> {
    const img = nativeImage.createFromPath(inputPath);

    if (img.isEmpty()) {
      throw new Error('Failed to load image with nativeImage');
    }

    let buffer: Buffer;

    switch (options.format) {
      case 'png':
        buffer = img.toPNG();
        break;
      case 'jpeg':
        buffer = img.toJPEG(options.quality || 90);
        break;
      default:
        throw new Error(`nativeImage does not support format: ${options.format}`);
    }

    await fs.writeFile(outputPath, buffer);
  }

  /**
   * Convert animated GIF (placeholder - requires gifenc or similar)
   */
  private async convertAnimatedGif(
    inputPath: string,
    outputPath: string,
    options: ConversionOptions
  ): Promise<void> {
    // This is a simplified implementation
    // In production, you'd use a library like gifenc or sharp-gif
    console.warn('Animated GIF conversion not fully implemented');

    // For now, just extract first frame
    const pipeline = sharp(inputPath, { animated: false })
      .gif();

    await pipeline.toFile(outputPath);
  }

  /**
   * Batch convert multiple files
   */
  async batchConvert(
    files: string[],
    outputDir: string,
    options: ConversionOptions,
    onProgress?: (current: number, total: number) => void
  ): Promise<{
    success: number;
    failed: number;
    results: Array<{ input: string; output: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{ input: string; output: string; success: boolean; error?: string }> = [];
    let success = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const inputPath = files[i];
      const inputName = basename(inputPath, extname(inputPath));
      const outputPath = join(outputDir, `${inputName}.${options.format}`);

      try {
        await this.convert(inputPath, outputPath, options);
        results.push({ input: inputPath, output: outputPath, success: true });
        success++;
      } catch (error) {
        results.push({
          input: inputPath,
          output: outputPath,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        failed++;
      }

      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    }

    return { success, failed, results };
  }

  /**
   * Get information about a format
   */
  getFormatInfo(format: string): FormatInfo | null {
    return SUPPORTED_FORMATS[format.toLowerCase()] || null;
  }

  /**
   * Check if a format is supported
   */
  isFormatSupported(format: string): boolean {
    return format.toLowerCase() in SUPPORTED_FORMATS;
  }

  /**
   * Detect image format from file
   */
  async detectFormat(filePath: string): Promise<string | null> {
    try {
      const metadata = await sharp(filePath).metadata();
      return metadata.format || null;
    } catch {
      // Fallback to extension
      return extname(filePath).slice(1).toLowerCase();
    }
  }

  /**
   * Get image metadata
   */
  async getMetadata(filePath: string): Promise<{
    format: string;
    width: number;
    height: number;
    size: number;
    hasAlpha: boolean;
    isAnimated: boolean;
    pages?: number;
  }> {
    const stats = await fs.stat(filePath);
    const metadata = await sharp(filePath).metadata();

    return {
      format: metadata.format || 'unknown',
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: stats.size,
      hasAlpha: metadata.hasAlpha || false,
      isAnimated: (metadata.pages || 1) > 1,
      pages: metadata.pages
    };
  }

  /**
   * Optimize image (reduce file size without changing format)
   */
  async optimize(
    inputPath: string,
    outputPath: string,
    aggressive: boolean = false
  ): Promise<{ originalSize: number; newSize: number; reduction: number }> {
    const originalStats = await fs.stat(inputPath);
    const originalSize = originalStats.size;

    const format = await this.detectFormat(inputPath);

    if (!format) {
      throw new Error('Could not detect image format');
    }

    const options: ConversionOptions = {
      format: format as any,
      quality: aggressive ? 70 : 85,
      compressionLevel: aggressive ? 9 : 6,
      progressive: true,
      optimizeScans: true
    };

    await this.convert(inputPath, outputPath, options);

    const newStats = await fs.stat(outputPath);
    const newSize = newStats.size;
    const reduction = ((originalSize - newSize) / originalSize) * 100;

    return { originalSize, newSize, reduction };
  }
}

// Export singleton instance
export const formatConverter = new FormatConverter();