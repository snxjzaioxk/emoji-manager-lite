import React, { useState } from 'react';
import { Category } from '../../../shared/types';
import { XIcon, FolderIcon, UploadIcon } from 'lucide-react';

interface ImportDialogProps {
  categories: Category[];
  onClose: () => void;
  onImportComplete: () => void;
  defaultPath?: string;
}

export function ImportDialog({ categories, onClose, onImportComplete, defaultPath }: ImportDialogProps) {
  const [selectedPath, setSelectedPath] = useState(defaultPath || '');
  const [selectedCategory, setSelectedCategory] = useState('default');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [autoGenerateTags, setAutoGenerateTags] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleSelectFolder = async () => {
    try {
      const path = await window.electronAPI?.files?.selectFolder();
      if (path) {
        setSelectedPath(path);
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  const handleSelectFiles = async () => {
    try {
      const files = await window.electronAPI?.files?.selectFiles();
      if (files && files.length > 0) {
        setSelectedPath(files.join(';'));
      }
    } catch (error) {
      console.error('Failed to select files:', error);
    }
  };

  const handleImport = async () => {
    if (!selectedPath) return;

    setImporting(true);
    setImportResult(null);

    try {
      const result = await window.electronAPI?.emojis?.import({
        sourcePath: selectedPath,
        targetCategory: selectedCategory,
        skipDuplicates,
        autoGenerateTags
      });

      setImportResult(result);
      
      if (result.success > 0) {
        setTimeout(() => {
          onImportComplete();
        }, 2000);
      }
    } catch (error) {
      console.error('Import failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setImportResult({ success: 0, failed: 1, duplicates: 0, error: errorMessage });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-primary rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <h2 className="text-lg font-semibold">导入表情包</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <XIcon size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">选择来源</label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={handleSelectFolder}
                className="btn btn-secondary flex-1"
              >
                <FolderIcon size={16} />
                选择文件夹
              </button>
              <button
                onClick={handleSelectFiles}
                className="btn btn-secondary flex-1"
              >
                <UploadIcon size={16} />
                选择文件
              </button>
            </div>
            <input
              type="text"
              value={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              placeholder="或直接输入路径..."
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">目标分类</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input w-full"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
              />
              <span className="text-sm">跳过重复文件</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoGenerateTags}
                onChange={(e) => setAutoGenerateTags(e.target.checked)}
              />
              <span className="text-sm">自动生成标签</span>
            </label>
          </div>

          {importResult && (
            <div className="p-3 bg-bg-secondary rounded">
              <div className="text-sm">
                <div className="text-success-color">成功导入: {importResult.success} 个</div>
                {importResult.duplicates > 0 && (
                  <div className="text-warning-color">跳过重复: {importResult.duplicates} 个</div>
                )}
                {importResult.failed > 0 && (
                  <div className="text-danger-color">导入失败: {importResult.failed} 个</div>
                )}
                {importResult.error && (
                  <div className="text-danger-color mt-2">{importResult.error}</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border-color">
          <button onClick={onClose} className="btn btn-secondary">
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedPath || importing}
            className="btn btn-primary"
          >
            {importing ? '导入中...' : '开始导入'}
          </button>
        </div>
      </div>
    </div>
  );
}