import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Link,
  Mail,
  MessageSquare,
  Copy,
  QrCode,
  Download,
  Globe,
  Smartphone,
  CheckCircle,
  ExternalLink,
  File,
  Zap
} from 'lucide-react';
import { EmojiItem } from '../../../shared/types';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  emojis: EmojiItem[];
  onGenerateLink?: () => Promise<string>;
}

type ShareMethod = 'link' | 'qr' | 'file' | 'email' | 'social' | 'clipboard';

interface ShareConfig {
  method: ShareMethod;
  includeMetadata: boolean;
  expiryDays?: number;
  password?: string;
  maxDownloads?: number;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  emojis,
  onGenerateLink
}) => {
  const [selectedMethod, setSelectedMethod] = useState<ShareMethod>('link');
  const [config, setConfig] = useState<ShareConfig>({
    method: 'link',
    includeMetadata: true,
    expiryDays: 7,
    maxDownloads: 100
  });
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareStats, setShareStats] = useState({
    totalSize: 0,
    fileCount: emojis.length
  });

  useEffect(() => {
    if (isOpen) {
      calculateStats();
    }
  }, [isOpen, emojis]);

  const calculateStats = () => {
    const totalSize = emojis.reduce((sum, emoji) => sum + emoji.size, 0);
    setShareStats({
      totalSize,
      fileCount: emojis.length
    });
  };

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      if (onGenerateLink) {
        const link = await onGenerateLink();
        setGeneratedLink(link);
        // In production, generate QR code from link
        setQrCodeData(generateQRCodePlaceholder(link));
      } else {
        // Fallback: generate local link
        const localLink = `emoji-manager://share/${Date.now()}`;
        setGeneratedLink(localLink);
        setQrCodeData(generateQRCodePlaceholder(localLink));
      }
    } catch (error) {
      console.error('Failed to generate link:', error);
      alert('生成链接失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateQRCodePlaceholder = (data: string): string => {
    // In production, use a QR code library like qrcode
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="white"/>
        <text x="100" y="100" text-anchor="middle" fill="black" font-size="12">
          QR Code: ${data.slice(0, 20)}...
        </text>
      </svg>
    `)}`;
  };

  const handleCopyLink = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      // Copy first emoji to clipboard
      if (emojis.length > 0) {
        await window.api?.files?.copyToClipboard?.(emojis[0].storagePath);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleExportForSharing = async () => {
    try {
      const folder = await window.api?.files?.selectFolder?.();
      if (!folder) return;

      // Export emojis for sharing
      await window.api?.files?.export?.({
        targetPath: folder,
        emojiIds: emojis.map(e => e.id),
        maintainStructure: false,
        includeMetadata: config.includeMetadata,
        generateIndex: true
      });

      alert('导出成功！');
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const shareMethods = [
    {
      id: 'link' as ShareMethod,
      icon: Link,
      title: '生成链接',
      description: '创建分享链接，支持设置过期时间和下载次数',
      color: 'blue'
    },
    {
      id: 'qr' as ShareMethod,
      icon: QrCode,
      title: '二维码',
      description: '生成二维码，方便移动设备扫描',
      color: 'green'
    },
    {
      id: 'file' as ShareMethod,
      icon: File,
      title: '导出文件',
      description: '打包导出到文件夹，可直接分享',
      color: 'purple'
    },
    {
      id: 'clipboard' as ShareMethod,
      icon: Copy,
      title: '复制到剪贴板',
      description: '快速复制图片到剪贴板',
      color: 'orange'
    },
    {
      id: 'email' as ShareMethod,
      icon: Mail,
      title: '通过邮件',
      description: '创建邮件附件分享',
      color: 'red'
    },
    {
      id: 'social' as ShareMethod,
      icon: MessageSquare,
      title: '社交平台',
      description: '分享到社交媒体',
      color: 'pink'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[800px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              分享表情包
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            选择 {shareStats.fileCount} 个文件，总计 {formatFileSize(shareStats.totalSize)}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Share Methods Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {shareMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedMethod === method.id
                    ? `border-${method.color}-500 bg-${method.color}-900 bg-opacity-20`
                    : 'border-gray-700 bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <method.icon className={`w-8 h-8 mb-2 text-${method.color}-400`} />
                <h3 className="font-medium text-white mb-1">{method.title}</h3>
                <p className="text-xs text-gray-400">{method.description}</p>
              </button>
            ))}
          </div>

          {/* Method-specific Content */}
          <div className="bg-gray-700 rounded-lg p-4">
            {selectedMethod === 'link' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-3">生成分享链接</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">过期时间</label>
                    <select
                      value={config.expiryDays}
                      onChange={(e) => setConfig({ ...config, expiryDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded"
                    >
                      <option value={1}>1天</option>
                      <option value={7}>7天</option>
                      <option value={30}>30天</option>
                      <option value={0}>永不过期</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">最大下载次数</label>
                    <input
                      type="number"
                      value={config.maxDownloads}
                      onChange={(e) => setConfig({ ...config, maxDownloads: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded"
                      min={1}
                      max={1000}
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={config.includeMetadata}
                        onChange={(e) => setConfig({ ...config, includeMetadata: e.target.checked })}
                        className="rounded"
                      />
                      包含元数据（标签、分类等）
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleGenerateLink}
                  disabled={isGenerating}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      生成链接
                    </>
                  )}
                </button>

                {generatedLink && (
                  <div className="mt-4 p-3 bg-gray-600 rounded">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={generatedLink}
                        readOnly
                        className="flex-1 bg-transparent text-white text-sm"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="ml-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            复制
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedMethod === 'qr' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-3">二维码分享</h3>
                <p className="text-sm text-gray-300 mb-4">
                  生成二维码后，其他设备可以扫描下载表情包
                </p>

                <button
                  onClick={handleGenerateLink}
                  disabled={isGenerating}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {isGenerating ? '生成中...' : '生成二维码'}
                </button>

                {qrCodeData && (
                  <div className="flex flex-col items-center mt-4">
                    <img src={qrCodeData} alt="QR Code" className="w-48 h-48 bg-white p-2 rounded" />
                    <p className="text-xs text-gray-400 mt-2">使用手机扫描二维码访问</p>
                  </div>
                )}
              </div>
            )}

            {selectedMethod === 'file' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-3">导出文件包</h3>
                <p className="text-sm text-gray-300 mb-4">
                  将表情包打包到文件夹，可以通过网盘、U盘等方式分享
                </p>

                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-300 mb-4">
                    <input
                      type="checkbox"
                      checked={config.includeMetadata}
                      onChange={(e) => setConfig({ ...config, includeMetadata: e.target.checked })}
                      className="rounded"
                    />
                    包含元数据和索引文件
                  </label>
                </div>

                <button
                  onClick={handleExportForSharing}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  选择导出位置
                </button>
              </div>
            )}

            {selectedMethod === 'clipboard' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-3">复制到剪贴板</h3>
                <p className="text-sm text-gray-300 mb-4">
                  快速复制表情到剪贴板，可直接粘贴到聊天窗口
                </p>

                {emojis.length > 1 && (
                  <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded p-3">
                    <p className="text-sm text-yellow-300">
                      注意：剪贴板一次只能复制一张图片，当前将复制第一张
                    </p>
                  </div>
                )}

                <button
                  onClick={handleCopyToClipboard}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      复制到剪贴板
                    </>
                  )}
                </button>
              </div>
            )}

            {selectedMethod === 'email' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-3">通过邮件分享</h3>
                <p className="text-sm text-gray-300 mb-4">
                  打开默认邮件客户端，附带表情包文件
                </p>

                <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded p-3">
                  <p className="text-sm text-blue-300">
                    建议：如果文件较大，建议使用云盘分享链接而不是直接附件
                  </p>
                </div>

                <button
                  onClick={() => {
                    // Open email client with mailto link
                    const subject = encodeURIComponent('表情包分享');
                    const body = encodeURIComponent(`我想和你分享 ${emojis.length} 个表情包！`);
                    window.open(`mailto:?subject=${subject}&body=${body}`);
                  }}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  打开邮件客户端
                </button>
              </div>
            )}

            {selectedMethod === 'social' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-3">社交平台分享</h3>
                <p className="text-sm text-gray-300 mb-4">
                  分享到社交媒体平台
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => window.open('https://twitter.com/intent/tweet')}
                    className="px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Twitter
                  </button>
                  <button
                    onClick={() => window.open('https://www.facebook.com/sharer/sharer.php')}
                    className="px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Facebook
                  </button>
                  <button
                    className="px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4" />
                    WeChat
                  </button>
                  <button
                    className="px-4 py-3 bg-blue-400 text-white rounded hover:bg-blue-500 flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4" />
                    QQ
                  </button>
                </div>

                <div className="bg-gray-600 rounded p-3 mt-4">
                  <p className="text-xs text-gray-300">
                    提示：部分平台可能需要先导出文件，然后通过平台的文件分享功能上传
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              分享的表情包将保持原始质量
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};