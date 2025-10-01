import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScannerDetectedSource, ScannerConfig, ScannerRunResult } from '../../../shared/types';

interface ScannerDialogProps {
  onClose: () => void;
  onCompleted: (result: ScannerRunResult) => void;
}

interface SourceState extends ScannerDetectedSource {
  checked: boolean;
}

export function ScannerDialog({ onClose, onCompleted }: ScannerDialogProps) {
  const [sources, setSources] = useState<SourceState[]>([]);
  const [config, setConfig] = useState<ScannerConfig | null>(null);
  const [customPaths, setCustomPaths] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScannerRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [sourceOverrides, setSourceOverrides] = useState<Record<string, string>>({});
  const [mergeIntoDefault, setMergeIntoDefault] = useState(false);
  const [autoTagPlatform, setAutoTagPlatform] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setError(null);
    try {
      const [detected, configData] = await Promise.all([
        window.electronAPI?.scanner?.detectSources?.() ?? Promise.resolve([]),
        window.electronAPI?.scanner?.getConfig?.() ?? Promise.resolve(null)
      ]);

      setSources(detected.map((item) => ({ ...item, checked: enabled.has(item.id) })));
      setConfig(configData);
      setCustomPaths(configData?.customPaths ?? []);
      setSourceOverrides(configData?.sourceOverrides ?? {});
      setMergeIntoDefault(Boolean(configData?.mergeIntoDefaultCategory));
      setAutoTagPlatform(Boolean(configData?.autoTagPlatform));
      const nextSources: SourceState[] = detected.map((item) => ({
        ...item,
        checked: enabled.has(item.id)
      }));
      setSources(nextSources);
      setConfig(configData);
      setCustomPaths(configData?.customPaths ?? []);
    } catch (e) {
      console.error(e);
      setError('无法加载扫描配置');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !running) {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, running]);

  const toggleSource = (id: string) => {
    setError(null);
    setSources((prev) => prev.map((item) => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleAddPath = async () => {
    const selected = await window.electronAPI?.files?.selectFolder?.();
    if (!selected) return;
    setError(null);
    if (customPaths.includes(selected)) return;
    const nextPaths = [...customPaths, selected];
    setCustomPaths(nextPaths);
    await handleSaveConfig({ customPaths: nextPaths });
  };

  const removeCustomPath = (path: string) => {
    setError(null);
    const nextPaths = customPaths.filter((item) => item !== path);
    setCustomPaths(nextPaths);
    void handleSaveConfig({ customPaths: nextPaths });
  };

  const handleOverridePath = async (sourceId: string) => {
    const selected = await window.electronAPI?.files?.selectFolder?.();
    if (!selected) return;
    setError(null);
    const nextOverrides = { ...sourceOverrides, [sourceId]: selected };
    setSourceOverrides(nextOverrides);
    setSources((prev) => prev.map((item) => item.id === sourceId ? { ...item, path: selected, exists: true, isOverride: true } : item));
    await handleSaveConfig({ sourceOverrides: nextOverrides });
    void loadData();
  };

  const handleResetOverride = async (sourceId: string) => {
    if (!sourceOverrides[sourceId]) return;
    setError(null);
    const nextOverrides = { ...sourceOverrides };
    delete nextOverrides[sourceId];
    setSourceOverrides(nextOverrides);
    setSources((prev) => prev.map((item) => item.id === sourceId ? { ...item, path: item.defaultPath ?? item.path, isOverride: false } : item));
    await handleSaveConfig({ sourceOverrides: nextOverrides });
    void loadData();
  };

  const handleSaveConfig = async (overrides: Partial<ScannerConfig> = {}) => {
    if (!window.electronAPI?.scanner) return;
    const enabledSources = sources.filter((s) => s.checked).map((s) => s.id);
    const effectiveCustomPaths = overrides.customPaths ?? customPaths;
    const effectiveOverrides = overrides.sourceOverrides ?? sourceOverrides;
    const payload: Partial<ScannerConfig> = {
      enabledSources,
      customPaths: effectiveCustomPaths,
      sourceOverrides: effectiveOverrides,
      mergeIntoDefaultCategory: overrides.mergeIntoDefaultCategory ?? mergeIntoDefault,
      autoTagPlatform: overrides.autoTagPlatform ?? autoTagPlatform
    };

    const autoScanValue = overrides.autoScanOnLaunch ?? config?.autoScanOnLaunch;
    if (autoScanValue !== undefined) {
      payload.autoScanOnLaunch = autoScanValue;
    }

    if (overrides.targetCategoryMap) {
      payload.targetCategoryMap = overrides.targetCategoryMap;
    }

    const next = await window.electronAPI.scanner.saveConfig(payload);
    setConfig(next);
    setCustomPaths(next.customPaths ?? []);
    setSourceOverrides(next.sourceOverrides ?? {});
    setMergeIntoDefault(Boolean(next.mergeIntoDefaultCategory));
    setAutoTagPlatform(Boolean(next.autoTagPlatform));
    setLastUpdatedAt(new Date().toISOString());
  };

  const selectedSourceIds = useMemo(
    () => sources.filter((s) => s.checked && s.exists).map((s) => s.id),
    [sources]
  );

  const hasSelection = selectedSourceIds.length > 0 || customPaths.length > 0;

  const missingSelected = useMemo(
    () => sources.filter((s) => s.checked && !s.exists),
    [sources]
  );

  const handleRun = async () => {
    if (!window.electronAPI?.scanner) return;
    if (!hasSelection) {
      setError('请至少勾选一个扫描来源或添加自定义目录');
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      await handleSaveConfig();
      const runResult = await window.electronAPI.scanner.run({
        sourceIds: selectedSourceIds,
        additionalPaths: customPaths,
        skipDuplicates: true,
        autoTagPlatform
      });
      setResult(runResult);
      onCompleted(runResult);
    } catch (e) {
      console.error(e);
      setError((e as Error).message || '扫描执行失败');
    } finally {
      setRunning(false);
    }
  };

  const toggleAutoScan = async () => {
    if (!config) return;
    await handleSaveConfig({ autoScanOnLaunch: !config.autoScanOnLaunch });
  };

  const toggleMergeIntoDefault = async () => {
    const nextValue = !mergeIntoDefault;
    setMergeIntoDefault(nextValue);
    await handleSaveConfig({ mergeIntoDefaultCategory: nextValue });
  };

  const toggleAutoTagPlatform = async () => {
    const nextValue = !autoTagPlatform;
    setAutoTagPlatform(nextValue);
    await handleSaveConfig({ autoTagPlatform: nextValue });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 py-6"
      onClick={() => { if (!running) onClose(); }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="bg-primary rounded-lg shadow-lg w-full max-w-3xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-color">
          <h2 className="text-lg font-semibold">本地表情扫描</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>关闭</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar">
          {error && (
            <div className="alert alert-error text-sm">{error}</div>
          )}

          {loading && (
            <section className="bg-bg-secondary rounded-lg p-4 text-sm text-text-muted">
              正在检测本地目录，请稍候...
            </section>
          )}

          {!loading && (
            <>
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">检测到的来源</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => void loadData()}>重新检测</button>
                </div>
                <div className="bg-bg-secondary rounded-lg divide-y divide-border-color">
                  {sources.length === 0 && (
                    <div className="p-4 text-sm text-text-muted">未检测到预设路径，您可以手动添加。</div>
                  )}
                  {sources.map((source) => (
                    <div key={source.id} className={`flex flex-col gap-2 p-4 ${source.exists ? '' : 'opacity-75'}`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={source.checked}
                          disabled={running}
                          onChange={() => toggleSource(source.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{source.label}</span>
                            {source.isOverride && (
                              <span className="text-xs text-text-secondary">已自定义</span>
                            )}
                            {!source.exists && (
                              <span className="text-xs text-danger-color">未找到目录</span>
                            )}
                            {source.recommended && (
                              <span className="text-xs text-success-color">推荐</span>
                            )}
                          </div>
                          <div className="text-xs text-text-secondary break-all mt-1">当前路径：{source.path}</div>
                          {source.isOverride && source.defaultPath && (
                            <div className="text-xs text-text-muted break-all mt-1">默认路径：{source.defaultPath}</div>
                          )}
                          {source.description && (
                            <div className="text-xs text-text-muted mt-1">{source.description}</div>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => void handleOverridePath(source.id)}
                              disabled={running}
                            >
                              选择位置
                            </button>
                            {source.isOverride && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => void handleResetOverride(source.id)}
                                disabled={running}
                              >
                                恢复默认
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {missingSelected.length > 0 && (
                  <div className="mt-3 text-xs text-warning-color">
                    有 {missingSelected.length} 个已勾选目录暂不可用，请通过“选择位置”指定正确的文件夹。
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">自定义目录</h3>
                  <button className="btn btn-outline btn-sm" onClick={handleAddPath}>添加目录</button>
                </div>
                <div className="bg-bg-secondary rounded-lg divide-y divide-border-color">
                  {customPaths.length === 0 && (
                    <div className="p-4 text-sm text-text-muted">暂无自定义目录。</div>
                  )}
                  {customPaths.map((path) => (
                    <div key={path} className="flex items-center gap-3 p-4">
                      <span className="flex-1 text-xs break-all">{path}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => removeCustomPath(path)} disabled={running}>移除</button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <label htmlFor="autoScan" className="flex items-center gap-2 text-sm">
                  <input
                    id="autoScan"
                    type="checkbox"
                    checked={Boolean(config?.autoScanOnLaunch)}
                    onChange={toggleAutoScan}
                    disabled={running}
                  />
                  启动应用时自动扫描
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={mergeIntoDefault}
                      onChange={toggleMergeIntoDefault}
                      disabled={running}
                    />
                    全部导入默认分类
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoTagPlatform}
                      onChange={toggleAutoTagPlatform}
                      disabled={running}
                    />
                    自动按平台打标签
                  </label>
                  {lastUpdatedAt && (
                    <span className="text-xs text-text-muted">配置已保存 {new Date(lastUpdatedAt).toLocaleString()}</span>
                  )}
                </div>
              </section>

              {result && (
                <section>
                  <h3 className="text-sm font-medium mb-2">最近扫描结果</h3>
                  <div className="bg-bg-secondary rounded-lg p-4 text-sm space-y-1">
                    <div>发现文件：{result.totalFound}</div>
                    <div>导入成功：{result.imported}</div>
                    <div>跳过：{result.skipped}（其中重复 {result.duplicates}）</div>
                    {result.failed > 0 && <div className="text-danger-color">失败：{result.failed}</div>}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border-color text-xs text-text-secondary">
          <span>选择目录后点击“立即扫描”即可导入新的表情资源。</span>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={running}>取消</button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleRun}
              disabled={running || loading || !hasSelection}
            >
              {running ? '扫描中...' : '立即扫描'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
