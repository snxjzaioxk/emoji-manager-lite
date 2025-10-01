import React, { useState, useMemo } from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Filter,
  TrendingUp,
  Clock,
  HardDrive,
  Image,
  BarChart3,
  PieChart,
  Copy,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { ScannerRunResult, ScannerFileRecord } from '../../../shared/types';

interface ScannerReportProps {
  result: ScannerRunResult;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  onImport?: (records: ScannerFileRecord[]) => void;
}

interface Statistics {
  successRate: number;
  duplicateRate: number;
  failureRate: number;
  averageFileSize: number;
  totalSize: number;
  platformBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  failureReasons: Record<string, number>;
}

export const ScannerReport: React.FC<ScannerReportProps> = ({
  result,
  isOpen,
  onClose,
  onRetry,
  onImport
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'details' | 'failures' | 'analytics'>('overview');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [showOnlyFailures, setShowOnlyFailures] = useState(false);

  // Calculate statistics
  const statistics = useMemo<Statistics>(() => {
    const stats: Statistics = {
      successRate: result.imported / Math.max(result.totalFound, 1) * 100,
      duplicateRate: result.duplicates / Math.max(result.totalFound, 1) * 100,
      failureRate: result.failed / Math.max(result.totalFound, 1) * 100,
      averageFileSize: 0,
      totalSize: 0,
      platformBreakdown: {},
      statusBreakdown: {},
      failureReasons: {}
    };

    result.records.forEach(record => {
      // Platform breakdown
      if (record.platform) {
        stats.platformBreakdown[record.platform] =
          (stats.platformBreakdown[record.platform] || 0) + 1;
      }

      // Status breakdown
      stats.statusBreakdown[record.status] =
        (stats.statusBreakdown[record.status] || 0) + 1;

      // Failure reasons
      if (record.status === 'failed' && record.reason) {
        const reason = record.reason.split(':')[0];
        stats.failureReasons[reason] =
          (stats.failureReasons[reason] || 0) + 1;
      }
    });

    return stats;
  }, [result]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return result.records.filter(record => {
      if (showOnlyFailures && record.status !== 'failed') return false;
      if (filterStatus !== 'all' && record.status !== filterStatus) return false;
      if (filterPlatform !== 'all' && record.platform !== filterPlatform) return false;
      return true;
    });
  }, [result.records, filterStatus, filterPlatform, showOnlyFailures]);

  const platforms = useMemo(() =>
    Array.from(new Set(result.records.map(r => r.platform).filter(Boolean))),
    [result.records]
  );

  const exportReport = () => {
    const reportContent = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFound: result.totalFound,
        imported: result.imported,
        skipped: result.skipped,
        duplicates: result.duplicates,
        failed: result.failed
      },
      statistics,
      records: result.records
    };

    const blob = new Blob([JSON.stringify(reportContent, null, 2)],
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    const summary = `扫描报告
时间: ${new Date().toLocaleString()}
总计发现: ${result.totalFound} 个文件
成功导入: ${result.imported} 个
跳过: ${result.skipped} 个
重复: ${result.duplicates} 个
失败: ${result.failed} 个
成功率: ${statistics.successRate.toFixed(1)}%`;

    navigator.clipboard.writeText(summary);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[900px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              扫描结果报告
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={exportReport}
                className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm"
                title="导出报告"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={copyToClipboard}
                className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm"
                title="复制摘要"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700">
          <div className="flex">
            {[
              { id: 'overview', label: '概览', icon: BarChart3 },
              { id: 'details', label: '详细信息', icon: FileText },
              { id: 'failures', label: '失败分析', icon: AlertCircle },
              { id: 'analytics', label: '统计分析', icon: PieChart }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`px-4 py-2 flex items-center gap-2 transition-colors ${
                  selectedTab === tab.id
                    ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedTab === 'overview' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-5 gap-3">
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <HardDrive className="w-8 h-8 text-blue-400" />
                    <span className="text-2xl font-bold text-white">{result.totalFound}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">总计发现</p>
                </div>

                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                    <span className="text-2xl font-bold text-white">{result.imported}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">成功导入</p>
                </div>

                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <RefreshCw className="w-8 h-8 text-yellow-400" />
                    <span className="text-2xl font-bold text-white">{result.duplicates}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">重复文件</p>
                </div>

                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <AlertCircle className="w-8 h-8 text-orange-400" />
                    <span className="text-2xl font-bold text-white">{result.skipped}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">跳过文件</p>
                </div>

                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <XCircle className="w-8 h-8 text-red-400" />
                    <span className="text-2xl font-bold text-white">{result.failed}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">导入失败</p>
                </div>
              </div>

              {/* Success Rate */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">导入成功率</h3>
                <div className="relative h-6 bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-green-500 transition-all"
                    style={{ width: `${statistics.successRate}%` }}
                  />
                  <div
                    className="absolute top-0 h-full bg-yellow-500 transition-all"
                    style={{
                      left: `${statistics.successRate}%`,
                      width: `${statistics.duplicateRate}%`
                    }}
                  />
                  <div
                    className="absolute top-0 h-full bg-red-500 transition-all"
                    style={{
                      left: `${statistics.successRate + statistics.duplicateRate}%`,
                      width: `${statistics.failureRate}%`
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-green-400">成功 {statistics.successRate.toFixed(1)}%</span>
                  <span className="text-yellow-400">重复 {statistics.duplicateRate.toFixed(1)}%</span>
                  <span className="text-red-400">失败 {statistics.failureRate.toFixed(1)}%</span>
                </div>
              </div>

              {/* Platform Breakdown */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">平台分布</h3>
                <div className="space-y-2">
                  {Object.entries(statistics.platformBreakdown).map(([platform, count]) => (
                    <div key={platform} className="flex items-center justify-between">
                      <span className="text-gray-300">{platform}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-full rounded-full"
                            style={{
                              width: `${(count / result.totalFound * 100)}%`
                            }}
                          />
                        </div>
                        <span className="text-white text-sm w-12 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'details' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="bg-gray-700 rounded-lg p-3 flex items-center gap-4">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2 py-1 bg-gray-600 text-white rounded text-sm"
                >
                  <option value="all">所有状态</option>
                  <option value="copied">已复制</option>
                  <option value="decoded">已解码</option>
                  <option value="skipped">已跳过</option>
                  <option value="failed">失败</option>
                </select>
                <select
                  value={filterPlatform}
                  onChange={(e) => setFilterPlatform(e.target.value)}
                  className="px-2 py-1 bg-gray-600 text-white rounded text-sm"
                >
                  <option value="all">所有平台</option>
                  {platforms.map(platform => (
                    <option key={platform} value={platform}>{platform}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={showOnlyFailures}
                    onChange={(e) => setShowOnlyFailures(e.target.checked)}
                    className="rounded"
                  />
                  仅显示失败项
                </label>
                <span className="ml-auto text-sm text-gray-400">
                  显示 {filteredRecords.length} / {result.records.length} 条记录
                </span>
              </div>

              {/* Records List */}
              <div className="bg-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">文件路径</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">平台</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">状态</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">原因</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-600">
                    {filteredRecords.slice(0, 100).map((record, index) => (
                      <tr key={index} className="hover:bg-gray-600 transition-colors">
                        <td className="px-3 py-2 text-xs text-gray-300 truncate max-w-md"
                            title={record.originalPath}>
                          {record.originalPath.split(/[/\\]/).pop()}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-300">
                          {record.platform || '-'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            record.status === 'copied' ? 'bg-green-900 text-green-300' :
                            record.status === 'decoded' ? 'bg-blue-900 text-blue-300' :
                            record.status === 'skipped' ? 'bg-yellow-900 text-yellow-300' :
                            'bg-red-900 text-red-300'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-400">
                          {record.reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRecords.length > 100 && (
                  <div className="p-3 bg-gray-800 text-center text-sm text-gray-400">
                    仅显示前100条记录，完整数据请导出报告
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'failures' && (
            <div className="space-y-4">
              {/* Failure Summary */}
              <div className="bg-red-900 bg-opacity-20 rounded-lg p-4 border border-red-700">
                <h3 className="text-lg font-medium text-red-400 mb-3">失败分析</h3>
                <p className="text-sm text-gray-300 mb-3">
                  共有 {result.failed} 个文件导入失败，占总数的 {statistics.failureRate.toFixed(1)}%
                </p>

                {Object.keys(statistics.failureReasons).length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-300">失败原因分布：</h4>
                    {Object.entries(statistics.failureReasons).map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between bg-gray-700 rounded px-3 py-2">
                        <span className="text-sm text-gray-300">{reason}</span>
                        <span className="text-sm text-white font-medium">{count} 个</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">没有失败的文件</p>
                )}
              </div>

              {/* Failed Records */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">失败文件列表</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {result.records
                    .filter(r => r.status === 'failed')
                    .map((record, index) => (
                      <div key={index} className="bg-gray-600 rounded p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-white font-medium truncate" title={record.originalPath}>
                              {record.originalPath}
                            </p>
                            <p className="text-xs text-red-400 mt-1">
                              {record.reason || '未知错误'}
                            </p>
                          </div>
                          <button
                            onClick={() => navigator.clipboard.writeText(record.originalPath)}
                            className="ml-2 text-gray-400 hover:text-white"
                            title="复制路径"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-yellow-900 bg-opacity-20 rounded-lg p-4 border border-yellow-700">
                <h3 className="text-lg font-medium text-yellow-400 mb-3">建议措施</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• 检查文件权限，确保应用有读取权限</li>
                  <li>• 某些文件可能已损坏或格式不支持</li>
                  <li>• 尝试关闭占用文件的应用后重新扫描</li>
                  <li>• 可以尝试手动导入失败的文件</li>
                </ul>
              </div>
            </div>
          )}

          {selectedTab === 'analytics' && (
            <div className="space-y-4">
              {/* Charts Placeholder */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-3">文件状态分布</h3>
                  <div className="h-48 flex items-center justify-center">
                    <div className="text-center">
                      <PieChart className="w-16 h-16 text-gray-500 mx-auto mb-2" />
                      <div className="space-y-1 mt-4">
                        {Object.entries(statistics.statusBreakdown).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{status}:</span>
                            <span className="text-white ml-4">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-3">平台来源分析</h3>
                  <div className="h-48 flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 text-gray-500 mx-auto mb-2" />
                      <div className="space-y-1 mt-4">
                        {Object.entries(statistics.platformBreakdown).map(([platform, count]) => (
                          <div key={platform} className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{platform}:</span>
                            <span className="text-white ml-4">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">性能指标</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">扫描效率</p>
                    <p className="text-xl font-bold text-white">
                      {(result.totalFound / Math.max((Date.now() - Date.now()) / 1000, 1)).toFixed(1)} 文件/秒
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">成功率</p>
                    <p className="text-xl font-bold text-green-400">
                      {statistics.successRate.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">去重率</p>
                    <p className="text-xl font-bold text-yellow-400">
                      {statistics.duplicateRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              扫描完成时间：{new Date().toLocaleString()}
            </p>
            <div className="flex gap-2">
              {result.failed > 0 && onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                >
                  重试失败项
                </button>
              )}
              {result.imported > 0 && onImport && (
                <button
                  onClick={() => onImport(result.records.filter(r => r.status === 'copied' || r.status === 'decoded'))}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  查看导入项
                </button>
              )}
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
    </div>
  );
};