import React from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

export interface ProgressDialogProps {
  isOpen: boolean;
  title: string;
  total: number;
  current: number;
  success: number;
  failed: number;
  currentItem?: string;
  onCancel?: () => void;
  onClose?: () => void;
  completed?: boolean;
}

export function ProgressDialog({
  isOpen,
  title,
  total,
  current,
  success,
  failed,
  currentItem,
  onCancel,
  onClose,
  completed = false
}: ProgressDialogProps) {
  if (!isOpen) return null;

  const progress = total > 0 ? Math.round((current / total) * 100) : 0;
  const canCancel = !completed && onCancel;
  const canClose = completed && onClose;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-dialog-title"
    >
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* 对话框内容 */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* 关闭按钮 - 仅在完成时显示 */}
        {canClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        )}

        <div className="p-6">
          {/* 标题 */}
          <h3
            id="progress-dialog-title"
            className="text-lg font-semibold text-gray-900 mb-4"
          >
            {title}
          </h3>

          {/* 进度条 */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>
                {completed ? '完成' : '进行中'}: {current} / {total}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  completed
                    ? failed > 0
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>

          {/* 当前处理项 */}
          {currentItem && !completed && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                正在处理: <span className="font-medium">{currentItem}</span>
              </p>
            </div>
          )}

          {/* 统计信息 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-600">成功</p>
                <p className="text-lg font-semibold text-green-700">{success}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-600">失败</p>
                <p className="text-lg font-semibold text-red-700">{failed}</p>
              </div>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 justify-end">
            {canCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                取消
              </button>
            )}
            {canClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                关闭
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
