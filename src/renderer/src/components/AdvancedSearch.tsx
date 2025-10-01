import React, { useState, useEffect } from 'react';
import {
  X,
  Search as SearchIcon,
  Save as SaveIcon,
  Filter as FilterIcon,
  SortAsc,
  SortDesc,
  Calendar,
  Image,
  Layers
} from 'lucide-react';
import { SearchFilters, SavedSearch, Tag } from '../../../shared/types';

interface AdvancedSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filters: SearchFilters) => void;
  currentFilters: SearchFilters;
  savedSearches?: SavedSearch[];
  onSaveSearch?: (name: string, filters: SearchFilters) => void;
  onLoadSearch?: (search: SavedSearch) => void;
  onDeleteSearch?: (id: string) => void;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  isOpen,
  onClose,
  onSearch,
  currentFilters,
  savedSearches = [],
  onSaveSearch,
  onLoadSearch,
  onDeleteSearch
}) => {
  const [filters, setFilters] = useState<SearchFilters>(currentFilters);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'saved'>('filters');

  useEffect(() => {
    if (isOpen) {
      setFilters(currentFilters);
      loadTags();
    }
  }, [isOpen, currentFilters]);

  const loadTags = async () => {
    try {
      const tags = await window.api?.tags?.getAll();
      setAvailableTags(tags || []);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' || value === null ? undefined : value
    }));
  };

  const handleApplyFilters = () => {
    onSearch(filters);
    onClose();
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  const handleSaveSearch = () => {
    if (saveSearchName.trim() && onSaveSearch) {
      onSaveSearch(saveSearchName.trim(), filters);
      setSaveSearchName('');
      setShowSaveDialog(false);
    }
  };

  const handleLoadSavedSearch = (search: SavedSearch) => {
    setFilters(search.filters);
    if (onLoadSearch) {
      onLoadSearch(search);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[800px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <SearchIcon className="w-5 h-5" />
            高级搜索
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('filters')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'filters'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FilterIcon className="inline-block w-4 h-4 mr-2" />
            搜索条件
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'saved'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <SaveIcon className="inline-block w-4 h-4 mr-2" />
            保存的搜索 ({savedSearches.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'filters' ? (
            <div className="space-y-6">
              {/* 基础搜索 */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">基础搜索</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">关键词</label>
                    <input
                      type="text"
                      value={filters.keyword || ''}
                      onChange={(e) => handleFilterChange('keyword', e.target.value)}
                      placeholder="搜索文件名或标签..."
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 文件属性 */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  文件属性
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">文件格式</label>
                    <select
                      value={filters.format || ''}
                      onChange={(e) => handleFilterChange('format', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">全部格式</option>
                      <option value="jpg">JPG</option>
                      <option value="png">PNG</option>
                      <option value="gif">GIF</option>
                      <option value="webp">WebP</option>
                      <option value="svg">SVG</option>
                      <option value="bmp">BMP</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">动画类型</label>
                    <select
                      value={filters.isAnimated === undefined ? '' : filters.isAnimated.toString()}
                      onChange={(e) => handleFilterChange('isAnimated', e.target.value === '' ? undefined : e.target.value === 'true')}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">全部</option>
                      <option value="true">动画图片</option>
                      <option value="false">静态图片</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 尺寸过滤 */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  尺寸过滤
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">最小宽度 (px)</label>
                    <input
                      type="number"
                      value={filters.minWidth || ''}
                      onChange={(e) => handleFilterChange('minWidth', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">最大宽度 (px)</label>
                    <input
                      type="number"
                      value={filters.maxWidth || ''}
                      onChange={(e) => handleFilterChange('maxWidth', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="9999"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">最小高度 (px)</label>
                    <input
                      type="number"
                      value={filters.minHeight || ''}
                      onChange={(e) => handleFilterChange('minHeight', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">最大高度 (px)</label>
                    <input
                      type="number"
                      value={filters.maxHeight || ''}
                      onChange={(e) => handleFilterChange('maxHeight', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="9999"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 文件大小 */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">文件大小</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">最小大小 (KB)</label>
                    <input
                      type="number"
                      value={filters.sizeRange?.min ? filters.sizeRange.min / 1024 : ''}
                      onChange={(e) => {
                        const kb = e.target.value ? parseInt(e.target.value) * 1024 : undefined;
                        handleFilterChange('sizeRange', kb ? { ...filters.sizeRange, min: kb } : undefined);
                      }}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">最大大小 (KB)</label>
                    <input
                      type="number"
                      value={filters.sizeRange?.max ? filters.sizeRange.max / 1024 : ''}
                      onChange={(e) => {
                        const kb = e.target.value ? parseInt(e.target.value) * 1024 : undefined;
                        handleFilterChange('sizeRange', kb ? { ...filters.sizeRange, max: kb } : undefined);
                      }}
                      placeholder="9999"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 排序设置 */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  {filters.sortOrder === 'ASC' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  排序设置
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">排序依据</label>
                    <select
                      value={filters.sortBy || 'updatedAt'}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="updatedAt">更新时间</option>
                      <option value="createdAt">创建时间</option>
                      <option value="name">文件名</option>
                      <option value="size">文件大小</option>
                      <option value="usageCount">使用次数</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">排序方向</label>
                    <select
                      value={filters.sortOrder || 'DESC'}
                      onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'ASC' | 'DESC')}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DESC">降序</option>
                      <option value="ASC">升序</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 标签过滤 */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">标签过滤</h3>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        const currentIds = filters.tagIds || [];
                        const newIds = currentIds.includes(tag.id)
                          ? currentIds.filter(id => id !== tag.id)
                          : [...currentIds, tag.id];
                        handleFilterChange('tagIds', newIds.length > 0 ? newIds : undefined);
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        filters.tagIds?.includes(tag.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                      style={{
                        backgroundColor: filters.tagIds?.includes(tag.id) && tag.color
                          ? tag.color
                          : undefined
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {savedSearches.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  暂无保存的搜索
                </div>
              ) : (
                savedSearches.map(search => (
                  <div
                    key={search.id}
                    className="p-3 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{search.name}</h4>
                        {search.description && (
                          <p className="text-sm text-gray-400 mt-1">{search.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleLoadSavedSearch(search)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          加载
                        </button>
                        {onDeleteSearch && (
                          <button
                            onClick={() => onDeleteSearch(search.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          {activeTab === 'filters' ? (
            <div className="flex justify-between">
              <div className="flex gap-2">
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  重置条件
                </button>
                {onSaveSearch && (
                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    保存搜索
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  应用搜索
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
              >
                关闭
              </button>
            </div>
          )}
        </div>

        {/* Save Search Dialog */}
        {showSaveDialog && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-gray-800 p-4 rounded-lg w-96">
              <h3 className="text-lg font-medium text-white mb-3">保存搜索条件</h3>
              <input
                type="text"
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                placeholder="输入搜索名称..."
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveSearchName('');
                  }}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveSearch}
                  disabled={!saveSearchName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};