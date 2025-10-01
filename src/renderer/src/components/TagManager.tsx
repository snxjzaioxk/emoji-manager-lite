import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Tag as TagIcon, Check } from 'lucide-react';
import { Tag } from '../../../shared/types';

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmojiIds?: string[];
  onTagsApplied?: () => void;
}

const predefinedColors = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#64748B', '#6B7280', '#71717A'
];

export const TagManager: React.FC<TagManagerProps> = ({
  isOpen,
  onClose,
  selectedEmojiIds = [],
  onTagsApplied
}) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen]);

  const loadTags = async () => {
    try {
      const result = await window.api.tags.getAll();
      setTags(result);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      await window.api.tags.create({
        name: newTagName.trim(),
        color: newTagColor
      });
      setNewTagName('');
      setNewTagColor('#3B82F6');
      await loadTags();
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !editingTag.name.trim()) return;

    try {
      await window.api.tags.update(editingTag.id, {
        name: editingTag.name.trim(),
        color: editingTag.color,
        description: editingTag.description
      });
      setEditingTag(null);
      await loadTags();
    } catch (error) {
      console.error('Failed to update tag:', error);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('确定要删除这个标签吗？')) return;

    try {
      await window.api.tags.delete(tagId);
      selectedTagIds.delete(tagId);
      setSelectedTagIds(new Set(selectedTagIds));
      await loadTags();
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  const handleToggleTagSelection = (tagId: string) => {
    const newSelection = new Set(selectedTagIds);
    if (newSelection.has(tagId)) {
      newSelection.delete(tagId);
    } else {
      newSelection.add(tagId);
    }
    setSelectedTagIds(newSelection);
  };

  const handleApplyTags = async () => {
    if (selectedEmojiIds.length === 0 || selectedTagIds.size === 0) return;

    setIsApplying(true);
    try {
      const tagNames = tags
        .filter(tag => selectedTagIds.has(tag.id))
        .map(tag => tag.name);

      for (const emojiId of selectedEmojiIds) {
        // 获取现有的标签
        const emoji = await window.api.emojis.get(emojiId);
        if (emoji) {
          // 合并新旧标签
          const allTags = [...new Set([...emoji.tags, ...tagNames])];
          await window.api.emojis.update(emojiId, { tags: allTags });
        }
      }

      onTagsApplied?.();
      onClose();
    } catch (error) {
      console.error('Failed to apply tags:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <TagIcon className="w-5 h-5" />
            标签管理
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Create new tag */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3">创建新标签</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="输入标签名称"
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
              />
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-10 h-10 rounded-md border-2 border-gray-600 hover:border-gray-500"
                  style={{ backgroundColor: newTagColor }}
                />
                {showColorPicker && (
                  <div className="absolute top-12 right-0 bg-gray-700 p-2 rounded-lg shadow-xl z-10">
                    <div className="grid grid-cols-5 gap-1">
                      {predefinedColors.map(color => (
                        <button
                          key={color}
                          onClick={() => {
                            setNewTagColor(color);
                            setShowColorPicker(false);
                          }}
                          className="w-8 h-8 rounded hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                创建
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索标签..."
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tags list */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              现有标签 ({filteredTags.length})
              {selectedEmojiIds.length > 0 && (
                <span className="ml-2 text-blue-400">
                  (选择要应用到 {selectedEmojiIds.length} 个表情的标签)
                </span>
              )}
            </h3>
            {filteredTags.map(tag => (
              <div
                key={tag.id}
                className="flex items-center gap-2 p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
              >
                {selectedEmojiIds.length > 0 && (
                  <button
                    onClick={() => handleToggleTagSelection(tag.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedTagIds.has(tag.id)
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-500 hover:border-gray-400'
                    }`}
                  >
                    {selectedTagIds.has(tag.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>
                )}

                {editingTag?.id === tag.id ? (
                  <input
                    type="text"
                    value={editingTag.name}
                    onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                    onBlur={handleUpdateTag}
                    onKeyPress={(e) => e.key === 'Enter' && handleUpdateTag()}
                    className="flex-1 px-2 py-1 bg-gray-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <>
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: tag.color || '#6B7280' }}
                    />
                    <span className="flex-1 text-white">{tag.name}</span>
                    {tag.description && (
                      <span className="text-sm text-gray-400">{tag.description}</span>
                    )}
                  </>
                )}

                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingTag(tag)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        {selectedEmojiIds.length > 0 && (
          <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
            >
              取消
            </button>
            <button
              onClick={handleApplyTags}
              disabled={selectedTagIds.size === 0 || isApplying}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? '应用中...' : `应用到 ${selectedEmojiIds.length} 个表情`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};