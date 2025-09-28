/**
 * 全局类型定义，用于类型安全的 window 扩展
 */
declare global {
  interface Window {
    electronAPI?: MockElectronAPI;
  }
}

export interface MockElectronAPI {
  // 类型定义...（保持现有的接口定义）
}