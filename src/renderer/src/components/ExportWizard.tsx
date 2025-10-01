import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  FolderOpen,
  Settings,
  Package,
  FileText,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle
} from 'lucide-react';
import { EmojiItem, ExportOptions, ExportTemplate, Category } from '../../../shared/types';

interface ExportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmojis: EmojiItem[];
  categories: Category[];
  onExport: (options: ExportOptions) => Promise<void>;
  templates?: ExportTemplate[];
  onSaveTemplate?: (template: Omit<ExportTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

type WizardStep = 'select' | 'configure' | 'preview' | 'export';

export const ExportWizard: React.FC<ExportWizardProps> = ({
  isOpen,
  onClose,
  selectedEmojis,
  categories,
  onExport,
  templates = [],
  onSaveTemplate
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('select');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    targetPath: '',
    emojiIds: selectedEmojis.map(e => e.id),
    maintainStructure: false,
    groupByCategory: false,
    groupByTag: false,
    includeMetadata: false,
    generateIndex: false
  });
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setExportOptions(prev => ({
        ...prev,
        emojiIds: selectedEmojis.map(e => e.id)
      }));
    }
  }, [isOpen, selectedEmojis]);

  const handleSelectFolder = async () => {
    const folderPath = await window.api?.files?.selectFolder();
    if (folderPath) {
      setExportOptions(prev => ({ ...prev, targetPath: folderPath }));
    }
  };

  const handleTemplateSelect = (template: ExportTemplate) => {
    setSelectedTemplate(template);
    setExportOptions(prev => ({
      ...prev,
      ...template.config
    }));
  };

  const handleExport = async () => {
    if (!exportOptions.targetPath) {
      alert('请选择导出目录');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // 如果需要保存为模板
      if (saveAsTemplate && templateName && onSaveTemplate) {
        onSaveTemplate({
          name: templateName,
          config: exportOptions,
          isDefault: false
        });
      }

      // 执行导出
      await onExport(exportOptions);

      // 导出成功后关闭向导
      setTimeout(() => {
        onClose();
        setCurrentStep('select');
        setIsExporting(false);
      }, 1000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败: ' + (error instanceof Error ? error.message : String(error)));
      setIsExporting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // 这里可以实现拖拽文件到其他应用的功能
    // 需要使用 Electron 的 drag-out 功能
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 'select':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white mb-4">选择导出模板</h3>

            {/* 预设模板 */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setExportOptions(prev => ({
                    ...prev,
                    maintainStructure: false,
                    groupByCategory: false,
                    format: undefined
                  }));
                  setCurrentStep('configure');
                }}
                className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left"
              >
                <Package className="w-6 h-6 text-blue-400 mb-2" />
                <h4 className="font-medium text-white">快速导出</h4>
                <p className="text-sm text-gray-400 mt-1">直接导出选中的表情包</p>
              </button>

              <button
                onClick={() => {
                  setExportOptions(prev => ({
                    ...prev,
                    maintainStructure: true,
                    groupByCategory: true
                  }));
                  setCurrentStep('configure');
                }}
                className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left"
              >
                <FolderOpen className="w-6 h-6 text-green-400 mb-2" />
                <h4 className="font-medium text-white">按分类整理</h4>
                <p className="text-sm text-gray-400 mt-1">按分类创建文件夹</p>
              </button>

              <button
                onClick={() => {
                  setExportOptions(prev => ({
                    ...prev,
                    format: 'png',
                    compressionLevel: 9
                  }));
                  setCurrentStep('configure');
                }}
                className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left"
              >
                <Settings className="w-6 h-6 text-purple-400 mb-2" />
                <h4 className="font-medium text-white">优化导出</h4>
                <p className="text-sm text-gray-400 mt-1">转换格式并压缩</p>
              </button>

              <button
                onClick={() => {
                  setExportOptions(prev => ({
                    ...prev,
                    includeMetadata: true,
                    generateIndex: true
                  }));
                  setCurrentStep('configure');
                }}
                className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left"
              >
                <FileText className="w-6 h-6 text-yellow-400 mb-2" />
                <h4 className="font-medium text-white">包含元数据</h4>
                <p className="text-sm text-gray-400 mt-1">导出带索引和信息</p>
              </button>
            </div>

            {/* 自定义模板 */}
            {templates.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-300 mb-3">自定义模板</h4>
                <div className="space-y-2">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => {
                        handleTemplateSelect(template);
                        setCurrentStep('configure');
                      }}
                      className="w-full p-3 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-white">{template.name}</h5>
                          {template.description && (
                            <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'configure':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white mb-4">配置导出选项</h3>

            {/* 导出路径 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">导出目录</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={exportOptions.targetPath}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, targetPath: e.target.value }))}
                  placeholder="选择或输入导出目录..."
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSelectFolder}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  浏览
                </button>
              </div>
            </div>

            {/* 组织方式 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">组织方式</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={exportOptions.maintainStructure}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, maintainStructure: e.target.checked }))}
                    className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  保持原有结构
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={exportOptions.groupByCategory}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, groupByCategory: e.target.checked }))}
                    className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  按分类分组
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={exportOptions.groupByTag}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, groupByTag: e.target.checked }))}
                    className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  按标签分组
                </label>
              </div>
            </div>

            {/* 格式转换 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">输出格式</label>
              <select
                value={exportOptions.format || ''}
                onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value || undefined }))}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">保持原格式</option>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="webp">WebP</option>
                <option value="gif">GIF</option>
              </select>
            </div>

            {/* 附加选项 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">附加选项</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeMetadata}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                    className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  导出元数据文件
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={exportOptions.generateIndex}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, generateIndex: e.target.checked }))}
                    className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  生成索引文件
                </label>
              </div>
            </div>

            {/* 命名模式 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">文件命名模式</label>
              <input
                type="text"
                value={exportOptions.namingPattern || '{name}'}
                onChange={(e) => setExportOptions(prev => ({ ...prev, namingPattern: e.target.value }))}
                placeholder="{name}_{date}_{index}"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                可用变量: {'{name}'}, {'{date}'}, {'{time}'}, {'{index}'}, {'{category}'}, {'{format}'}
              </p>
            </div>

            {/* 保存为模板 */}
            {onSaveTemplate && (
              <div className="pt-4 border-t border-gray-700">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  保存为模板
                </label>
                {saveAsTemplate && (
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="输入模板名称..."
                    className="mt-2 w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            )}
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white mb-4">预览导出内容</h3>

            {/* 拖拽区域 */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-blue-400 bg-blue-900 bg-opacity-20' : 'border-gray-600'
              }`}
            >
              <Download className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-300 mb-2">拖拽表情包到这里快速导出</p>
              <p className="text-sm text-gray-400">或点击下方按钮开始导出</p>
            </div>

            {/* 导出摘要 */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">导出摘要</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">导出数量：</span>
                  <span className="text-white">{exportOptions.emojiIds.length} 个文件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">导出路径：</span>
                  <span className="text-white truncate max-w-xs" title={exportOptions.targetPath}>
                    {exportOptions.targetPath}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">输出格式：</span>
                  <span className="text-white">{exportOptions.format || '保持原格式'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">组织方式：</span>
                  <span className="text-white">
                    {exportOptions.groupByCategory && '按分类 '}
                    {exportOptions.groupByTag && '按标签 '}
                    {!exportOptions.groupByCategory && !exportOptions.groupByTag && '平铺'}
                  </span>
                </div>
              </div>
            </div>

            {/* 文件预览列表 */}
            <div className="max-h-48 overflow-y-auto">
              <h4 className="font-medium text-white mb-2">文件列表</h4>
              <div className="space-y-1">
                {selectedEmojis.slice(0, 10).map(emoji => (
                  <div key={emoji.id} className="flex items-center gap-2 text-sm">
                    <img
                      src={`file://${emoji.storagePath}`}
                      alt={emoji.filename}
                      className="w-6 h-6 object-contain"
                    />
                    <span className="text-gray-300 truncate">{emoji.filename}</span>
                  </div>
                ))}
                {selectedEmojis.length > 10 && (
                  <p className="text-sm text-gray-400">...还有 {selectedEmojis.length - 10} 个文件</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'export':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white mb-4">正在导出</h3>

            <div className="flex flex-col items-center justify-center py-8">
              {isExporting ? (
                <>
                  <div className="relative w-20 h-20 mb-4">
                    <div className="absolute inset-0 border-4 border-gray-600 rounded-full"></div>
                    <div
                      className="absolute inset-0 border-4 border-blue-500 rounded-full animate-spin"
                      style={{
                        borderTopColor: 'transparent',
                        borderRightColor: 'transparent',
                        borderBottomColor: 'transparent'
                      }}
                    ></div>
                  </div>
                  <p className="text-gray-300">正在导出文件...</p>
                  <div className="w-full max-w-xs mt-4">
                    <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all duration-300"
                        style={{ width: `${exportProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Check className="w-16 h-16 text-green-500 mb-4" />
                  <p className="text-gray-300 text-lg">导出完成！</p>
                </>
              )}
            </div>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[700px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Download className="w-5 h-5" />
            导出向导
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {(['select', 'configure', 'preview', 'export'] as const).map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === step
                      ? 'bg-blue-600 text-white'
                      : index < ['select', 'configure', 'preview', 'export'].indexOf(currentStep)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {index < ['select', 'configure', 'preview', 'export'].indexOf(currentStep) ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 3 && (
                  <div
                    className={`w-full h-1 mx-2 ${
                      index < ['select', 'configure', 'preview', 'export'].indexOf(currentStep)
                        ? 'bg-green-600'
                        : 'bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-400">选择模板</span>
            <span className="text-xs text-gray-400">配置选项</span>
            <span className="text-xs text-gray-400">预览确认</span>
            <span className="text-xs text-gray-400">导出中</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {getStepContent()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-between">
          <button
            onClick={() => {
              if (currentStep === 'configure') setCurrentStep('select');
              else if (currentStep === 'preview') setCurrentStep('configure');
            }}
            disabled={currentStep === 'select' || currentStep === 'export'}
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            上一步
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
            >
              取消
            </button>
            {currentStep !== 'export' && (
              <button
                onClick={() => {
                  if (currentStep === 'select') setCurrentStep('configure');
                  else if (currentStep === 'configure') setCurrentStep('preview');
                  else if (currentStep === 'preview') {
                    setCurrentStep('export');
                    handleExport();
                  }
                }}
                disabled={currentStep === 'configure' && !exportOptions.targetPath}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {currentStep === 'preview' ? '开始导出' : '下一步'}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};