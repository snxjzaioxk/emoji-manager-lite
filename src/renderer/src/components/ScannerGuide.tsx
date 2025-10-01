import React, { useState } from 'react';
import {
  HelpCircle,
  Folder,
  Shield,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Terminal,
  Download,
  Settings,
  Lightbulb
} from 'lucide-react';

interface ScannerGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onStartScan?: () => void;
}

interface GuideSection {
  title: string;
  icon: React.FC<{ className?: string }>;
  content: React.ReactNode;
  expanded?: boolean;
}

interface FAQ {
  question: string;
  answer: string;
  platform?: 'wechat' | 'qq' | 'douyin' | 'all';
}

export const ScannerGuide: React.FC<ScannerGuideProps> = ({
  isOpen,
  onClose,
  onStartScan
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('quick-start');
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'wechat' | 'qq' | 'douyin'>('all');

  const faqs: FAQ[] = [
    {
      question: '为什么扫描不到任何表情包？',
      answer: '请确保已经登录过相应的应用，并且在该应用中接收或发送过表情包。扫描器需要应用已经下载并缓存表情文件。',
      platform: 'all'
    },
    {
      question: '微信表情包在哪里存储？',
      answer: 'Windows系统下通常在 "文档\\WeChat Files\\[用户名]\\FileStorage\\CustomEmotion" 目录中。也可能在 AppData 目录下。',
      platform: 'wechat'
    },
    {
      question: '为什么有些图片无法识别？',
      answer: '某些平台会对表情包进行加密或使用特殊格式存储。扫描器会尝试解码，但并非所有格式都能成功识别。',
      platform: 'all'
    },
    {
      question: 'QQ表情包存储位置在哪？',
      answer: 'QQ表情通常存储在 "文档\\Tencent Files\\[QQ号]\\CustomFace" 或 AppData 目录下的相应位置。',
      platform: 'qq'
    },
    {
      question: '扫描会影响原应用吗？',
      answer: '不会。扫描器只读取文件，不会修改或删除任何原始文件。所有操作都是安全的。',
      platform: 'all'
    },
    {
      question: '抖音表情包如何获取？',
      answer: '抖音表情通常存储在手机端。建议先将表情从手机导出，然后使用自定义路径功能导入。',
      platform: 'douyin'
    },
    {
      question: '扫描速度很慢怎么办？',
      answer: '可以尝试：1) 关闭其他占用磁盘的程序 2) 排除不必要的目录 3) 分批次扫描不同平台',
      platform: 'all'
    },
    {
      question: '如何添加自定义扫描路径？',
      answer: '在扫描对话框中点击"添加自定义路径"按钮，选择包含表情包的文件夹即可。',
      platform: 'all'
    }
  ];

  const sections: GuideSection[] = [
    {
      title: '快速开始',
      icon: Lightbulb,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-900 bg-opacity-30 rounded-lg p-4">
            <h4 className="font-medium text-blue-300 mb-2">扫描前准备</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>确保已登录微信、QQ等应用</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>在应用中接收或发送过表情包</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>关闭正在运行的聊天应用（避免文件锁定）</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">扫描步骤</h4>
            <ol className="space-y-2 text-sm text-gray-300">
              <li>1. 点击"开始扫描"按钮打开扫描对话框</li>
              <li>2. 选择要扫描的平台（微信、QQ等）</li>
              <li>3. 确认或修改扫描路径</li>
              <li>4. 点击"执行扫描"等待完成</li>
              <li>5. 查看扫描结果并导入表情包</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      title: '平台说明',
      icon: Folder,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-green-900 bg-opacity-20 rounded-lg p-3 border border-green-700">
              <h4 className="font-medium text-green-400 mb-1">微信 (WeChat)</h4>
              <p className="text-sm text-gray-300 mb-2">最常用的表情包来源，支持自动解码</p>
              <p className="text-xs text-gray-400">
                默认路径：文档\WeChat Files\[用户名]\FileStorage
              </p>
            </div>

            <div className="bg-blue-900 bg-opacity-20 rounded-lg p-3 border border-blue-700">
              <h4 className="font-medium text-blue-400 mb-1">QQ</h4>
              <p className="text-sm text-gray-300 mb-2">支持个人收藏表情和群表情</p>
              <p className="text-xs text-gray-400">
                默认路径：文档\Tencent Files\[QQ号]\CustomFace
              </p>
            </div>

            <div className="bg-pink-900 bg-opacity-20 rounded-lg p-3 border border-pink-700">
              <h4 className="font-medium text-pink-400 mb-1">抖音 (Douyin)</h4>
              <p className="text-sm text-gray-300 mb-2">需要从手机端导出后扫描</p>
              <p className="text-xs text-gray-400">
                建议使用自定义路径功能
              </p>
            </div>

            <div className="bg-purple-900 bg-opacity-20 rounded-lg p-3 border border-purple-700">
              <h4 className="font-medium text-purple-400 mb-1">浏览器下载</h4>
              <p className="text-sm text-gray-300 mb-2">扫描浏览器下载的表情图片</p>
              <p className="text-xs text-gray-400">
                默认路径：下载文件夹
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '高级功能',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">自定义路径</h4>
            <p className="text-sm text-gray-300 mb-2">
              如果默认路径不正确，或需要扫描其他位置的表情包：
            </p>
            <ul className="space-y-1 text-sm text-gray-400">
              <li>• 点击路径旁的"修改"按钮</li>
              <li>• 选择正确的文件夹</li>
              <li>• 支持添加多个自定义路径</li>
            </ul>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">批量处理选项</h4>
            <div className="space-y-2 text-sm text-gray-300">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" disabled checked />
                <span>跳过重复文件</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" disabled checked />
                <span>自动添加平台标签</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" disabled />
                <span>合并到默认分类</span>
              </label>
            </div>
          </div>

          <div className="bg-yellow-900 bg-opacity-20 rounded-lg p-4 border border-yellow-700">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-300 mb-1">提示</h4>
                <p className="text-sm text-gray-300">
                  扫描器支持自动解码加密的表情文件，但成功率取决于文件格式。
                  建议定期扫描以获取最新表情。
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '注意事项',
      icon: AlertTriangle,
      content: (
        <div className="space-y-4">
          <div className="bg-red-900 bg-opacity-20 rounded-lg p-4 border border-red-700">
            <h4 className="font-medium text-red-400 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              安全说明
            </h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• 扫描器只读取文件，不会修改原始数据</li>
              <li>• 不会上传任何数据到网络</li>
              <li>• 所有表情包都存储在本地</li>
              <li>• 不会影响原应用的正常使用</li>
            </ul>
          </div>

          <div className="bg-orange-900 bg-opacity-20 rounded-lg p-4 border border-orange-700">
            <h4 className="font-medium text-orange-400 mb-2">性能提醒</h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• 首次扫描可能需要较长时间</li>
              <li>• 文件数量多时建议分批扫描</li>
              <li>• 扫描时避免运行其他占用磁盘的程序</li>
              <li>• 定期清理无用表情以提升性能</li>
            </ul>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">兼容性</h4>
            <div className="text-sm text-gray-300 space-y-1">
              <p>✅ Windows 10/11</p>
              <p>✅ 微信 PC版 3.x</p>
              <p>✅ QQ PC版 9.x</p>
              <p>⚠️ macOS（部分功能受限）</p>
              <p>⚠️ Linux（实验性支持）</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '故障排查',
      icon: Terminal,
      content: (
        <div className="space-y-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">常见问题排查步骤</h4>
            <ol className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">1.</span>
                <div>
                  <p className="font-medium">检查应用是否已登录</p>
                  <p className="text-xs text-gray-400">打开微信/QQ确认已登录账号</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">2.</span>
                <div>
                  <p className="font-medium">验证文件路径</p>
                  <p className="text-xs text-gray-400">手动浏览检查路径是否存在表情文件</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">3.</span>
                <div>
                  <p className="font-medium">检查权限</p>
                  <p className="text-xs text-gray-400">确保应用有读取文件夹的权限</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">4.</span>
                <div>
                  <p className="font-medium">查看扫描日志</p>
                  <p className="text-xs text-gray-400">检查是否有错误信息或警告</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">获取帮助</h4>
            <div className="space-y-2 text-sm text-gray-300">
              <p>如果问题仍未解决，您可以：</p>
              <ul className="space-y-1 ml-4">
                <li>• 查看完整的用户手册</li>
                <li>• 访问项目 GitHub 提交 Issue</li>
                <li>• 加入用户交流群</li>
                <li>• 发送错误日志获取技术支持</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

  const filteredFaqs = faqs.filter(
    faq => selectedPlatform === 'all' || faq.platform === 'all' || faq.platform === selectedPlatform
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[900px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              扫描指南与帮助
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Left: Guide Sections */}
            <div className="col-span-2 space-y-3">
              {sections.map((section) => (
                <div
                  key={section.title}
                  className="bg-gray-900 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedSection(
                      expandedSection === section.title ? null : section.title
                    )}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <section.icon className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-white">{section.title}</span>
                    </div>
                    {expandedSection === section.title ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {expandedSection === section.title && (
                    <div className="px-4 pb-4 border-t border-gray-700">
                      <div className="pt-4">
                        {section.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Right: FAQ */}
            <div className="space-y-3">
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="font-medium text-white mb-3">常见问题</h3>

                {/* Platform Filter */}
                <div className="mb-3">
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value as any)}
                    className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
                  >
                    <option value="all">所有平台</option>
                    <option value="wechat">微信</option>
                    <option value="qq">QQ</option>
                    <option value="douyin">抖音</option>
                  </select>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredFaqs.map((faq, index) => (
                    <details key={index} className="group">
                      <summary className="cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                        {faq.question}
                      </summary>
                      <p className="mt-2 text-xs text-gray-400 pl-4">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="font-medium text-white mb-3">快速操作</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      onClose();
                      onStartScan?.();
                    }}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                  >
                    开始扫描
                  </button>
                  <button
                    onClick={() => window.open('https://github.com/yourusername/emoji-manager/wiki')}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm"
                  >
                    查看文档
                  </button>
                  <button
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Download className="w-3 h-3" />
                    下载扫描脚本
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              提示：扫描功能会持续优化，建议定期更新到最新版本
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};