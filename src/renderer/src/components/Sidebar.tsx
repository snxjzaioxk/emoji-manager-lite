import React from 'react';
import { Category } from '../../../shared/types';
import { FolderIcon, HeartIcon, ClockIcon, DownloadIcon, SettingsIcon, PlusIcon, MoreVerticalIcon, EditIcon, TrashIcon } from 'lucide-react';

interface SidebarProps {
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  onImport: () => void;
  onSettings: () => void;
  onCategoriesChange: (categories: Category[]) => void;
}

export function Sidebar({ categories, selectedCategory, onCategorySelect, onImport, onSettings, onCategoriesChange }: SidebarProps) {
  const defaultCategories = [
    { id: '', name: '全部表情', icon: FolderIcon },
    { id: 'favorites', name: '收藏夹', icon: HeartIcon },
    { id: 'recent', name: '最近使用', icon: ClockIcon }
  ];

  const customCategories = categories.filter(cat => 
    !['default', 'favorites', 'recent'].includes(cat.id)
  );

  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const reloadCategories = async () => {
    const cats = await window.electronAPI?.categories?.getAll?.();
    onCategoriesChange(cats || []);
  };

  const genId = () => {
    const g = (globalThis as any).crypto?.randomUUID?.();
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
        color: '#6c757d',
        parentId: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      await reloadCategories();
    } catch (e) {
      console.error('Add category failed:', e);
      alert('创建分类失败');
    }
  };

  const handleRenameCategory = async (cat: Category) => {
    const name = prompt('重命名分类', cat.name);
    if (!name || !name.trim() || name.trim() === cat.name) return;
    try {
      await window.electronAPI?.categories?.update(cat.id, { name: name.trim() } as any);
      await reloadCategories();
    } catch (e) {
      console.error('Rename category failed:', e);
      alert('重命名失败');
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    const ok = confirm(`确定删除分类 “${cat.name}” ?\n该分类下的表情将移动到“默认分类”。`);
    if (!ok) return;
    try {
      await window.electronAPI?.categories?.delete(cat.id);
      if (selectedCategory === cat.id) onCategorySelect('');
      await reloadCategories();
    } catch (e: any) {
      console.error('Delete category failed:', e);
      alert(e?.message || '删除失败');
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
          
          {customCategories.map(category => {
            const isSelected = selectedCategory === category.id;
            return (
              <div key={category.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  onClick={() => onCategorySelect(category.id)}
                  style={{ ...getCategoryButtonStyle(isSelected), flex: 1 }}
                >
                  <div 
                    style={{ 
                      width: '0.75rem', 
                      height: '0.75rem', 
                      borderRadius: '50%',
                      backgroundColor: category.color || '#6c757d'
                    }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>{category.name}</span>
                </button>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setOpenMenuId(openMenuId === category.id ? null : category.id)}
                  title="分类菜单"
                >
                  <MoreVerticalIcon size={14} />
                </button>

                {openMenuId === category.id && (
                  <div className="absolute right-0 top-full mt-1 bg-primary border border-border-color rounded shadow-lg z-20 min-w-32">
                    <button
                      onClick={() => { setOpenMenuId(null); handleRenameCategory(category); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2"
                    >
                      <EditIcon size={14} /> 重命名
                    </button>
                    <button
                      onClick={() => { setOpenMenuId(null); handleDeleteCategory(category); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-secondary text-red-500 flex items-center gap-2"
                    >
                      <TrashIcon size={14} /> 删除
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
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
