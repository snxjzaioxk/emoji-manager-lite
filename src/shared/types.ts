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
  position?: number;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  description?: string;
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
  // 增强的导出选项
  template?: ExportTemplate;
  namingPattern?: string;
  groupByCategory?: boolean;
  groupByTag?: boolean;
  includeMetadata?: boolean;
  compressionLevel?: number;
  maxFileSize?: number;
  splitIntoFolders?: boolean;
  generateIndex?: boolean;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description?: string;
  config: Partial<ExportOptions>;
  isDefault?: boolean;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportResult {
  success: number;
  failed: number;
  totalSize: number;
  outputPaths: string[];
  errors?: Array<{ file: string; error: string }>;
}

export interface SearchFilters {
  keyword?: string;
  categoryId?: string;
  tags?: string[];
  tagIds?: string[];
  excludeTagIds?: string[];
  categoryPath?: string[];
  format?: string;
  sizeRange?: { min: number; max: number };
  dateRange?: { start: Date; end: Date };
  isFavorite?: boolean;
  sortBy?: 'updatedAt' | 'createdAt' | 'usageCount' | 'name' | 'size';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  // 高级过滤选项
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  hasTransparency?: boolean;
  isAnimated?: boolean;
}

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  filters: SearchFilters;
  isDefault?: boolean;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
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
  tags: Tag;
}

export interface ScannerDetectedSource {
  id: string;
  platform: string;
  label: string;
  description?: string;
  path: string;
  exists: boolean;
  recommended: boolean;
  lastModified?: string;
  defaultPath?: string;
  isOverride?: boolean;
}

export interface ScannerConfig {
  enabledSources: string[];
  customPaths: string[];
  autoScanOnLaunch: boolean;
  targetCategoryMap: Record<string, string>;
  lastScanAt?: string;
  sourceOverrides?: Record<string, string>;
  mergeIntoDefaultCategory?: boolean;
  autoTagPlatform?: boolean;
}

export interface ScannerRunOptions {
  sourceIds: string[];
  additionalPaths?: string[];
  targetCategory?: string;
  skipDuplicates?: boolean;
  autoTagPlatform?: boolean;
}

export interface ScannerFileRecord {
  originalPath: string;
  outputPath?: string;
  status: 'copied' | 'decoded' | 'skipped' | 'failed';
  reason?: string;
  platform?: string;
}

export interface ScannerRunResult {
  totalFound: number;
  imported: number;
  skipped: number;
  duplicates: number;
  failed: number;
  records: ScannerFileRecord[];
}
