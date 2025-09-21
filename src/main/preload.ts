import { contextBridge, ipcRenderer } from 'electron';
import { EmojiItem, Category, ImportOptions, ExportOptions, SearchFilters } from '../shared/types';

const api = {
  emojis: {
    getAll: (filters?: SearchFilters) => ipcRenderer.invoke('get-emojis', filters),
    add: (emoji: Omit<EmojiItem, 'createdAt' | 'updatedAt'>) => ipcRenderer.invoke('add-emoji', emoji),
    update: (id: string, updates: Partial<EmojiItem>) => ipcRenderer.invoke('update-emoji', id, updates),
    delete: (id: string) => ipcRenderer.invoke('delete-emoji', id),
    import: (options: ImportOptions) => ipcRenderer.invoke('import-emojis', options),
    export: (options: ExportOptions) => ipcRenderer.invoke('export-emojis', options),
    copyToClipboard: (filePath: string) => ipcRenderer.invoke('copy-to-clipboard', filePath),
    convertFormat: (filePath: string, targetFormat: string) => ipcRenderer.invoke('convert-format', filePath, targetFormat)
  },
  
  categories: {
    getAll: () => ipcRenderer.invoke('get-categories'),
    add: (category: Omit<Category, 'createdAt' | 'updatedAt'>) => ipcRenderer.invoke('add-category', category),
    update: (id: string, updates: Partial<Category>) => ipcRenderer.invoke('update-category', id, updates),
    delete: (id: string) => ipcRenderer.invoke('delete-category', id)
  },
  
  files: {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    selectFiles: () => ipcRenderer.invoke('select-files'),
    openLocation: (filePath: string) => ipcRenderer.invoke('open-file-location', filePath),
    getInfo: (filePath: string) => ipcRenderer.invoke('get-file-info', filePath)
  },
  
  settings: {
    get: (key: string) => ipcRenderer.invoke('get-setting', key),
    set: (key: string, value: any) => ipcRenderer.invoke('set-setting', key, value)
  }
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
