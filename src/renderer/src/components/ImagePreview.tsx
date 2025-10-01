import React, { useState, useEffect, useRef } from 'react';
import {
  X as CloseIcon,
  Copy as CopyIcon,
  Heart as HeartIcon,
  Trash as TrashIcon,
  Download as DownloadIcon,
  Folder as FolderIcon,
  RefreshCw as RefreshIcon
} from 'lucide-react';
import { EmojiItem } from '../../../shared/types';
import { toFileURL, safeAsync } from '../../../shared/utils';

interface ImagePreviewProps {
  emoji: EmojiItem;
  isOpen: boolean;
  onClose: () => void;
  onCopy: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onOpenLocation: () => void;
}

export function ImagePreview({
  emoji,
  isOpen,
  onClose,
  onCopy,
  onToggleFavorite,
  onDelete,
  onOpenLocation,
}: ImagePreviewProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isOpen) return;

      // 检查是否在输入框中，如果是则不处理快捷键（除了ESC）
      const activeElement = document.activeElement;
      const isInInput = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );

      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'c':
        case 'C':
          // 只有在按住Ctrl/Cmd且不在输入框中才触发复制
          if ((event.ctrlKey || event.metaKey) && !isInInput) {
            event.preventDefault();
            onCopy();
          }
          break;
        case 'f':
        case 'F':
          // 只有在不按任何修饰键且不在输入框中才触发收藏
          if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && !isInInput) {
            event.preventDefault();
            onToggleFavorite();
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [isOpen, onClose, onCopy, onToggleFavorite]);

  // 重置状态当emoji改变时
  useEffect(() => {
    if (isOpen) {
      setImageLoading(true);
      setImageError(false);
      setRetryCount(0);
      setImageDimensions(null);
      setDisplaySize(null);
    }
  }, [emoji.storagePath, isOpen]);

  // 计算图像显示尺寸
  const calculateDisplaySize = (imgWidth: number, imgHeight: number) => {
    if (!containerRef.current) return { width: imgWidth, height: imgHeight };

    const container = containerRef.current;
    const containerWidth = container.clientWidth - 32; // 减去padding
    const containerHeight = window.innerHeight * 0.7; // 最大使用70%的视窗高度

    // 针对移动设备的优化
    const isMobile = window.innerWidth <= 768;
    const maxWidthPercent = isMobile ? 0.95 : 0.8;
    const maxHeightPercent = isMobile ? 0.85 : 0.8;

    const maxWidth = Math.min(containerWidth, window.innerWidth * maxWidthPercent);
    const maxHeight = Math.min(containerHeight, window.innerHeight * maxHeightPercent);

    // 计算缩放比例
    const widthRatio = maxWidth / imgWidth;
    const heightRatio = maxHeight / imgHeight;
    const scale = Math.min(widthRatio, heightRatio, 1); // 不要放大原始图像

    return {
      width: Math.round(imgWidth * scale),
      height: Math.round(imgHeight * scale)
    };
  };

  // 处理图像加载完成事件
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    setImageDimensions({ width: naturalWidth, height: naturalHeight });

    const displaySize = calculateDisplaySize(naturalWidth, naturalHeight);
    setDisplaySize(displaySize);

    setImageLoading(false);
    setImageError(false);
  };

  // 监听窗口大小变化，重新计算显示尺寸
  useEffect(() => {
    const handleResize = () => {
      if (imageDimensions) {
        const newDisplaySize = calculateDisplaySize(imageDimensions.width, imageDimensions.height);
        setDisplaySize(newDisplaySize);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageDimensions]);

  if (!isOpen) return null;

  const handleImageError = async (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageLoading(false);
    setImageError(true);

    // 尝试使用 electronAPI 重新加载
    const result = await safeAsync(async () => {
      const data = await window.electronAPI?.files?.readAsDataURL(emoji.storagePath);
      if (data && e.target instanceof HTMLImageElement) {
        e.target.src = data;
        setImageError(false);
        return data;
      }
      return null;
    });

    if (!result) {
      console.warn('Failed to load image in preview:', emoji.storagePath);
    }
  };

  const handleRetryLoad = () => {
    setImageLoading(true);
    setImageError(false);
    setRetryCount(prev => prev + 1);
  };

  const handleDownload = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    console.log('Download button clicked');
    try {
      // 创建一个临时链接来下载文件
      const response = await fetch(toFileURL(emoji.storagePath));
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = emoji.filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理URL对象
      setTimeout(() => URL.revokeObjectURL(url), 100);

      console.log('Download successful');

      // 显示下载成功反馈
      const downloadButton = e?.currentTarget;
      if (downloadButton) {
        const originalText = downloadButton.textContent;
        downloadButton.textContent = '下载中...';
        setTimeout(() => {
          downloadButton.textContent = '已下载!';
          setTimeout(() => {
            downloadButton.textContent = originalText;
          }, 1000);
        }, 500);
      }
    } catch (error) {
      console.error('Download failed:', error);
      // 降级到原始方法
      try {
        const link = document.createElement('a');
        link.href = toFileURL(emoji.storagePath);
        link.download = emoji.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('Download successful (fallback method)');
      } catch (fallbackError) {
        console.error('Download fallback failed:', fallbackError);
        alert(`下载失败：${error.message || '请重试'}`);
      }
    }
  };

  const handleCopy = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    console.log('Copy button clicked');
    try {
      // 立即给用户反馈
      const startTime = Date.now();

      await onCopy();

      const endTime = Date.now();
      console.log(`Copy completed in ${endTime - startTime}ms`);

      // 显示成功反馈（可选）
      const copyButton = e?.currentTarget;
      if (copyButton) {
        const originalText = copyButton.textContent;
        copyButton.textContent = '已复制!';
        copyButton.style.backgroundColor = 'var(--success-color, #10b981)';
        setTimeout(() => {
          copyButton.textContent = originalText;
          copyButton.style.backgroundColor = '';
        }, 1000);
      }
    } catch (error) {
      console.error('Copy failed:', error);
      const copyButton = e?.currentTarget;
      if (copyButton) {
        const originalText = copyButton.textContent;
        copyButton.textContent = '复制失败';
        copyButton.style.backgroundColor = 'var(--error-color, #ef4444)';
        setTimeout(() => {
          copyButton.textContent = originalText;
          copyButton.style.backgroundColor = '';
        }, 1500);
      }
    }
  };

  const handleFavoriteToggle = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    console.log('Favorite button clicked');
    try {
      const startTime = Date.now();

      await onToggleFavorite();

      const endTime = Date.now();
      console.log(`Favorite toggle completed in ${endTime - startTime}ms`);

      // 显示视觉反馈
      const favoriteButton = e?.currentTarget;
      if (favoriteButton) {
        favoriteButton.style.transform = 'scale(1.1)';
        setTimeout(() => {
          favoriteButton.style.transform = 'scale(1)';
        }, 150);
      }
    } catch (error) {
      console.error('Favorite toggle failed:', error);
      // 即使失败也更新UI状态，让用户知道操作被处理了
      const favoriteButton = e?.currentTarget;
      if (favoriteButton) {
        favoriteButton.style.backgroundColor = 'var(--error-color, #ef4444)';
        setTimeout(() => {
          favoriteButton.style.backgroundColor = '';
        }, 1000);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'var(--preview-bg, rgba(255, 255, 255, 0.9))',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
      onClick={onClose}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh] bg-primary rounded-lg shadow-2xl"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)',
          animation: 'fadeInScale 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 hover:text-red-500 transition-all duration-200 transform hover:scale-110 z-10"
          style={{
            color: 'var(--preview-close-color, #6b7280)',
            background: 'var(--preview-close-bg, rgba(255, 255, 255, 0.9))',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--preview-close-border, rgba(0, 0, 0, 0.1))',
            boxShadow: '0 2px 8px var(--preview-close-shadow, rgba(0, 0, 0, 0.15))'
          }}
        >
          <CloseIcon size={20} />
        </button>

        {/* 图片展示区 */}
        <div className="flex flex-col">
          <div className="relative rounded-lg p-4 flex items-center justify-center"
            style={{
              minHeight: '300px',
              maxHeight: '80vh',
              background: 'transparent'
            }}>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-3">
                  <div className="animate-spin w-8 h-8 border-2 border-accent-color border-t-transparent rounded-full"></div>
                  <div className="text-muted text-sm">加载中...</div>
                </div>
              </div>
            )}

            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="text-muted text-lg">图片加载失败</div>
                  <div className="text-sm text-secondary mb-4">
                    {retryCount > 0 && `已重试 ${retryCount} 次`}
                  </div>
                  <button
                    onClick={handleRetryLoad}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <RefreshIcon size={16} />
                    重新加载
                  </button>
                </div>
              </div>
            )}

            <img
              ref={imgRef}
              key={`${emoji.storagePath}-${retryCount}`}
              src={toFileURL(emoji.storagePath)}
              alt={emoji.filename}
              className={`object-contain transition-opacity rounded ${imageLoading || imageError ? 'opacity-0' : 'opacity-100'}`}
              style={{
                display: imageError ? 'none' : 'block',
                width: displaySize ? `${displaySize.width}px` : 'auto',
                height: displaySize ? `${displaySize.height}px` : 'auto',
                maxWidth: '100%',
                maxHeight: '80vh'
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>

          {/* 简洁的底部操作栏 */}
          <div className="bg-primary border-t border-border-color p-4 rounded-b-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold truncate flex-1 min-w-0" title={emoji.filename}>
                {emoji.filename}
              </h3>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await handleCopy(e);
                }}
                className="btn btn-primary flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <CopyIcon size={16} />
                复制
              </button>
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await handleFavoriteToggle(e);
                }}
                className="btn btn-secondary flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <HeartIcon
                  size={16}
                  className={emoji.isFavorite ? 'fill-current text-red-500' : ''}
                />
                {emoji.isFavorite ? '取消收藏' : '收藏'}
              </button>
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await handleDownload(e);
                }}
                className="btn btn-secondary flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <DownloadIcon size={16} />
                下载
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenLocation();
                }}
                className="btn btn-secondary flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <FolderIcon size={16} />
                打开位置
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                className="btn btn-secondary text-red-500 flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <TrashIcon size={16} />
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}