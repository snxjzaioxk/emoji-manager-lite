import React, { useState } from 'react';
import { EmojiItem } from '../../../shared/types';
import { EmojiCard } from './EmojiCard';
import { EmojiListItem } from './EmojiListItem';
import { ImagePreview } from './ImagePreview';
import {
  CheckSquare as CheckSquareIcon,
  Square as SquareIcon
} from 'lucide-react';

interface EmojiGridProps {
  emojis: EmojiItem[];
  viewMode: 'grid' | 'list';
  onEmojiUpdate: (id: string, updates: Partial<EmojiItem>) => void;
  onEmojiDelete: (id: string) => void;
  thumbnailSize: 'small' | 'medium' | 'large';
}

export function EmojiGrid({
  emojis,
  viewMode,
  onEmojiUpdate,
  onEmojiDelete,
  thumbnailSize
}: EmojiGridProps) {
  const [selectedEmojis, setSelectedEmojis] = useState<Set<string>>(new Set());
  const [batchConverting, setBatchConverting] = useState(false);
  const [batchExporting, setBatchExporting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [previewEmoji, setPreviewEmoji] = useState<EmojiItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleEmojiSelect = (id: string, selected: boolean) => {
    if (!selectionMode) return; // 只有在选择模式下才能选择
    const newSelection = new Set(selectedEmojis);
    if (selected) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedEmojis(newSelection);
  };

  const handlePreviewEmoji = (emoji: EmojiItem) => {
    setPreviewEmoji(emoji);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewEmoji(null);
  };

  const handlePreviewCopy = async () => {
    if (previewEmoji) {
      try {
        await window.electronAPI?.emojis?.copyToClipboard(previewEmoji.storagePath);
        onEmojiUpdate(previewEmoji.id, { usageCount: previewEmoji.usageCount + 1 });
      } catch (error) {
        console.error('Failed to copy emoji:', error);
      }
    }
  };

  const handlePreviewToggleFavorite = async () => {
    if (previewEmoji) {
      try {
        await onEmojiUpdate(previewEmoji.id, { isFavorite: !previewEmoji.isFavorite });
      } catch (error) {
        console.warn('Failed to toggle favorite:', error);
      }
    }
  };

  const handlePreviewDelete = () => {
    if (previewEmoji) {
      setShowPreview(false);
      onEmojiDelete(previewEmoji.id);
    }
  };

  const handlePreviewOpenLocation = () => {
    if (previewEmoji) {
      window.electronAPI?.files?.openLocation(previewEmoji.storagePath);
    }
  };

  const toggleSelectionMode = () => {
    if (!selectionMode) {
      setSelectionMode(true);
    } else {
      setSelectionMode(false);
      setSelectedEmojis(new Set()); // 退出选择模式时清空选择
    }
  };

  const handleSelectAll = () => {
    if (!selectionMode) {
      setSelectionMode(true);
      const allEmojiIds = new Set(emojis.map(e => e.id));
      setSelectedEmojis(allEmojiIds);
    } else if (selectedEmojis.size === emojis.length) {
      // 如果已经全选，则取消全选
      setSelectedEmojis(new Set());
    } else {
      // 否则全选所有表情
      const allEmojiIds = new Set(emojis.map(e => e.id));
      setSelectedEmojis(allEmojiIds);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedEmojis.size === 0) return;
    
    const confirmed = confirm(`确定要删除选中的 ${selectedEmojis.size} 个表情包吗？`);
    if (!confirmed) return;

    for (const id of selectedEmojis) {
      await onEmojiDelete(id);
    }
    setSelectedEmojis(new Set());
  };

  const handleBatchConvert = async (targetFormat: 'jpg' | 'png' | 'webp') => {
    if (selectedEmojis.size === 0) return;
    setBatchConverting(true);
    try {
      const selectedList = Array.from(selectedEmojis);
      let success = 0, failed = 0;
      for (const id of selectedList) {
        const emoji = emojis.find(e => e.id === id);
        if (!emoji) { failed++; continue; }
        try {
          const outputPath = await window.electronAPI?.emojis?.convertFormat(emoji.storagePath, targetFormat);
          if (outputPath) {
            await window.electronAPI?.emojis?.import({
              sourcePath: outputPath,
              targetCategory: emoji.categoryId || 'default',
              skipDuplicates: true,
              autoGenerateTags: true,
            });
            success++;
          } else {
            failed++;
          }
        } catch (_e) {
          failed++;
        }
      }
      if (success > 0) {
        const first = emojis.find(e => e.id === selectedList[0]);
        if (first) {
          await onEmojiUpdate(first.id, { usageCount: first.usageCount });
        }
      }
      alert(`转换完成：成功 ${success}，失败 ${failed}`);
    } finally {
      setBatchConverting(false);
      setSelectedEmojis(new Set());
    }
  };

  const getGridCols = () => {
    switch (thumbnailSize) {
      case 'small': return 'grid-cols-8';
      case 'large': return 'grid-cols-4';
      default: return 'grid-cols-6';
    }
  };

  const handleBatchExport = async () => {
    if (selectedEmojis.size === 0) return;
    setBatchExporting(true);
    try {
      const target = await window.electronAPI?.files?.selectFolder();
      if (!target) return;
      await window.electronAPI?.emojis?.export({
        targetPath: target,
        emojiIds: Array.from(selectedEmojis),
        maintainStructure: false,
      });
      alert(`已导出 ${selectedEmojis.size} 个表情到:\n${target}`);
    } catch (err) {
      console.error('Batch export failed:', err);
      alert('导出失败，请重试');
    } finally {
      setBatchExporting(false);
      setSelectedEmojis(new Set());
    }
  };

  if (emojis.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted">
          <div className="text-6xl mb-4">😊</div>
          <div className="text-lg mb-2">暂无表情包</div>
          <div className="text-sm">点击左侧 &quot;导入表情包&quot; 按钮开始添加</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-secondary border-b border-border-color p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">共 {emojis.length} 个表情包</span>

            {/* 选择模式开关 */}
            <button
              onClick={toggleSelectionMode}
              className={`btn btn-sm flex items-center gap-2 ${
                selectionMode ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              {selectionMode ? <CheckSquareIcon size={16} /> : <SquareIcon size={16} />}
              {selectionMode ? '退出选择' : '选择模式'}
            </button>

            {/* 选择模式下的选择信息 */}
            {selectionMode && (
              <>
                <span className="text-sm font-medium">
                  已选择 {selectedEmojis.size} 个
                </span>
                <button
                  onClick={handleSelectAll}
                  className="btn btn-ghost btn-sm"
                >
                  {selectedEmojis.size === emojis.length ? '取消全选' : '全选'}
                </button>
              </>
            )}
          </div>

          {/* 批量操作按钮 - 只在选择模式且有选中项时显示 */}
          {selectionMode && selectedEmojis.size > 0 && (
            <div className="flex gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-secondary">批量转换:</span>
                  <button
                    onClick={() => handleBatchConvert('jpg')}
                    disabled={batchConverting}
                    className="btn btn-secondary btn-sm"
                  >JPG</button>
                  <button
                    onClick={() => handleBatchConvert('png')}
                    disabled={batchConverting}
                    className="btn btn-secondary btn-sm"
                  >PNG</button>
                  <button
                    onClick={() => handleBatchConvert('webp')}
                    disabled={batchConverting}
                    className="btn btn-secondary btn-sm"
                  >WebP</button>
                </div>
                <button
                  onClick={handleBatchExport}
                  disabled={batchExporting}
                  className="btn btn-secondary btn-sm"
                >导出选中</button>
                <button
                  onClick={handleBatchDelete}
                  className="btn btn-secondary btn-sm text-red-500"
                >
                  批量删除
                </button>
                <button
                  onClick={() => setSelectedEmojis(new Set())}
                  className="btn btn-ghost btn-sm"
                >
                  取消选择
                </button>
            </div>
          )}
        </div>
      </div>
    <div className="flex-1 overflow-auto scrollbar p-4">
        {viewMode === 'grid' ? (
          <div className={`grid ${getGridCols()} gap-4`}>
            {emojis.map(emoji => (
              <EmojiCard
                key={emoji.id}
                emoji={emoji}
                thumbnailSize={thumbnailSize}
                selected={selectedEmojis.has(emoji.id)}
                selectionMode={selectionMode}
                onSelect={(selected) => handleEmojiSelect(emoji.id, selected)}
                onUpdate={(updates) => onEmojiUpdate(emoji.id, updates)}
                onDelete={() => onEmojiDelete(emoji.id)}
                onPreview={() => handlePreviewEmoji(emoji)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {emojis.map(emoji => (
              <EmojiListItem
                key={emoji.id}
                emoji={emoji}
                selected={selectedEmojis.has(emoji.id)}
                selectionMode={selectionMode}
                onSelect={(selected) => handleEmojiSelect(emoji.id, selected)}
                onUpdate={(updates) => onEmojiUpdate(emoji.id, updates)}
                onDelete={() => onEmojiDelete(emoji.id)}
                onPreview={() => handlePreviewEmoji(emoji)}
              />
            ))}
          </div>
        )}
      </div>

    {/* 全局图片预览 */}
    {previewEmoji && (
      <ImagePreview
        emoji={previewEmoji}
        isOpen={showPreview}
        onClose={handleClosePreview}
        onCopy={handlePreviewCopy}
        onToggleFavorite={handlePreviewToggleFavorite}
        onDelete={handlePreviewDelete}
        onOpenLocation={handlePreviewOpenLocation}
      />
    )}
      </div>
    );
  }
