import React, { useState, useEffect, useRef } from 'react';
import { EmojiItem } from '../../../shared/types';
import { toFileURL, formatFileSize, safeAsync, createLazyLoadObserver } from '../../../shared/utils';
import { safeAsyncWithUserFriendlyError, ErrorType } from '../../../shared/errorHandling';
import {
  Heart as HeartIcon,
  Copy as CopyIcon,
  Trash as TrashIcon,
  MoreVertical as MoreVerticalIcon,
  Folder as FolderIcon,
  RefreshCw as RefreshCwIcon,
} from 'lucide-react';

interface EmojiCardProps {
  emoji: EmojiItem;
  thumbnailSize: 'small' | 'medium' | 'large';
  selected: boolean;
  selectionMode: boolean;
  onSelect: (selected: boolean) => void;
  onUpdate: (updates: Partial<EmojiItem>) => void;
  onDelete: () => void;
  onPreview: () => void;
}

export function EmojiCard({
  emoji,
  thumbnailSize,
  selected,
  selectionMode,
  onSelect,
  onUpdate,
  onDelete,
  onPreview
}: EmojiCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageInView, setImageInView] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // 当emoji改变时重置懒加载状态
  useEffect(() => {
    setImageLoaded(false);
    setImageInView(false);
    setLoadError(false);
    setImgSrc('');
  }, [emoji.storagePath]);

  // 懒加载观察器
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = createLazyLoadObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !imageInView) {
          setImageInView(true);
        }
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [imageInView]);

  // 当图片进入视图时才加载
  useEffect(() => {
    if (imageInView && !imageLoaded) {
      setImgSrc(toFileURL(emoji.storagePath));
    }
  }, [imageInView, imageLoaded, emoji.storagePath]);

  const getImageSize = () => {
    switch (thumbnailSize) {
      case 'small': return 'w-16 h-16';
      case 'large': return 'w-32 h-32';
      default: return 'w-24 h-24';
    }
  };

  const handleCopy = async () => {
    setLoading(true);
    console.log('Starting copy operation for:', emoji.filename);
    const startTime = Date.now();

    try {
      const result = await safeAsyncWithUserFriendlyError(async () => {
        const copyResult = await window.electronAPI?.emojis?.copyToClipboard(emoji.storagePath);
        if (copyResult) {
          await onUpdate({ usageCount: emoji.usageCount + 1 });
          return true;
        }
        throw new Error('复制操作失败');
      }, ErrorType.FILE_SYSTEM, false);

      const endTime = Date.now();
      console.log(`Copy operation completed in ${endTime - startTime}ms, result:`, result);

      if (result) {
        // 可以显示成功提示
        console.log('图片已复制到剪贴板');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      // 提供更具体的错误信息
      if (error.message?.includes('ENOENT')) {
        alert('复制失败：文件不存在');
      } else if (error.message?.includes('EPERM')) {
        alert('复制失败：没有权限访问文件');
      } else {
        alert(`复制失败：${error.message || '请重试'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    console.log('Starting favorite toggle for:', emoji.filename);
    const startTime = Date.now();

    await safeAsync(async () => {
      await onUpdate({ isFavorite: !emoji.isFavorite });

      const endTime = Date.now();
      console.log(`Favorite toggle completed in ${endTime - startTime}ms`);
    }, (error) => {
      console.error('Failed to toggle favorite:', error);
      // 提供更友好的错误处理
      if (error.message?.includes('database')) {
        alert('收藏失败：数据库错误，请重试');
      } else {
        alert(`收藏失败：${error.message || '请重试'}`);
      }
    });
  };

  const handleOpenLocation = () => {
    window.electronAPI?.files?.openLocation(emoji.storagePath);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(true);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // 如果点击的是图片区域或者处于加载状态，不处理卡片点击
    const target = e.target as HTMLElement;
    if (target.closest('.image-container') || loading) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (selectionMode) {
      onSelect(!selected);
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 防止在选择模式下意外触发预览
    if (selectionMode) {
      return;
    }

    // 单击图片时，如果不在选择模式下，也不做任何操作
    // 只有双击才触发预览
  };

  const handleImageDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 在加载状态下不允许预览，但选择模式下允许预览
    if (loading) {
      return;
    }

    onPreview();
  };

  const handleConvertFormat = async (fmt: 'jpg'|'png'|'webp') => {
    setLoading(true);
    const result = await safeAsyncWithUserFriendlyError(async () => {
      const outputPath = await window.electronAPI?.emojis?.convertFormat(emoji.storagePath, fmt);
      if (outputPath) {
        await window.electronAPI?.emojis?.import({
          sourcePath: outputPath,
          targetCategory: emoji.categoryId || 'default',
          skipDuplicates: true,
          autoGenerateTags: true,
        });
        onUpdate({ usageCount: emoji.usageCount });
        return outputPath;
      } else {
        throw new Error('转换失败：未生成输出文件');
      }
    }, ErrorType.CONVERSION);

    setLoading(false);
    return result;
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setLoadError(false);
  };

  const handleImageError = async () => {
    setLoadError(true);

    // 尝试备用加载方式
    await safeAsync(async () => {
      const data = await window.electronAPI?.files?.readAsDataURL(emoji.storagePath);
      if (data && imgRef.current) {
        imgRef.current.src = data;
        setLoadError(false);
      }
    }, (error) => {
      console.warn('Failed to load image fallback:', error);
    });
  };

  return (
    <div
      ref={containerRef}
      className={`card p-3 relative group cursor-pointer transition ${
        selected && selectionMode ? 'ring-2 ring-accent-color bg-bg-tertiary' : ''
      } ${loading ? 'opacity-75 pointer-events-none' : ''}`}
      onClick={handleCardClick}
      aria-busy={loading}
      aria-label={`表情包 ${emoji.filename}${loading ? ' (处理中)' : ''}`}
    >
      {/* 只在选择模式下显示复选框 */}
      {selectionMode && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 left-2 z-10"
        />
      )}

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 sm:opacity-100 transition">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="btn btn-ghost btn-sm menu-trigger-touch touch-target"
          disabled={loading}
          aria-label="更多选项"
        >
          <MoreVerticalIcon size={14} />
        </button>

        {showMenu && (
          <div ref={menuRef} className="absolute right-0 top-full mt-1 bg-primary border border-border-color rounded shadow-lg z-20 min-w-48 context-menu">
            <button
              onClick={() => {
                handleCopy();
                setShowMenu(false);
              }}
              disabled={loading}
              className="w-full px-4 py-3 text-left text-sm hover:bg-secondary active:bg-secondary flex items-center gap-2 touch-target"
            >
              <CopyIcon size={16} />
              复制
            </button>
            <button
              onClick={() => {
                handleToggleFavorite();
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-secondary active:bg-secondary flex items-center gap-2 touch-target"
            >
              <HeartIcon
                size={16}
                className={emoji.isFavorite ? 'fill-current text-red-500' : ''}
              />
              {emoji.isFavorite ? '取消收藏' : '收藏'}
            </button>
            <button
              onClick={() => {
                handleOpenLocation();
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-secondary active:bg-secondary flex items-center gap-2 touch-target"
            >
              <FolderIcon size={16} />
              打开位置
            </button>
            <button
              onClick={async () => {
                const newName = prompt('请输入新文件名（不含扩展名）:', emoji.filename.replace(/\.[^/.]+$/, ''));
                if (newName && newName.trim()) {
                  try {
                    const result = await window.electronAPI?.emojis?.rename(emoji.id, newName.trim());
                    if (result) {
                      setShowMenu(false);
                      // 更新本地状态，不需要刷新页面
                      onUpdate({ filename: newName.trim() + emoji.filename.slice(emoji.filename.lastIndexOf('.')) });
                    }
                  } catch (error) {
                    alert('重命名失败：' + error.message);
                  }
                }
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-secondary active:bg-secondary flex items-center gap-2 touch-target"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
              重命名
            </button>
            <div className="border-t border-border-color mt-1 mb-1" />
            <div className="px-4 py-2 text-xs text-secondary">转换格式为</div>
            <button
              onClick={() => {
                handleConvertFormat('jpg');
                setShowMenu(false);
              }}
              disabled={loading}
              className="w-full px-4 py-3 text-left text-sm hover:bg-secondary active:bg-secondary flex items-center gap-2 touch-target disabled:opacity-50"
            >
              <RefreshCwIcon size={16} /> JPG
            </button>
            <button
              onClick={() => {
                handleConvertFormat('png');
                setShowMenu(false);
              }}
              disabled={loading}
              className="w-full px-4 py-3 text-left text-sm hover:bg-secondary active:bg-secondary flex items-center gap-2 touch-target disabled:opacity-50"
            >
              <RefreshCwIcon size={16} /> PNG
            </button>
            <button
              onClick={() => {
                handleConvertFormat('webp');
                setShowMenu(false);
              }}
              disabled={loading}
              className="w-full px-4 py-3 text-left text-sm hover:bg-secondary active:bg-secondary flex items-center gap-2 touch-target disabled:opacity-50"
            >
              <RefreshCwIcon size={16} /> WebP
            </button>
            <button
              onClick={() => {
                onDelete();
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-secondary active:bg-secondary text-red-500 flex items-center gap-2 touch-target"
            >
              <TrashIcon size={16} />
              删除
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center">
        <div
          className={`${getImageSize()} mb-2 overflow-hidden rounded bg-bg-tertiary flex items-center justify-center relative cursor-pointer image-container`}
          onContextMenu={handleContextMenu}
          onClick={handleImageClick}
          onDoubleClick={handleImageDoubleClick}
          role="button"
          tabIndex={0}
          aria-label={`表情包 ${emoji.filename}，双击预览`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!selectionMode && !loading) {
                onPreview();
              }
            }
          }}
        >
          {/* 懒加载占位符 */}
          {!imageInView ? (
            <div className="w-full h-full flex items-center justify-center text-muted text-xs">
              📷
            </div>
          ) : (
            <>
              {/* 加载状态指示器 - 改进版 */}
              {!imageLoaded && !loadError && (
                <div className="absolute inset-0 flex items-center justify-center skeleton-loader">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="animate-spin w-6 h-6 border-2 border-accent-color border-t-transparent rounded-full"></div>
                  </div>
                </div>
              )}

              {/* 错误状态 */}
              {loadError && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-tertiary bg-opacity-90">
                  <div className="text-center space-y-2">
                    <div className="text-muted text-lg">❌</div>
                    <div className="text-muted text-xs">加载失败</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLoadError(false);
                        setImageLoaded(false);
                        if (imgRef.current) {
                          imgRef.current.src = toFileURL(emoji.storagePath) + '?' + Date.now();
                        }
                      }}
                      className="text-xs text-accent-color hover:underline"
                    >
                      重试
                    </button>
                  </div>
                </div>
              )}

              <img
                ref={imgRef}
                src={imgSrc}
                alt={emoji.filename}
                className={`max-w-full max-h-full object-contain transition-opacity ${
                  imageLoaded && !loadError ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{ display: loadError ? 'none' : 'block' }}
              />
            </>
          )}
        </div>

        <div className="w-full text-center px-2">
          {/* 只显示文件名，防止越界 */}
          <div className="text-sm font-medium truncate" title={emoji.filename}>
            {emoji.filename}
          </div>
        </div>
      </div>
    </div>
  );
}
