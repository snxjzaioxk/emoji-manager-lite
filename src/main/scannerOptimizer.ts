import { promises as fs, createReadStream } from 'fs';
import { join, extname, basename } from 'path';
import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import PQueue from 'p-queue';

interface ScanProgress {
  totalFiles: number;
  processedFiles: number;
  currentPath: string;
  percentage: number;
  estimatedTimeRemaining: number;
  filesPerSecond: number;
}

interface WorkerTask {
  type: 'decode' | 'hash' | 'process';
  filePath: string;
  data?: Buffer;
}

interface WorkerResult {
  success: boolean;
  filePath: string;
  result?: any;
  error?: string;
}

interface CacheEntry {
  hash: string;
  size: number;
  timestamp: number;
  isDuplicate: boolean;
}

export class ScannerOptimizer extends EventEmitter {
  private queue: PQueue;
  private cache: Map<string, CacheEntry>;
  private workers: Worker[];
  private workerPool: Worker[];
  private startTime: number;
  private processedCount: number;
  private totalCount: number;
  private progressInterval?: NodeJS.Timeout;

  constructor(private options: {
    maxConcurrency?: number;
    workerCount?: number;
    cacheSize?: number;
    progressInterval?: number;
  } = {}) {
    super();

    this.queue = new PQueue({
      concurrency: options.maxConcurrency || 10
    });

    this.cache = new Map();
    this.workers = [];
    this.workerPool = [];
    this.startTime = Date.now();
    this.processedCount = 0;
    this.totalCount = 0;

    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    const workerCount = this.options.workerCount || 4;

    // Worker implementation would be in a separate file
    // For now, we'll simulate worker functionality
    for (let i = 0; i < workerCount; i++) {
      // In production, create actual Worker threads
      // this.workers.push(new Worker('./scanWorker.js'));
    }
  }

  async optimizedScan(paths: string[]): Promise<{
    files: string[];
    stats: {
      totalScanned: number;
      duplicatesFound: number;
      timeElapsed: number;
      averageSpeed: number;
    };
  }> {
    this.startTime = Date.now();
    this.processedCount = 0;

    // Start progress reporting
    this.startProgressReporting();

    const allFiles: string[] = [];
    const duplicates = new Set<string>();

    // Collect all files first (with concurrency control)
    const fileCollectionTasks = paths.map(path =>
      this.queue.add(() => this.collectFilesOptimized(path))
    );

    const fileGroups = await Promise.all(fileCollectionTasks);
    const flatFiles = fileGroups.flat();
    this.totalCount = flatFiles.length;

    // Process files in batches with concurrency control
    const batchSize = 100;
    const batches = this.createBatches(flatFiles, batchSize);

    for (const batch of batches) {
      const results = await Promise.all(
        batch.map(file =>
          this.queue.add(() => this.processFileOptimized(file) as Promise<{ filePath: string; isDuplicate: boolean }>)
        )
      );

      for (const result of results) {
        if (result.isDuplicate) {
          duplicates.add(result.filePath);
        } else {
          allFiles.push(result.filePath);
        }

        this.processedCount++;
        this.emitProgress();
      }
    }

    this.stopProgressReporting();

    const timeElapsed = Date.now() - this.startTime;

    return {
      files: allFiles,
      stats: {
        totalScanned: flatFiles.length,
        duplicatesFound: duplicates.size,
        timeElapsed,
        averageSpeed: flatFiles.length / (timeElapsed / 1000)
      }
    };
  }

  private async collectFilesOptimized(rootPath: string): Promise<string[]> {
    const files: string[] = [];
    const queue: string[] = [rootPath];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentPath = queue.shift()!;

      if (visited.has(currentPath)) continue;
      visited.add(currentPath);

      try {
        const stats = await fs.stat(currentPath);

        if (stats.isDirectory()) {
          const entries = await fs.readdir(currentPath);

          // Add directories to queue for processing
          for (const entry of entries) {
            const fullPath = join(currentPath, entry);
            queue.push(fullPath);
          }
        } else if (stats.isFile() && this.isImageFile(currentPath)) {
          files.push(currentPath);
        }
      } catch (error) {
        // Log error but continue scanning
        this.emit('error', { path: currentPath, error });
      }
    }

    return files;
  }

  private async processFileOptimized(filePath: string): Promise<{
    filePath: string;
    isDuplicate: boolean;
    hash?: string;
  }> {
    // Check cache first
    const cacheKey = await this.getCacheKey(filePath);

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;

      // Check if cache is still valid (file not modified)
      const stats = await fs.stat(filePath);
      if (stats.mtime.getTime() <= cached.timestamp) {
        return {
          filePath,
          isDuplicate: cached.isDuplicate,
          hash: cached.hash
        };
      }
    }

    // Calculate file hash for duplicate detection
    const hash = await this.calculateFileHash(filePath);

    // Check if we've seen this hash before
    const isDuplicate = this.checkDuplicate(hash);

    // Update cache
    const stats = await fs.stat(filePath);
    this.cache.set(cacheKey, {
      hash,
      size: stats.size,
      timestamp: stats.mtime.getTime(),
      isDuplicate
    });

    // Limit cache size
    if (this.cache.size > (this.options.cacheSize || 10000)) {
      this.pruneCache();
    }

    return {
      filePath,
      isDuplicate,
      hash
    };
  }

  private async getCacheKey(filePath: string): Promise<string> {
    const stats = await fs.stat(filePath);
    return `${filePath}:${stats.size}:${stats.mtime.getTime()}`;
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('md5');
      const stream = createReadStream(filePath);

      stream.on('data', (data: string | Buffer) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private checkDuplicate(hash: string): boolean {
    // In production, this would check against a database
    // For now, we'll use a simple in-memory check
    const seenHashes = new Set<string>();

    if (seenHashes.has(hash)) {
      return true;
    }

    seenHashes.add(hash);
    return false;
  }

  private isImageFile(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
    return imageExtensions.includes(ext);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  private pruneCache(): void {
    // Remove oldest entries when cache is too large
    const maxSize = this.options.cacheSize || 10000;
    const toRemove = this.cache.size - maxSize;

    if (toRemove <= 0) return;

    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  private startProgressReporting(): void {
    const interval = this.options.progressInterval || 1000;

    this.progressInterval = setInterval(() => {
      this.emitProgress();
    }, interval);
  }

  private stopProgressReporting(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = undefined;
    }
  }

  private emitProgress(): void {
    const elapsed = Date.now() - this.startTime;
    const filesPerSecond = this.processedCount / (elapsed / 1000);
    const remaining = this.totalCount - this.processedCount;
    const estimatedTimeRemaining = remaining / filesPerSecond * 1000;

    const progress: ScanProgress = {
      totalFiles: this.totalCount,
      processedFiles: this.processedCount,
      currentPath: '', // Would be tracked during processing
      percentage: (this.processedCount / Math.max(this.totalCount, 1)) * 100,
      estimatedTimeRemaining,
      filesPerSecond
    };

    this.emit('progress', progress);
  }

  async cleanup(): Promise<void> {
    // Clean up workers
    for (const worker of this.workers) {
      // worker.terminate();
    }

    // Clear cache
    this.cache.clear();

    // Stop progress reporting
    this.stopProgressReporting();
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private metrics: Map<string, {
    count: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
  }>;

  constructor() {
    this.metrics = new Map();
  }

  startTimer(operation: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(operation, duration);
    };
  }

  recordMetric(operation: string, duration: number): void {
    const existing = this.metrics.get(operation) || {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: -Infinity
    };

    this.metrics.set(operation, {
      count: existing.count + 1,
      totalTime: existing.totalTime + duration,
      minTime: Math.min(existing.minTime, duration),
      maxTime: Math.max(existing.maxTime, duration)
    });
  }

  getReport(): Record<string, {
    count: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
  }> {
    const report: Record<string, any> = {};

    for (const [operation, metrics] of this.metrics.entries()) {
      report[operation] = {
        ...metrics,
        averageTime: metrics.totalTime / metrics.count
      };
    }

    return report;
  }

  reset(): void {
    this.metrics.clear();
  }
}

// Memory management utilities
export class MemoryManager {
  private heapUsageThreshold: number;
  private gcInterval?: NodeJS.Timeout;

  constructor(thresholdMB: number = 500) {
    this.heapUsageThreshold = thresholdMB * 1024 * 1024;
    this.startMonitoring();
  }

  private startMonitoring(): void {
    this.gcInterval = setInterval(() => {
      const usage = process.memoryUsage();

      if (usage.heapUsed > this.heapUsageThreshold) {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Emit warning
        console.warn(`High memory usage detected: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
      }
    }, 10000); // Check every 10 seconds
  }

  stopMonitoring(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = undefined;
    }
  }

  getMemoryStats(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  } {
    const usage = process.memoryUsage();

    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024)
    };
  }
}