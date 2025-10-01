import React from 'react';
import { Category } from '../../../shared/types';
import { CategoryTree } from './CategoryTree';
import {
  Folder as FolderIcon,
  Heart as HeartIcon,
  Clock as ClockIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Plus as PlusIcon,
} from 'lucide-react';

interface SidebarProps {
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  onImport: () => void;
  onSettings: () => void;
  onCategoriesChange: (categories: Category[]) => void;
  onScanner: () => void;
}

export function Sidebar({ categories, selectedCategory, onCategorySelect, onImport, onSettings, onCategoriesChange, onScanner }: SidebarProps) {
  const defaultCategories = [
    { id: '', name: '全部表情', icon: FolderIcon },
    { id: 'favorites', name: '收藏夹', icon: HeartIcon },
    { id: 'recent', name: '最近使用', icon: ClockIcon }
  ];

  const customCategories = categories.filter(cat =>
    !['default', 'favorites', 'recent'].includes(cat.id)
  );

  const reloadCategories = async () => {
    const cats = await window.electronAPI?.categories?.getAll?.();
    onCategoriesChange(cats || []);
  };

  const genId = () => {
    const g = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID?.();
    if (g) return g;
    return 'xxxxxxxxyxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleAddCategory = async () => {
    const name = prompt('新建分类名称');
    if (!name || !name.trim()) return;
    try {
      await window.electronAPI?.categories?.add({
        id: genId(),
        name: name.trim(),
        description: '',
        color: '#6c757d'
      });
      await reloadCategories();
    } catch (e) {
      console.error('Add category failed:', e);
      alert('创建分类失败');
    }
  };

  const handleCategoryUpdate = async (categoryId: string, updates: Partial<Category>) => {
    try {
      await window.electronAPI?.categories?.update(categoryId, updates);
      await reloadCategories();
    } catch (e) {
      console.error('Update category failed:', e);
      throw e;
    }
  };

  const handleCategoryDelete = async (categoryId: string) => {
    try {
      await window.electronAPI?.categories?.delete(categoryId);
      if (selectedCategory === categoryId) onCategorySelect('');
      await reloadCategories();
    } catch (e) {
      console.error('Delete category failed:', e);
      throw e;
    }
  };

  const handleCategoryCreate = async (category: Omit<Category, 'createdAt' | 'updatedAt'>) => {
    try {
      await window.electronAPI?.categories?.add(category);
      await reloadCategories();
    } catch (e) {
      console.error('Create category failed:', e);
      throw e;
    }
  };

  const handleReorderCategories = async (updatedCategories: Category[]) => {
    try {
      // Update each category's position
      for (const cat of updatedCategories) {
        await window.electronAPI?.categories?.update(cat.id, {
          position: cat.position,
          parentId: cat.parentId
        });
      }
      await reloadCategories();
    } catch (e) {
      console.error('Reorder categories failed:', e);
      throw e;
    }
  };

  const sidebarStyle = {
    width: '16rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%'
  };

  const getCategoryButtonStyle = (isSelected: boolean) => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius)',
    textAlign: 'left' as const,
    transition: 'all 0.2s ease',
    backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent',
    color: isSelected ? 'white' : 'var(--text-primary)',
    border: 'none',
    cursor: 'pointer'
  });

  return (
    <div style={sidebarStyle}>
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>表情包管理器</h1>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>快速访问</span>
          </div>

          {defaultCategories.map(category => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => onCategorySelect(category.id)}
                style={getCategoryButtonStyle(selectedCategory === category.id)}
              >
                <Icon size={16} />
                <span style={{ fontSize: '0.875rem' }}>{category.name}</span>
              </button>
            );
          })}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>自定义分类</span>
            <button className="btn btn-ghost btn-sm" onClick={handleAddCategory} title="新建分类">
              <PlusIcon size={14} />
            </button>
          </div>

          <CategoryTree
            categories={customCategories}
            selectedCategory={selectedCategory}
            onCategorySelect={onCategorySelect}
            onCategoryUpdate={handleCategoryUpdate}
            onCategoryDelete={handleCategoryDelete}
            onCategoryCreate={handleCategoryCreate}
            onReorderCategories={handleReorderCategories}
          />
        </div>
      </div>

      <div style={{ padding: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
        <button
          onClick={onScanner}
          className="btn btn-secondary w-full mb-2"
        >
          扫描本地表情
        </button>

        <button
          onClick={onImport}
          className="btn btn-primary w-full mb-2"
        >
          <DownloadIcon size={16} />
          导入表情包
        </button>
        
        <button
          onClick={onSettings}
          className="btn btn-ghost w-full"
        >
          <SettingsIcon size={16} />
          设置
        </button>
      </div>
    </div>
  );
}
