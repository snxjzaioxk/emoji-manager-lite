import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
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

  createWindow(): void {
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
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupIpcHandlers(): void {
    ipcMain.handle('get-emojis', async (_: any, filters: SearchFilters) => {
      return await this.database.getEmojis(filters);
    });

    ipcMain.handle('add-emoji', async (_: any, emoji: Omit<EmojiItem, 'createdAt' | 'updatedAt'>) => {
      return await this.database.addEmoji(emoji);
    });

    ipcMain.handle('update-emoji', async (_: any, id: string, updates: Partial<EmojiItem>) => {
      return await this.database.updateEmoji(id, updates);
    });

    ipcMain.handle('delete-emoji', async (_: any, id: string) => {
      await this.database.deleteEmoji(id);
      return await this.fileManager.deleteEmojiFile(id);
    });

    ipcMain.handle('get-categories', async (_: any) => {
      return await this.database.getCategories();
    });

    ipcMain.handle('add-category', async (_: any, category: Omit<Category, 'createdAt' | 'updatedAt'>) => {
      return await this.database.addCategory(category);
    });

    ipcMain.handle('update-category', async (_: any, id: string, updates: Partial<Category>) => {
      // sanitize to allowed fields only is handled in DB layer
      return await this.database.updateCategory(id, updates as any);
    });

    ipcMain.handle('delete-category', async (_: any, id: string) => {
      return await this.database.deleteCategory(id);
    });

    ipcMain.handle('import-emojis', async (_: any, options: ImportOptions) => {
      return await this.fileManager.importEmojis(options);
    });

    ipcMain.handle('export-emojis', async (_: any, options: ExportOptions) => {
      return await this.fileManager.exportEmojis(options);
    });

    ipcMain.handle('select-folder', async (_: any) => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory']
      });
      return result.canceled ? null : result.filePaths[0];
    });

    ipcMain.handle('select-files', async (_: any) => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
        ]
      });
      return result.canceled ? [] : result.filePaths;
    });

    ipcMain.handle('copy-to-clipboard', async (_: any, filePath: string) => {
      return await this.fileManager.copyToClipboard(filePath);
    });

    ipcMain.handle('open-file-location', async (_: unknown, filePath?: string) => {
      if (!filePath) return false;
      shell.showItemInFolder(filePath);
      return true;
    });

    ipcMain.handle('get-setting', async (_: any, key: string) => {
      return await this.database.getSetting(key);
    });

    ipcMain.handle('set-setting', async (_: any, key: string, value: any) => {
      return await this.database.setSetting(key, value);
    });

    ipcMain.handle('get-file-info', async (_: any, filePath: string) => {
      return await this.fileManager.getFileInfo(filePath);
    });

    ipcMain.handle('convert-format', async (_: any, filePath: string, targetFormat: string) => {
      return await this.fileManager.convertFormat(filePath, targetFormat);
    });
  }

  async initialize(): Promise<void> {
    await app.whenReady();
    this.createWindow();

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
