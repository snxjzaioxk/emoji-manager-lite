import React, { useState } from 'react';
import { EmojiItem } from '../../../shared/types';
import { EmojiCard } from './EmojiCard';
import { EmojiListItem } from './EmojiListItem';

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

  const handleEmojiSelect = (id: string, selected: boolean) => {
    const newSelection = new Set(selectedEmojis);
    if (selected) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedEmojis(newSelection);
  };

  // 已移除未使用的全选逻辑以满足 Lint 要求

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
      } as any);
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
      {selectedEmojis.size > 0 && (
        <div className="bg-secondary border-b border-border-color p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">已选择 {selectedEmojis.size} 个表情包</span>
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
                  className="btn btn-secondary btn-sm"
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
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto scrollbar p-4">
        {viewMode === 'grid' ? (
          <div className={`grid ${getGridCols()} gap-4`}>
            {emojis.map(emoji => (
              <EmojiCard
                key={emoji.id}
                emoji={emoji}
                thumbnailSize={thumbnailSize}
                selected={selectedEmojis.has(emoji.id)}
                onSelect={(selected) => handleEmojiSelect(emoji.id, selected)}
                onUpdate={(updates) => onEmojiUpdate(emoji.id, updates)}
                onDelete={() => onEmojiDelete(emoji.id)}
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
                onSelect={(selected) => handleEmojiSelect(emoji.id, selected)}
                onUpdate={(updates) => onEmojiUpdate(emoji.id, updates)}
                onDelete={() => onEmojiDelete(emoji.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
