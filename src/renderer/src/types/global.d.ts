import type {
  EmojiItem,
  Category,
  Tag,
  ImportOptions,
  ExportOptions,
  SearchFilters,
  ScannerDetectedSource,
  ScannerConfig,
  ScannerRunOptions,
  ScannerRunResult,
  SavedSearch
} from '../../../shared/types';

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
    get: (id: string) => Promise<EmojiItem | null>;
    getAll: (filters?: SearchFilters) => Promise<EmojiItem[]>;
    add: (emoji: Omit<EmojiItem, 'createdAt' | 'updatedAt'>) => Promise<void>;
    update: (id: string, updates: Partial<EmojiItem>) => Promise<void>;
    delete: (id: string) => Promise<void>;
    import: (options: ImportOptions) => Promise<{ success: number; failed: number; duplicates: number }>;
    export: (options: ExportOptions) => Promise<void>;
    copyToClipboard: (filePath: string) => Promise<void>;
    convertFormat: (filePath: string, targetFormat: string) => Promise<string | null>;
    rename: (id: string, newName: string) => Promise<void>;
  };
  categories: {
    getAll: () => Promise<Category[]>;
    add: (category: Omit<Category, 'createdAt' | 'updatedAt'>) => Promise<void>;
    update: (id: string, updates: Partial<Category>) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };
  tags: {
    getAll: () => Promise<Tag[]>;
    create: (tag: { name: string; color?: string; description?: string }) => Promise<Tag>;
    update: (id: string, updates: Partial<Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<Tag>;
    delete: (id: string) => Promise<void>;
    setForEmoji: (emojiId: string, tagNames: string[]) => Promise<string[]>;
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
  scanner: {
    detectSources: () => Promise<ScannerDetectedSource[]>;
    getConfig: () => Promise<ScannerConfig>;
    saveConfig: (config: Partial<ScannerConfig>) => Promise<ScannerConfig>;
    run: (options: ScannerRunOptions) => Promise<ScannerRunResult>;
  };
  savedSearches: {
    getAll: () => Promise<SavedSearch[]>;
    create: (search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SavedSearch>;
    update: (id: string, updates: Partial<Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };
}

/**
 * 全局类型声明 - Window 接口扩展
 */
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    api: ElectronAPI;
  }
}

export {};