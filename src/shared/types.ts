export interface EmojiItem {
  id: string;
  filename: string;
  originalPath: string;
  storagePath: string;
  format: string;
  size: number;
  width: number;
  height: number;
  tags: string[];
  categoryId?: string;
  isFavorite: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportOptions {
  sourcePath: string;
  sourcePaths?: string[];
  targetCategory?: string;
  skipDuplicates: boolean;
  autoGenerateTags: boolean;
}

export interface ExportOptions {
  targetPath: string;
  emojiIds: string[];
  maintainStructure: boolean;
  format?: string;
}

export interface SearchFilters {
  keyword?: string;
  categoryId?: string;
  tags?: string[];
  format?: string;
  sizeRange?: { min: number; max: number };
  dateRange?: { start: Date; end: Date };
  isFavorite?: boolean;
  sortBy?: 'updatedAt' | 'createdAt' | 'usageCount';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
}

export interface AppSettings {
  defaultImportPath: string;
  defaultExportPath: string;
  storageLocation: string;
  theme: 'light' | 'dark' | 'auto';
  viewMode: 'grid' | 'list';
  thumbnailSize: 'small' | 'medium' | 'large';
  autoBackup: boolean;
  maxStorageSize: number;
  recentLimit: number;
  namingConvention: {
    pattern: string; // Pattern for naming converted files
    useOriginalName: boolean;
    includeTimestamp: boolean;
    includeFormat: boolean;
    customPrefix: string;
    customSuffix: string;
  };
}

export interface DatabaseSchema {
  emojis: EmojiItem;
  categories: Category;
  settings: AppSettings;
}
