/**
 * Performance optimization utilities
 */

/**
 * Debounce function to limit function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Throttle function to limit function execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastResult: any;
  let lastArgs: Parameters<T> | null = null;
  let timeoutId: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>): any {
    lastArgs = args;

    if (!inThrottle) {
      inThrottle = true;
      lastResult = func(...args);

      timeoutId = setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          lastResult = func(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    }
    return lastResult;
  };
}

/**
 * RAF-based throttle for smooth animations
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function (...args: Parameters<T>): void {
    lastArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          func(...lastArgs);
        }
        rafId = null;
      });
    }
  };
}

/**
 * Request idle callback polyfill
 */
export const requestIdleCallback =
  typeof window !== 'undefined' && window.requestIdleCallback
    ? window.requestIdleCallback
    : (callback: (deadline: IdleDeadline) => void) => {
        const start = Date.now();
        return setTimeout(() => {
          callback({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
          } as IdleDeadline);
        }, 1);
      };

/**
 * Cancel idle callback polyfill
 */
export const cancelIdleCallback =
  typeof window !== 'undefined' && window.cancelIdleCallback
    ? window.cancelIdleCallback
    : clearTimeout;

/**
 * Memory-efficient chunk processor
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => Promise<R> | R,
  chunkSize: number = 100,
  delayBetweenChunks: number = 0
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);

    // Allow other operations to run
    if (delayBetweenChunks > 0 && i + chunkSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenChunks));
    }
  }

  return results;
}

/**
 * Performance monitor for tracking execution time
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string): number {
    const startTime = this.marks.get(startMark);
    if (!startTime) {
      console.warn(`No mark found for ${startMark}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  clearMarks(): void {
    this.marks.clear();
  }
}

/**
 * Lazy loading helper
 */
export function lazyLoad<T>(
  loader: () => Promise<T>,
  cacheResult: boolean = true
): () => Promise<T> {
  let cache: T | null = null;
  let promise: Promise<T> | null = null;

  return async () => {
    if (cacheResult && cache !== null) {
      return cache;
    }

    if (!promise) {
      promise = loader().then(result => {
        if (cacheResult) {
          cache = result;
        }
        promise = null;
        return result;
      });
    }

    return promise;
  };
}