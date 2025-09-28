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
import { toFileURL, formatFileSize, safeAsync } from '../../../shared/utils';

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

    const maxWidth = Math.min(containerWidth, window.innerWidth * 0.8);
    const maxHeight = Math.min(containerHeight, window.innerHeight * 0.8);

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

  const handleDownload = async () => {
    await safeAsync(async () => {
      const link = document.createElement('a');
      link.href = toFileURL(emoji.storagePath);
      link.download = emoji.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, (error) => {
      console.error('Download failed:', error);
      alert(`下载失败：${error.message || '请重试'}`);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
      onClick={onClose}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh] bg-primary rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-gray-300 transition"
        >
          <CloseIcon size={32} />
        </button>

        {/* 图片展示区 */}
        <div className="flex flex-col">
          <div className="relative bg-bg-tertiary rounded-t-lg p-4 flex items-center justify-center" style={{ minHeight: '300px', maxHeight: '80vh' }}>
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
              className={`object-contain transition-opacity ${imageLoading || imageError ? 'opacity-0' : 'opacity-100'}`}
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

          {/* 信息和操作栏 */}
          <div className="bg-primary border-t border-border-color p-4 rounded-b-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold truncate" title={emoji.filename}>
                  {emoji.filename}
                </h3>
                <div className="text-sm text-muted mt-1">
                  <span>{emoji.format.toUpperCase()}</span>
                  <span className="mx-2">·</span>
                  <span>{formatFileSize(emoji.size)}</span>
                  <span className="mx-2">·</span>
                  <span>{emoji.width} × {emoji.height}</span>
                  {imageDimensions && displaySize && (
                    <>
                      <span className="mx-2">·</span>
                      <span className="text-accent-color">
                        显示: {displaySize.width} × {displaySize.height}
                        {displaySize.width < imageDimensions.width && ' (已缩放)'}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-xs text-secondary mt-1">
                  按 ESC 关闭 • Ctrl+C 复制 • F 切换收藏
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={onCopy}
                className="btn btn-primary flex items-center gap-2"
              >
                <CopyIcon size={16} />
                复制
              </button>
              <button
                onClick={onToggleFavorite}
                className="btn btn-secondary flex items-center gap-2"
              >
                <HeartIcon
                  size={16}
                  className={emoji.isFavorite ? 'fill-current text-red-500' : ''}
                />
                {emoji.isFavorite ? '取消收藏' : '收藏'}
              </button>
              <button
                onClick={handleDownload}
                className="btn btn-secondary flex items-center gap-2"
              >
                <DownloadIcon size={16} />
                下载
              </button>
              <button
                onClick={onOpenLocation}
                className="btn btn-secondary flex items-center gap-2"
              >
                <FolderIcon size={16} />
                打开位置
              </button>
              <button
                onClick={onDelete}
                className="btn btn-secondary text-red-500 flex items-center gap-2"
              >
                <TrashIcon size={16} />
                删除
              </button>
            </div>

            {/* 标签 */}
            {emoji.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
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
        </div>
      </div>
    </div>
  );
}