import type { EmojiItem, Category, ImportOptions, ExportOptions, SearchFilters } from '../../../shared/types';

/**
 * 文件信息接口
 */
export interface FileInfo {
  size: number;
  width: number;
  height: number;
  format: string;
  createdAt: Date;
  modifiedAt: Date;
}

/**
 * Electron API 接口定义
 */
export interface ElectronAPI {
  emojis: {
    getAll: (filters?: SearchFilters) => Promise<EmojiItem[]>;
    add: (emoji: Omit<EmojiItem, 'createdAt' | 'updatedAt'>) => Promise<void>;
    update: (id: string, updates: Partial<EmojiItem>) => Promise<void>;
    delete: (id: string) => Promise<void>;
    import: (options: ImportOptions) => Promise<{ success: number; failed: number; duplicates: number }>;
    export: (options: ExportOptions) => Promise<void>;
    copyToClipboard: (filePath: string) => Promise<void>;
    convertFormat: (filePath: string, targetFormat: string) => Promise<string | null>;
  };
  categories: {
    getAll: () => Promise<Category[]>;
    add: (category: Omit<Category, 'createdAt' | 'updatedAt'>) => Promise<void>;
    update: (id: string, updates: Partial<Category>) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };
  files: {
    selectFolder: () => Promise<string | null>;
    selectFiles: () => Promise<string[]>;
    openLocation: (filePath: string) => Promise<boolean>;
    getInfo: (filePath: string) => Promise<FileInfo>;
    readAsDataURL: (filePath: string) => Promise<string | null>;
    updateStorageLocation: (newPath: string) => Promise<void>;
  };
  settings: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
  };
}

/**
 * 全局类型声明 - Window 接口扩展
 */
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};