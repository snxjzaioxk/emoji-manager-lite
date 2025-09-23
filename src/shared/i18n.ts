// 多语言支持
export interface Translations {
  // 通用
  common: {
    confirm: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    add: string;
    search: string;
    loading: string;
    error: string;
    success: string;
    import: string;
    export: string;
    settings: string;
    close: string;
    ok: string;
    yes: string;
    no: string;
  };

  // 侧边栏
  sidebar: {
    allEmojis: string;
    favorites: string;
    recent: string;
    categories: string;
    addCategory: string;
    renameCategory: string;
    deleteCategory: string;
    confirmDeleteCategory: string;
  };

  // 工具栏
  toolbar: {
    searchPlaceholder: string;
    viewMode: string;
    gridView: string;
    listView: string;
    importEmojis: string;
    exportSelected: string;
    settings: string;
    theme: string;
    lightTheme: string;
    darkTheme: string;
  };

  // 表情卡片
  emoji: {
    addToFavorites: string;
    removeFromFavorites: string;
    copyToClipboard: string;
    openLocation: string;
    convertFormat: string;
    deleteEmoji: string;
    confirmDelete: string;
    copySuccess: string;
    copyFailed: string;
  };

  // 导入对话框
  import: {
    title: string;
    selectSource: string;
    selectFolder: string;
    selectFiles: string;
    sourcePath: string;
    category: string;
    options: string;
    recursive: string;
    copyFiles: string;
    overwrite: string;
    importing: string;
    importSuccess: string;
    importFailed: string;
  };

  // 设置对话框
  settings: {
    title: string;
    general: string;
    appearance: string;
    storage: string;
    language: string;
    theme: string;
    viewMode: string;
    thumbnailSize: string;
    defaultImportPath: string;
    defaultExportPath: string;
    storageLocation: string;
    autoBackup: string;
    maxStorageSize: string;
    recentLimit: string;
    selectFolder: string;
  };
}

// 中文翻译
export const zhCN: Translations = {
  common: {
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    search: '搜索',
    loading: '加载中...',
    error: '错误',
    success: '成功',
    import: '导入',
    export: '导出',
    settings: '设置',
    close: '关闭',
    ok: '确定',
    yes: '是',
    no: '否',
  },

  sidebar: {
    allEmojis: '全部表情',
    favorites: '我的收藏',
    recent: '最近使用',
    categories: '分类管理',
    addCategory: '添加分类',
    renameCategory: '重命名分类',
    deleteCategory: '删除分类',
    confirmDeleteCategory: '确定要删除这个分类吗？',
  },

  toolbar: {
    searchPlaceholder: '搜索表情包...',
    viewMode: '视图模式',
    gridView: '网格视图',
    listView: '列表视图',
    importEmojis: '导入表情',
    exportSelected: '导出选中',
    settings: '设置',
    theme: '主题',
    lightTheme: '浅色主题',
    darkTheme: '深色主题',
  },

  emoji: {
    addToFavorites: '添加到收藏',
    removeFromFavorites: '从收藏中移除',
    copyToClipboard: '复制到剪贴板',
    openLocation: '打开文件位置',
    convertFormat: '转换格式',
    deleteEmoji: '删除表情',
    confirmDelete: '确定要删除这个表情吗？',
    copySuccess: '已复制到剪贴板',
    copyFailed: '复制失败',
  },

  import: {
    title: '导入表情包',
    selectSource: '选择来源',
    selectFolder: '选择文件夹',
    selectFiles: '选择文件',
    sourcePath: '来源路径',
    category: '分类',
    options: '选项',
    recursive: '递归搜索子文件夹',
    copyFiles: '复制文件到存储位置',
    overwrite: '覆盖已存在的文件',
    importing: '正在导入...',
    importSuccess: '导入成功',
    importFailed: '导入失败',
  },

  settings: {
    title: '设置',
    general: '常规',
    appearance: '外观',
    storage: '存储',
    language: '语言',
    theme: '主题',
    viewMode: '视图模式',
    thumbnailSize: '缩略图大小',
    defaultImportPath: '默认导入路径',
    defaultExportPath: '默认导出路径',
    storageLocation: '存储位置',
    autoBackup: '自动备份',
    maxStorageSize: '最大存储大小',
    recentLimit: '最近使用数量限制',
    selectFolder: '选择文件夹',
  },
};

// 英文翻译
export const enUS: Translations = {
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    import: 'Import',
    export: 'Export',
    settings: 'Settings',
    close: 'Close',
    ok: 'OK',
    yes: 'Yes',
    no: 'No',
  },

  sidebar: {
    allEmojis: 'All Emojis',
    favorites: 'Favorites',
    recent: 'Recent',
    categories: 'Categories',
    addCategory: 'Add Category',
    renameCategory: 'Rename Category',
    deleteCategory: 'Delete Category',
    confirmDeleteCategory: 'Are you sure you want to delete this category?',
  },

  toolbar: {
    searchPlaceholder: 'Search emojis...',
    viewMode: 'View Mode',
    gridView: 'Grid View',
    listView: 'List View',
    importEmojis: 'Import Emojis',
    exportSelected: 'Export Selected',
    settings: 'Settings',
    theme: 'Theme',
    lightTheme: 'Light Theme',
    darkTheme: 'Dark Theme',
  },

  emoji: {
    addToFavorites: 'Add to Favorites',
    removeFromFavorites: 'Remove from Favorites',
    copyToClipboard: 'Copy to Clipboard',
    openLocation: 'Open Location',
    convertFormat: 'Convert Format',
    deleteEmoji: 'Delete Emoji',
    confirmDelete: 'Are you sure you want to delete this emoji?',
    copySuccess: 'Copied to clipboard',
    copyFailed: 'Copy failed',
  },

  import: {
    title: 'Import Emojis',
    selectSource: 'Select Source',
    selectFolder: 'Select Folder',
    selectFiles: 'Select Files',
    sourcePath: 'Source Path',
    category: 'Category',
    options: 'Options',
    recursive: 'Search subfolders recursively',
    copyFiles: 'Copy files to storage location',
    overwrite: 'Overwrite existing files',
    importing: 'Importing...',
    importSuccess: 'Import successful',
    importFailed: 'Import failed',
  },

  settings: {
    title: 'Settings',
    general: 'General',
    appearance: 'Appearance',
    storage: 'Storage',
    language: 'Language',
    theme: 'Theme',
    viewMode: 'View Mode',
    thumbnailSize: 'Thumbnail Size',
    defaultImportPath: 'Default Import Path',
    defaultExportPath: 'Default Export Path',
    storageLocation: 'Storage Location',
    autoBackup: 'Auto Backup',
    maxStorageSize: 'Max Storage Size',
    recentLimit: 'Recent Limit',
    selectFolder: 'Select Folder',
  },
};

// 语言配置
export const translations = {
  zh: zhCN,
  en: enUS,
};

export type Language = keyof typeof translations;

// 翻译函数
export const createTranslator = (language: Language) => {
  const t = translations[language];
  return {
    t,
    // 嵌套属性访问辅助函数
    get: (path: string) => {
      const keys = path.split('.');
      let value: unknown = t;
      for (const key of keys) {
        value = (value as Record<string, unknown>)?.[key];
      }
      return (value as string) || path;
    }
  };
};