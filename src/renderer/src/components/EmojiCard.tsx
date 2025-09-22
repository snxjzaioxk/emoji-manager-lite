import React, { useState } from 'react';
import { EmojiItem } from '../../../shared/types';
import { HeartIcon, CopyIcon, TrashIcon, MoreVerticalIcon, FolderIcon, RefreshCwIcon } from 'lucide-react';

interface EmojiCardProps {
  emoji: EmojiItem;
  thumbnailSize: 'small' | 'medium' | 'large';
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onUpdate: (updates: Partial<EmojiItem>) => void;
  onDelete: () => void;
}

export function EmojiCard({ 
  emoji, 
  thumbnailSize, 
  selected, 
  onSelect, 
  onUpdate, 
  onDelete 
}: EmojiCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>('');

  const toFileSrc = (p: string) => {
    if (!p) return '';
    if (p.startsWith('file://')) return p;
    const normalized = p.replace(/\\/g, '/');
    try {
      return new URL('file:///' + normalized).href;
    } catch {
      return 'file:///' + normalized;
    }
  };

  React.useEffect(() => {
    setImgSrc(toFileSrc(emoji.storagePath));
  }, [emoji.storagePath]);

  const getImageSize = () => {
    switch (thumbnailSize) {
      case 'small': return 'w-16 h-16';
      case 'large': return 'w-32 h-32';
      default: return 'w-24 h-24';
    }
  };

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

  const handleToggleFavorite = async () => {
    try {
      await onUpdate({ isFavorite: !emoji.isFavorite });
    } catch {}
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
      } else {
        alert('转换失败：未生成输出文件');
      }
    } catch (error) {
      console.error('Failed to convert format:', error);
      alert('转换失败，请重试或更换格式');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`card p-3 relative group cursor-pointer transition ${
      selected ? 'ring-2 ring-accent-color' : ''
    }`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onSelect(e.target.checked)}
        className="absolute top-2 left-2 z-10"
      />

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="btn btn-ghost btn-sm"
        >
          <MoreVerticalIcon size={14} />
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

      <div className="flex flex-col items-center">
        <div className={`${getImageSize()} mb-2 overflow-hidden rounded bg-bg-tertiary flex items-center justify-center`}>
          <img
            src={imgSrc}
            alt={emoji.filename}
            className="max-w-full max-h-full object-contain"
            onDoubleClick={handleCopy}
            onError={async () => {
              try {
                const data = await window.electronAPI?.files?.readAsDataURL(emoji.storagePath);
                if (data) setImgSrc(data);
              } catch {}
            }}
          />
        </div>

        <div className="w-full text-center">
          <div className="text-sm font-medium truncate mb-1" title={emoji.filename}>
            {emoji.filename}
          </div>
          
          <div className="text-xs text-muted flex items-center justify-between">
            <span>{formatFileSize(emoji.size)}</span>
            {emoji.isFavorite && (
              <HeartIcon size={12} className="fill-current text-red-500" />
            )}
          </div>

          {emoji.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {emoji.tags.slice(0, 2).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-bg-tertiary text-xs rounded"
                >
                  {tag}
                </span>
              ))}
              {emoji.tags.length > 2 && (
                <span className="text-xs text-muted">+{emoji.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
