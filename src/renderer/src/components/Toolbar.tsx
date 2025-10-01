import React, { useState, useEffect } from 'react';
import { SearchFilters, Tag } from '../../../shared/types';
import { Search as SearchIcon, Grid as GridIcon, List as ListIcon, Filter as FilterIcon, X as XIcon } from 'lucide-react';

interface ToolbarProps {
  onSearch: (keyword: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  searchFilters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onAdvancedSearch?: () => void;
}

export function Toolbar({
  onSearch,
  viewMode,
  onViewModeChange,
  searchFilters,
  onFiltersChange,
  onAdvancedSearch
}: ToolbarProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(searchFilters.tagIds || []);

  useEffect(() => {
    // 加载可用标签
    loadTags();
  }, []);

  useEffect(() => {
    // 同步标签筛选器
    setSelectedTagIds(searchFilters.tagIds || []);
  }, [searchFilters.tagIds]);

  const loadTags = async () => {
    try {
      const tags = await window.api?.tags?.getAll();
      setAvailableTags(tags || []);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchKeyword);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: unknown) => {
    onFiltersChange({ ...searchFilters, [key]: value });
  };

  const handleTagToggle = (tagId: string) => {
    const newSelectedTags = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];

    setSelectedTagIds(newSelectedTags);
    handleFilterChange('tagIds', newSelectedTags.length > 0 ? newSelectedTags : undefined);
  };

  return (
    <div className="bg-primary border-b border-border-color p-4">
      <div className="flex items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" size={16} />
            <input
              type="text"
              placeholder="搜索表情包..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-ghost ${showFilters ? 'bg-bg-tertiary' : ''}`}
          >
            <FilterIcon size={16} />
            筛选
          </button>

          {onAdvancedSearch && (
            <button
              onClick={onAdvancedSearch}
              className="btn btn-ghost"
            >
              <SearchIcon size={16} />
              高级搜索
            </button>
          )}

          <div className="flex border border-border-color rounded overflow-hidden">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`btn btn-ghost rounded-none ${viewMode === 'grid' ? 'bg-bg-tertiary' : ''}`}
            >
              <GridIcon size={16} />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`btn btn-ghost rounded-none ${viewMode === 'list' ? 'bg-bg-tertiary' : ''}`}
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="mt-4 p-4 bg-secondary rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">文件格式</label>
              <select
                value={searchFilters.format || ''}
                onChange={(e) => handleFilterChange('format', e.target.value || undefined)}
                className="input w-full"
              >
                <option value="">全部格式</option>
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="gif">GIF</option>
                <option value="webp">WebP</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">收藏状态</label>
              <select
                value={searchFilters.isFavorite === undefined ? '' : searchFilters.isFavorite.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  handleFilterChange('isFavorite', value === '' ? undefined : value === 'true');
                }}
                className="input w-full"
              >
                <option value="">全部</option>
                <option value="true">已收藏</option>
                <option value="false">未收藏</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-2">
                标签筛选 {selectedTagIds.length > 0 && `(已选择 ${selectedTagIds.length} 个)`}
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedTagIds.includes(tag.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    style={{
                      backgroundColor: selectedTagIds.includes(tag.id) && tag.color
                        ? tag.color
                        : undefined
                    }}
                  >
                    {tag.name}
                    {selectedTagIds.includes(tag.id) && (
                      <XIcon className="inline-block ml-1 w-3 h-3" />
                    )}
                  </button>
                ))}
                {availableTags.length === 0 && (
                  <span className="text-gray-500 text-sm">暂无标签</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4 gap-2">
            <button
              onClick={() => {
                onFiltersChange({});
                setSearchKeyword('');
                onSearch('');
              }}
              className="btn btn-secondary"
            >
              清除筛选
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
