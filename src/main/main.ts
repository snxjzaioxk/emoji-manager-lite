import { app, BrowserWindow, ipcMain, dialog, shell, IpcMainInvokeEvent } from 'electron';
import { fileURLToPath } from 'url';
import { isAbsolute, normalize } from 'path';
import { join } from 'path';
import { Database } from './database';
import { FileManager } from './fileManager';
import { EmojiItem, Category, ImportOptions, ExportOptions, SearchFilters } from '../shared/types';

class EmojiManagerApp {
  private mainWindow: BrowserWindow | null = null;
  private database: Database;
  private fileManager: FileManager;

  constructor() {
    this.database = new Database();
    this.fileManager = new FileManager(this.database);
    this.setupIpcHandlers();
  }

  async createWindow(): Promise<void> {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js')
      },
      titleBarStyle: 'default',
      show: false
    });

    const isDev = !app.isPackaged;
    if (isDev) {
      // Try different ports that Vite might use
      const possiblePorts = [3000, 3001, 3002, 3003];
      let loaded = false;
      for (const port of possiblePorts) {
        try {
          await this.mainWindow.loadURL(`http://localhost:${port}`);
          loaded = true;
          break;
        } catch (error) {
          console.warn(`Failed to load port ${port}:`, error);
        }
      }
      if (!loaded) {
        console.error('Failed to load any dev server port');
      }
      this.mainWindow.webContents.openDevTools();
    } else {
      await this.mainWindow.loadFile(join(__dirname, '../../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupIpcHandlers(): void {
    ipcMain.handle('get-emojis', async (_event: IpcMainInvokeEvent, filters: SearchFilters) => {
      return await this.database.getEmojis(filters);
    });

    ipcMain.handle('add-emoji', async (_event: IpcMainInvokeEvent, emoji: Omit<EmojiItem, 'createdAt' | 'updatedAt'>) => {
      return await this.database.addEmoji(emoji);
    });

    ipcMain.handle('update-emoji', async (_event: IpcMainInvokeEvent, id: string, updates: Partial<EmojiItem>) => {
      return await this.database.updateEmoji(id, updates);
    });

    ipcMain.handle('delete-emoji', async (_event: IpcMainInvokeEvent, id: string) => {
      // Delete file first while DB record still exists (to find storagePath), then remove DB row
      await this.fileManager.deleteEmojiFile(id);
      await this.database.deleteEmoji(id);
    });

    ipcMain.handle('get-categories', async (_event: IpcMainInvokeEvent) => {
      return await this.database.getCategories();
    });

    ipcMain.handle('add-category', async (_event: IpcMainInvokeEvent, category: Omit<Category, 'createdAt' | 'updatedAt'>) => {
      return await this.database.addCategory(category);
    });

    ipcMain.handle('update-category', async (_event: IpcMainInvokeEvent, id: string, updates: Partial<Category>) => {
      // sanitize to allowed fields only is handled in DB layer
      return await this.database.updateCategory(id, updates);
    });

    ipcMain.handle('delete-category', async (_event: IpcMainInvokeEvent, id: string) => {
      return await this.database.deleteCategory(id);
    });

    ipcMain.handle('import-emojis', async (_event: IpcMainInvokeEvent, options: ImportOptions) => {
      return await this.fileManager.importEmojis(options);
    });

    ipcMain.handle('export-emojis', async (_event: IpcMainInvokeEvent, options: ExportOptions) => {
      return await this.fileManager.exportEmojis(options);
    });

    ipcMain.handle('select-folder', async (_event: IpcMainInvokeEvent) => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory']
      });
      return result.canceled ? null : result.filePaths[0];
    });

    ipcMain.handle('select-files', async (_event: IpcMainInvokeEvent) => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
        ]
      });
      return result.canceled ? [] : result.filePaths;
    });

    ipcMain.handle('copy-to-clipboard', async (_event: IpcMainInvokeEvent, filePath: string) => {
      return await this.fileManager.copyToClipboard(filePath);
    });

    ipcMain.handle('open-file-location', async (_: unknown, filePath?: string) => {
      try {
        if (!filePath) return false;
        const nativePath = filePath.startsWith('file:') ? fileURLToPath(filePath) : filePath;
        const finalPath = isAbsolute(nativePath) ? normalize(nativePath) : nativePath;
        shell.showItemInFolder(finalPath);
        return true;
      } catch (_e) {
        return false;
      }
    });

    ipcMain.handle('get-setting', async (_event: IpcMainInvokeEvent, key: string) => {
      return await this.database.getSetting(key);
    });

    ipcMain.handle('set-setting', async (_event: IpcMainInvokeEvent, key: string, value: unknown) => {
      return await this.database.setSetting(key, value);
    });

    ipcMain.handle('get-file-info', async (_event: IpcMainInvokeEvent, filePath: string) => {
      return await this.fileManager.getFileInfo(filePath);
    });

    ipcMain.handle('convert-format', async (_event: IpcMainInvokeEvent, filePath: string, targetFormat: string) => {
      return await this.fileManager.convertFormat(filePath, targetFormat);
    });

    ipcMain.handle('read-file-dataurl', async (_event: IpcMainInvokeEvent, filePath: string) => {
      return await this.fileManager.readAsDataURL(filePath);
    });

    ipcMain.handle('update-storage-location', async (_event: IpcMainInvokeEvent, newPath: string) => {
      return await this.fileManager.updateStorageLocation(newPath);
    });
  }

  async initialize(): Promise<void> {
    await app.whenReady();
    await this.createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.database.close();
        app.quit();
      }
    });
  }
}

const emojiApp = new EmojiManagerApp();
emojiApp.initialize().catch(console.error);
