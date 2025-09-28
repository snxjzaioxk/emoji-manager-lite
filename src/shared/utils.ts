/**
 * 共用的工具函数
 */

/**
 * 将本地文件路径转换为 file:// URL（安全版本）
 * @param path 文件路径
 * @returns file:// URL 或空字符串
 */
export const toFileURL = (path: string): string => {
  if (!path) return '';

  // 防止路径遍历攻击
  if (path.includes('..') || path.includes('~')) {
    console.warn('Potentially unsafe path detected:', path);
    return '';
  }

  if (path.startsWith('file://')) {
    return path;
  }

  try {
    // 检测 Windows 路径格式 (C:\ 或 D:\等)
    const isWindowsPath = /^[a-zA-Z]:[\\/]/.test(path);

    if (isWindowsPath) {
      // Windows 路径格式: C:\path\to\file
      // 转换为: file:///C:/path/to/file
      const normalized = path.replace(/\\/g, '/');

      // 确保路径是绝对路径
      if (!normalized.match(/^[a-zA-Z]:\//)) {
        console.warn('Only absolute paths are allowed:', path);
        return '';
      }

      // 直接构建 file URL
      return 'file:///' + normalized;
    } else {
      // Unix-like 系统
      const normalized = path.replace(/\\/g, '/');

      // 验证路径是否为绝对路径
      if (!normalized.startsWith('/')) {
        console.warn('Only absolute paths are allowed:', path);
        return '';
      }

      return 'file://' + normalized;
    }
  } catch (error) {
    console.error('Error converting path to file URL:', path, error);
    return '';
  }
};

/**
 * 格式化文件大小显示
 * @param bytes 文件大小（字节）
 * @returns 格式化后的字符串
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * 创建一个防抖函数
 * @param func 要防抖的函数
 * @param wait 等待时间（毫秒）
 * @returns 防抖后的函数
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * 创建一个 Intersection Observer 用于懒加载
 * @param callback 回调函数
 * @param options 选项
 * @returns IntersectionObserver 实例
 */
export const createLazyLoadObserver = (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): IntersectionObserver => {
  return new IntersectionObserver(callback, {
    rootMargin: '50px 0px',
    threshold: 0.1,
    ...options,
  });
};

/**
 * 延迟执行函数
 * @param ms 延迟时间（毫秒）
 * @returns Promise
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 安全地执行异步函数，捕获错误
 * @param fn 异步函数
 * @param errorHandler 错误处理函数
 * @returns Promise
 */
export const safeAsync = async <T>(
  fn: () => Promise<T>,
  errorHandler?: (error: Error) => void
): Promise<T | null> => {
  try {
    return await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (errorHandler) {
      errorHandler(err);
    } else {
      console.error('Async operation failed:', err);
    }
    return null;
  }
};