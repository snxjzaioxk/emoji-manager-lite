import { contextBridge, ipcRenderer } from 'electron';
import { EmojiItem, Category, ImportOptions, ExportOptions, SearchFilters } from '../shared/types';

// Helper function to add timeout to IPC calls
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) =>
      setTimeout(() => reject(new Error('IPC call timed out')), timeoutMs)
    )
  ]);
}

// Validation helpers
function validateString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} must be a string`);
  }
  return value;
}

function validateObject(value: unknown, fieldName: string): object {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError(`${fieldName} must be an object`);
  }
  return value;
}

const api = {
  emojis: {
    getAll: (filters?: SearchFilters) => withTimeout(ipcRenderer.invoke('get-emojis', filters)),
    add: (emoji: Omit<EmojiItem, 'createdAt' | 'updatedAt'>) => {
      validateObject(emoji, 'emoji');
      return withTimeout(ipcRenderer.invoke('add-emoji', emoji));
    },
    update: (id: string, updates: Partial<EmojiItem>) => {
      validateString(id, 'id');
      validateObject(updates, 'updates');
      return withTimeout(ipcRenderer.invoke('update-emoji', id, updates));
    },
    delete: (id: string) => {
      validateString(id, 'id');
      return withTimeout(ipcRenderer.invoke('delete-emoji', id));
    },
    import: (options: ImportOptions) => {
      validateObject(options, 'options');
      return withTimeout(ipcRenderer.invoke('import-emojis', options), 60000);
    },
    export: (options: ExportOptions) => {
      validateObject(options, 'options');
      return withTimeout(ipcRenderer.invoke('export-emojis', options), 60000);
    },
    copyToClipboard: (filePath: string) => {
      validateString(filePath, 'filePath');
      return withTimeout(ipcRenderer.invoke('copy-to-clipboard', filePath));
    },
    convertFormat: (filePath: string, targetFormat: string) => {
      validateString(filePath, 'filePath');
      validateString(targetFormat, 'targetFormat');
      return withTimeout(ipcRenderer.invoke('convert-format', filePath, targetFormat));
    }
  },

  categories: {
    getAll: () => withTimeout(ipcRenderer.invoke('get-categories')),
    add: (category: Omit<Category, 'createdAt' | 'updatedAt'>) => {
      validateObject(category, 'category');
      return withTimeout(ipcRenderer.invoke('add-category', category));
    },
    update: (id: string, updates: Partial<Category>) => {
      validateString(id, 'id');
      validateObject(updates, 'updates');
      return withTimeout(ipcRenderer.invoke('update-category', id, updates));
    },
    delete: (id: string) => {
      validateString(id, 'id');
      return withTimeout(ipcRenderer.invoke('delete-category', id));
    }
  },

  files: {
    selectFolder: () => withTimeout(ipcRenderer.invoke('select-folder')),
    selectFiles: () => withTimeout(ipcRenderer.invoke('select-files')),
    openLocation: (filePath: string) => {
      validateString(filePath, 'filePath');
      return withTimeout(ipcRenderer.invoke('open-file-location', filePath));
    },
    getInfo: (filePath: string) => {
      validateString(filePath, 'filePath');
      return withTimeout(ipcRenderer.invoke('get-file-info', filePath));
    },
    readAsDataURL: (filePath: string) => {
      validateString(filePath, 'filePath');
      return withTimeout(ipcRenderer.invoke('read-file-dataurl', filePath));
    },
    updateStorageLocation: (newPath: string) => {
      validateString(newPath, 'newPath');
      return withTimeout(ipcRenderer.invoke('update-storage-location', newPath));
    }
  },

  settings: {
    get: (key: string) => {
      validateString(key, 'key');
      return withTimeout(ipcRenderer.invoke('get-setting', key));
    },
    set: (key: string, value: unknown) => {
      validateString(key, 'key');
      // Validate value based on key
      if (key === 'storageLocation' && typeof value !== 'string') {
        throw new TypeError('storageLocation must be a string');
      }
      if (key === 'viewMode' && !['grid', 'list'].includes(value as string)) {
        throw new TypeError('viewMode must be "grid" or "list"');
      }
      if (key === 'sortBy' && !['name', 'date', 'size'].includes(value as string)) {
        throw new TypeError('sortBy must be "name", "date", or "size"');
      }
      return withTimeout(ipcRenderer.invoke('set-setting', key, value));
    }
  }
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
