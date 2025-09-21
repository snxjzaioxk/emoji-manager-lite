import React, { useState } from 'react';
import { EmojiItem } from '../../../shared/types';
import { HeartIcon, CopyIcon, TrashIcon, MoreVerticalIcon, FolderIcon, RefreshCwIcon } from 'lucide-react';

interface EmojiListItemProps {
  emoji: EmojiItem;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onUpdate: (updates: Partial<EmojiItem>) => void;
  onDelete: () => void;
}

export function EmojiListItem({ 
  emoji, 
  selected, 
  onSelect, 
  onUpdate, 
  onDelete 
}: EmojiListItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    setLoading(true);
    try {
      await window.electronAPI?.emojis?.copyToClipboard(emoji.storagePath);
      onUpdate({ usageCount: emoji.usageCount + 1 });
    } catch (error) {
      console.error('Failed to copy emoji:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = () => {
    onUpdate({ isFavorite: !emoji.isFavorite });
  };

  const handleOpenLocation = () => {
    window.electronAPI?.files?.openLocation(emoji.storagePath);
  };

  const handleConvertFormat = async (fmt: 'jpg'|'png'|'webp') => {
    setLoading(true);
    try {
      const outputPath = await window.electronAPI?.emojis?.convertFormat(emoji.storagePath, fmt);
      if (outputPath) {
        await window.electronAPI?.emojis?.import({
          sourcePath: outputPath,
          targetCategory: emoji.categoryId || 'default',
          skipDuplicates: true,
          autoGenerateTags: true,
        });
        onUpdate({ usageCount: emoji.usageCount });
      }
    } catch (error) {
      console.error('Failed to convert format:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN');
  };

  return (
    <div className={`card p-4 flex items-center gap-4 relative group ${
      selected ? 'ring-2 ring-accent-color' : ''
    }`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onSelect(e.target.checked)}
        className="flex-shrink-0"
      />

      <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded bg-bg-tertiary flex items-center justify-center">
        <img
          src={`file://${emoji.storagePath}`}
          alt={emoji.filename}
          className="max-w-full max-h-full object-contain cursor-pointer"
          onDoubleClick={handleCopy}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium truncate" title={emoji.filename}>
            {emoji.filename}
          </h3>
          {emoji.isFavorite && (
            <HeartIcon size={16} className="fill-current text-red-500 flex-shrink-0" />
          )}
        </div>

        <div className="text-sm text-secondary mb-2">
          <span>{formatFileSize(emoji.size)}</span>
          <span className="mx-2">•</span>
          <span>{emoji.width} × {emoji.height}</span>
          <span className="mx-2">•</span>
          <span>{formatDate(emoji.createdAt)}</span>
          <span className="mx-2">•</span>
          <span>使用 {emoji.usageCount} 次</span>
        </div>

        {emoji.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {emoji.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-1 bg-bg-tertiary text-xs rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="btn btn-ghost btn-sm opacity-0 group-hover:opacity-100 transition"
        >
          <MoreVerticalIcon size={16} />
        </button>
        
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 bg-primary border border-border-color rounded shadow-lg z-20 min-w-32">
            <button
              onClick={handleCopy}
              disabled={loading}
              className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2"
            >
              <CopyIcon size={14} />
              复制
            </button>
            <button
              onClick={handleToggleFavorite}
              className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2"
            >
              <HeartIcon 
                size={14} 
                className={emoji.isFavorite ? 'fill-current text-red-500' : ''} 
              />
              {emoji.isFavorite ? '取消收藏' : '收藏'}
            </button>
            <button
              onClick={handleOpenLocation}
              className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2"
            >
              <FolderIcon size={14} />
              打开位置
            </button>
            <div className="border-t border-border-color mt-1 mb-1" />
            <div className="px-3 py-2 text-xs text-secondary">转换格式为</div>
            <button
              onClick={() => handleConvertFormat('jpg')}
              disabled={loading}
              className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2"
            >
              <RefreshCwIcon size={14} /> JPG
            </button>
            <button
              onClick={() => handleConvertFormat('png')}
              disabled={loading}
              className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2"
            >
              <RefreshCwIcon size={14} /> PNG
            </button>
            <button
              onClick={() => handleConvertFormat('webp')}
              disabled={loading}
              className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2"
            >
              <RefreshCwIcon size={14} /> WebP
            </button>
            <button
              onClick={onDelete}
              className="w-full px-3 py-2 text-left text-sm hover:bg-secondary text-red-500 flex items-center gap-2"
            >
              <TrashIcon size={14} />
              删除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
