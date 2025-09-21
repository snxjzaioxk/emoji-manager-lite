import React, { useState } from 'react';
import { AppSettings } from '../../../shared/types';
import { XIcon, FolderIcon } from 'lucide-react';

interface SettingsDialogProps {
  settings: AppSettings;
  onClose: () => void;
  onSettingsUpdate: (settings: Partial<AppSettings>) => void;
}

export function SettingsDialog({ settings, onClose, onSettingsUpdate }: SettingsDialogProps) {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);

  const handleInputChange = (key: keyof AppSettings, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSelectFolder = async (key: keyof AppSettings) => {
    try {
      const path = await window.electronAPI?.files?.selectFolder();
      if (path) {
        handleInputChange(key, path);
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSettingsUpdate(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-primary rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <h2 className="text-lg font-semibold">设置</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <XIcon size={16} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          <div>
            <h3 className="text-md font-medium mb-4">路径设置</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">默认导入路径</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.defaultImportPath}
                    onChange={(e) => handleInputChange('defaultImportPath', e.target.value)}
                    className="input flex-1"
                  />
                  <button
                    onClick={() => handleSelectFolder('defaultImportPath')}
                    className="btn btn-secondary"
                  >
                    <FolderIcon size={16} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">默认导出路径</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.defaultExportPath}
                    onChange={(e) => handleInputChange('defaultExportPath', e.target.value)}
                    className="input flex-1"
                  />
                  <button
                    onClick={() => handleSelectFolder('defaultExportPath')}
                    className="btn btn-secondary"
                  >
                    <FolderIcon size={16} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">存储位置</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.storageLocation}
                    onChange={(e) => handleInputChange('storageLocation', e.target.value)}
                    className="input flex-1"
                  />
                  <button
                    onClick={() => handleSelectFolder('storageLocation')}
                    className="btn btn-secondary"
                  >
                    <FolderIcon size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-4">外观设置</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">主题</label>
                <select
                  value={formData.theme}
                  onChange={(e) => handleInputChange('theme', e.target.value as 'light' | 'dark' | 'auto')}
                  className="input w-full"
                >
                  <option value="light">浅色</option>
                  <option value="dark">深色</option>
                  <option value="auto">跟随系统</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">视图模式</label>
                <select
                  value={formData.viewMode}
                  onChange={(e) => handleInputChange('viewMode', e.target.value as 'grid' | 'list')}
                  className="input w-full"
                >
                  <option value="grid">网格</option>
                  <option value="list">列表</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">缩略图大小</label>
                <select
                  value={formData.thumbnailSize}
                  onChange={(e) => handleInputChange('thumbnailSize', e.target.value as 'small' | 'medium' | 'large')}
                  className="input w-full"
                >
                  <option value="small">小</option>
                  <option value="medium">中</option>
                  <option value="large">大</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">“最近使用”显示数量</label>
                <input
                  type="number"
                  min={10}
                  max={1000}
                  step={10}
                  value={formData.recentLimit ?? 100}
                  onChange={(e) => handleInputChange('recentLimit', Math.max(10, Math.min(1000, parseInt(e.target.value || '0', 10))))}
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-4">存储设置</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  最大存储大小: {formatBytes(formData.maxStorageSize)}
                </label>
                <input
                  type="range"
                  min={100 * 1024 * 1024} // 100MB
                  max={10 * 1024 * 1024 * 1024} // 10GB
                  step={100 * 1024 * 1024} // 100MB steps
                  value={formData.maxStorageSize}
                  onChange={(e) => handleInputChange('maxStorageSize', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.autoBackup}
                  onChange={(e) => handleInputChange('autoBackup', e.target.checked)}
                />
                <span className="text-sm">自动备份数据库</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border-color">
          <button onClick={onClose} className="btn btn-secondary">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}
