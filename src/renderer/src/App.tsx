import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { EmojiGrid } from './components/EmojiGrid';
import { Toolbar } from './components/Toolbar';
import { ImportDialog } from './components/ImportDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { EmojiItem, Category, SearchFilters, AppSettings } from '../../shared/types';

// 模拟 electronAPI 用于测试
const mockElectronAPI = {
  categories: {
    getAll: () => Promise.resolve([
      { id: 'default', name: '默认分类', description: '未分类的表情包', createdAt: new Date(), updatedAt: new Date() },
      { id: 'favorites', name: '收藏夹', description: '收藏的表情包', createdAt: new Date(), updatedAt: new Date() },
      { id: 'recent', name: '最近使用', description: '最近使用的表情包', createdAt: new Date(), updatedAt: new Date() }
    ])
  },
  emojis: {
    getAll: (_filters?: SearchFilters) => Promise.resolve([]),
    update: (_id: string, _updates: Partial<EmojiItem>) => Promise.resolve(),
    delete: (_id: string) => Promise.resolve(),
    import: (_options: any) => Promise.resolve({ success: 0, failed: 0, duplicates: 0 }),
    copyToClipboard: (_filePath: string) => Promise.resolve()
  },
  files: {
    selectFolder: () => Promise.resolve(null),
    selectFiles: () => Promise.resolve([]),
    openLocation: (_filePath: string) => Promise.resolve()
  },
  settings: {
    get: (key: string) => {
      const defaults: any = {
        defaultImportPath: 'C:\\Users\\Pictures',
        defaultExportPath: 'C:\\Users\\Pictures',
        storageLocation: 'C:\\Users\\AppData\\emojis',
        theme: 'auto',
        viewMode: 'grid',
        thumbnailSize: 'medium',
        autoBackup: true,
        maxStorageSize: 1024 * 1024 * 1024
      };
      return Promise.resolve(defaults[key]);
    },
    set: (_key: string, _value: any) => Promise.resolve()
  }
};

declare global {
  interface Window {
    electronAPI: typeof mockElectronAPI;
  }
}

// 设置模拟 API（仅在未由 preload 注入时）
if (typeof window !== 'undefined' && typeof window.electronAPI === 'undefined') {
  Object.defineProperty(window, 'electronAPI', { value: mockElectronAPI });
}

function App() {
  const [emojis, setEmojis] = useState<EmojiItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadEmojis();
  }, [selectedCategory, searchFilters]);

  const loadInitialData = async () => {
    try {
      const [categoriesData, settingsData] = await Promise.all([
        window.electronAPI?.categories?.getAll() || Promise.resolve([]),
        loadSettings()
      ]);
      
      setCategories(categoriesData);
      setSettings(settingsData);
      setViewMode(settingsData.viewMode || 'grid');
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async (): Promise<AppSettings> => {
    const keys = [
      'defaultImportPath', 'defaultExportPath', 'storageLocation',
      'theme', 'viewMode', 'thumbnailSize', 'autoBackup', 'maxStorageSize', 'recentLimit'
    ];
    
    const settingsData: any = {};
    
    for (const key of keys) {
      try {
        const value = await window.electronAPI?.settings?.get(key);
        if (value !== null) {
          settingsData[key] = value;
        }
      } catch (error) {
        console.error(`Failed to load setting ${key}:`, error);
      }
    }
    
    return settingsData as AppSettings;
  };

  const loadEmojis = async () => {
    try {
      const filters: SearchFilters = { ...searchFilters };
      if (selectedCategory === 'favorites') {
        delete (filters as any).categoryId;
        filters.isFavorite = true;
      } else if (selectedCategory === 'recent') {
        delete (filters as any).categoryId;
        filters.sortBy = 'updatedAt';
        filters.sortOrder = 'DESC';
        filters.limit = settings?.recentLimit || 100;
      } else if (selectedCategory && selectedCategory !== '') {
        filters.categoryId = selectedCategory;
      } else {
        delete (filters as any).categoryId;
      }
      
      const emojisData = await window.electronAPI.emojis.getAll(filters) || [];
      setEmojis(emojisData);
    } catch (error) {
      console.error('Failed to load emojis:', error);
      setEmojis([]);
    }
  };

  const handleSearch = (keyword: string) => {
    setSearchFilters(prev => ({ ...prev, keyword }));
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleEmojiUpdate = async (id: string, updates: Partial<EmojiItem>) => {
    try {
      await window.electronAPI.emojis.update(id, updates);
      await loadEmojis();
    } catch (error) {
      console.error('Failed to update emoji:', error);
    }
  };

  const handleEmojiDelete = async (id: string) => {
    try {
      await window.electronAPI.emojis.delete(id);
      await loadEmojis();
    } catch (error) {
      console.error('Failed to delete emoji:', error);
    }
  };

  const handleImportComplete = async () => {
    await loadEmojis();
    setShowImportDialog(false);
  };

  const handleSettingsUpdate = async (newSettings: Partial<AppSettings>) => {
    try {
      for (const [key, value] of Object.entries(newSettings)) {
        await window.electronAPI.settings.set(key, value);
      }
      
      setSettings(prev => ({ ...prev, ...newSettings } as AppSettings));
      
      if (newSettings.viewMode) {
        setViewMode(newSettings.viewMode);
      }
      
      if (newSettings.theme) {
        document.documentElement.setAttribute('data-theme', newSettings.theme);
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ fontSize: '18px', color: 'var(--text-muted)' }}>正在加载表情包管理器...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
        onImport={() => setShowImportDialog(true)}
        onSettings={() => setShowSettingsDialog(true)}
        onCategoriesChange={setCategories}
      />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Toolbar
          onSearch={handleSearch}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchFilters={searchFilters}
          onFiltersChange={setSearchFilters}
        />
        
        <EmojiGrid
          emojis={emojis}
          viewMode={viewMode}
          onEmojiUpdate={handleEmojiUpdate}
          onEmojiDelete={handleEmojiDelete}
          thumbnailSize={settings?.thumbnailSize || 'medium'}
        />
      </div>

      {showImportDialog && (
        <ImportDialog
          categories={categories}
          onClose={() => setShowImportDialog(false)}
          onImportComplete={handleImportComplete}
          defaultPath={settings?.defaultImportPath}
        />
      )}

      {showSettingsDialog && settings && (
        <SettingsDialog
          settings={settings}
          onClose={() => setShowSettingsDialog(false)}
          onSettingsUpdate={handleSettingsUpdate}
        />
      )}
    </div>
  );
}

export default App;
