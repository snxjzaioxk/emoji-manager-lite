import React, { useState, useMemo } from 'react';
import { Category } from '../../../shared/types';
import {
  ChevronRight as ChevronRightIcon,
  ChevronDown as ChevronDownIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  MoreVertical as MoreVerticalIcon,
  Edit as EditIcon,
  Trash as TrashIcon,
  Plus as PlusIcon,
  Grip as GripIcon
} from 'lucide-react';

interface CategoryTreeProps {
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  onCategoryUpdate: (categoryId: string, updates: Partial<Category>) => Promise<void>;
  onCategoryDelete: (categoryId: string) => Promise<void>;
  onCategoryCreate: (category: Omit<Category, 'createdAt' | 'updatedAt'>) => Promise<void>;
  onReorderCategories?: (categories: Category[]) => Promise<void>;
}

interface CategoryNode {
  category: Category;
  children: CategoryNode[];
  level: number;
}

export function CategoryTree({
  categories,
  selectedCategory,
  onCategorySelect,
  onCategoryUpdate,
  onCategoryDelete,
  onCategoryCreate,
  onReorderCategories
}: CategoryTreeProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' | 'inside' } | null>(null);

  // Build tree structure
  const categoryTree = useMemo(() => {
    const rootCategories = categories.filter(cat => !cat.parentId);

    const buildNode = (category: Category, level: number): CategoryNode => {
      const children = categories
        .filter(cat => cat.parentId === category.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(cat => buildNode(cat, level + 1));

      return { category, children, level };
    };

    return rootCategories
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(cat => buildNode(cat, 0));
  }, [categories]);

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleRename = async (category: Category) => {
    const name = prompt('重命名分类', category.name);
    if (!name || !name.trim() || name.trim() === category.name) return;

    try {
      await onCategoryUpdate(category.id, { name: name.trim() });
      setOpenMenuId(null);
    } catch (e) {
      console.error('Rename category failed:', e);
      alert('重命名失败');
    }
  };

  const handleDelete = async (category: Category) => {
    const ok = confirm(`确定删除分类 "${category.name}" ?\n该分类下的表情将移动到"默认分类"。`);
    if (!ok) return;

    try {
      await onCategoryDelete(category.id);
      setOpenMenuId(null);
    } catch (e: unknown) {
      console.error('Delete category failed:', e);
      alert((e as Error)?.message || '删除失败');
    }
  };

  const handleAddSubcategory = async (parentCategory: Category) => {
    const name = prompt('新建子分类名称');
    if (!name || !name.trim()) return;

    try {
      const newCategory: Omit<Category, 'createdAt' | 'updatedAt'> = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: '',
        color: parentCategory.color || '#6c757d',
        parentId: parentCategory.id
      };
      await onCategoryCreate(newCategory);
      setExpandedCategories(prev => new Set(prev).add(parentCategory.id));
      setOpenMenuId(null);
    } catch (e) {
      console.error('Add subcategory failed:', e);
      alert('创建子分类失败');
    }
  };

  const handleDragStart = (e: React.DragEvent, categoryId: string) => {
    setDraggedCategory(categoryId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedCategory === targetId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let position: 'before' | 'after' | 'inside';
    if (y < height * 0.25) {
      position = 'before';
    } else if (y > height * 0.75) {
      position = 'after';
    } else {
      position = 'inside';
    }

    setDropTarget({ id: targetId, position });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedCategory || !dropTarget || !onReorderCategories) return;

    const draggedCat = categories.find(c => c.id === draggedCategory);
    const targetCat = categories.find(c => c.id === dropTarget.id);

    if (!draggedCat || !targetCat) return;

    try {
      // Clone categories for reordering
      const updatedCategories = [...categories];

      if (dropTarget.position === 'inside') {
        // Move as child
        const idx = updatedCategories.findIndex(c => c.id === draggedCategory);
        updatedCategories[idx] = {
          ...draggedCat,
          parentId: targetCat.id,
          position: 0
        };
      } else {
        // Move as sibling
        const targetParentId = targetCat.parentId;
        const idx = updatedCategories.findIndex(c => c.id === draggedCategory);
        const targetIdx = updatedCategories.findIndex(c => c.id === dropTarget.id);

        updatedCategories[idx] = {
          ...draggedCat,
          parentId: targetParentId,
          position: dropTarget.position === 'before'
            ? (targetCat.position ?? 0) - 0.5
            : (targetCat.position ?? 0) + 0.5
        };
      }

      // Reorder positions
      const parentGroups = new Map<string | undefined, Category[]>();
      updatedCategories.forEach(cat => {
        const group = parentGroups.get(cat.parentId) || [];
        group.push(cat);
        parentGroups.set(cat.parentId, group);
      });

      const finalCategories = updatedCategories.map(cat => {
        const siblings = parentGroups.get(cat.parentId) || [];
        const sorted = siblings.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        const newPosition = sorted.indexOf(cat);
        return { ...cat, position: newPosition };
      });

      await onReorderCategories(finalCategories);
    } catch (e) {
      console.error('Reorder failed:', e);
      alert('排序失败');
    } finally {
      setDraggedCategory(null);
      setDropTarget(null);
    }
  };

  const renderCategoryNode = (node: CategoryNode) => {
    const { category, children, level } = node;
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = selectedCategory === category.id;
    const hasChildren = children.length > 0;
    const FolderIconComponent = isExpanded ? FolderOpenIcon : FolderIcon;
    const isDragging = draggedCategory === category.id;
    const isDropTarget = dropTarget?.id === category.id;

    const indent = level * 1.25;

    return (
      <div key={category.id}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, category.id)}
          onDragOver={(e) => handleDragOver(e, category.id)}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            paddingLeft: `${indent}rem`,
            opacity: isDragging ? 0.5 : 1,
            position: 'relative',
            borderTop: isDropTarget && dropTarget.position === 'before' ? '2px solid var(--accent-color)' : undefined,
            borderBottom: isDropTarget && dropTarget.position === 'after' ? '2px solid var(--accent-color)' : undefined,
            backgroundColor: isDropTarget && dropTarget.position === 'inside' ? 'var(--accent-color-light)' : undefined
          }}
        >
          <button
            onClick={() => toggleExpand(category.id)}
            className="btn btn-ghost btn-sm"
            style={{
              padding: '0.25rem',
              visibility: hasChildren ? 'visible' : 'hidden',
              width: '1.5rem',
              height: '1.5rem'
            }}
          >
            {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
          </button>

          <button
            onClick={() => onCategorySelect(category.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius)',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent',
              color: isSelected ? 'white' : 'var(--text-primary)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <GripIcon size={14} style={{ opacity: 0.5, cursor: 'grab' }} />
            <FolderIconComponent size={16} />
            <div
              style={{
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: '50%',
                backgroundColor: category.color || '#6c757d'
              }}
            />
            <span style={{ fontSize: '0.875rem', flex: 1 }}>{category.name}</span>
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(openMenuId === category.id ? null : category.id);
            }}
            title="分类菜单"
          >
            <MoreVerticalIcon size={14} />
          </button>

          {openMenuId === category.id && (
            <div
              className="absolute right-0 top-full mt-1 bg-primary border border-border-color rounded shadow-lg z-20 min-w-32"
              style={{ position: 'absolute', right: '0.5rem' }}
            >
              <button
                onClick={() => handleAddSubcategory(category)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2"
              >
                <PlusIcon size={14} /> 添加子分类
              </button>
              <button
                onClick={() => handleRename(category)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2"
              >
                <EditIcon size={14} /> 重命名
              </button>
              <button
                onClick={() => handleDelete(category)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-secondary text-red-500 flex items-center gap-2"
              >
                <TrashIcon size={14} /> 删除
              </button>
            </div>
          )}
        </div>

        {isExpanded && children.length > 0 && (
          <div>
            {children.map(child => renderCategoryNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      {categoryTree.map(node => renderCategoryNode(node))}
    </div>
  );
}
