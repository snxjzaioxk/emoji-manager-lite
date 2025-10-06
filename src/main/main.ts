import { app, BrowserWindow, ipcMain, dialog, shell, IpcMainInvokeEvent } from 'electron';
import { fileURLToPath } from 'url';
import { isAbsolute, normalize } from 'path';
import { join } from 'path';
import { Database } from './database';
import { FileManager } from './fileManager';
import { EmojiItem, Category, ImportOptions, ExportOptions, SearchFilters, ScannerRunOptions, ScannerConfig, SavedSearch } from '../shared/types';
import { EmojiScanner } from './emojiScanner';

// Disable all GPU features to save memory
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-compositing');

// Set memory limits
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256 --max-semi-space-size=4');
app.commandLine.appendSwitch('max_old_space_size', '256');

class EmojiManagerApp {
  private mainWindow: BrowserWindow | null = null;
  private database: Database;
  private fileManager: FileManager;
  private scanner: EmojiScanner;

  constructor() {
    this.database = new Database();
    this.fileManager = new FileManager(this.database);
    this.scanner = new EmojiScanner(this.database, this.fileManager);
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
      show: true,  // 立即显示窗口
      icon: process.platform === 'linux' ? join(__dirname, '../../assets/icon.png') : undefined
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
        // 如果开发服务器失败，加载本地文件
        await this.mainWindow.loadFile(join(__dirname, '../../renderer/index.html'));
      }
      this.mainWindow.webContents.openDevTools();
    } else {
      console.log('Loading file:', join(__dirname, '../../renderer/index.html'));
      await this.mainWindow.loadFile(join(__dirname, '../../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      console.log('Window ready to show');
      this.mainWindow?.show();
      this.mainWindow?.focus();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // 添加错误处理
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load page:', errorCode, errorDescription);
    });
  }

  private setupIpcHandlers(): void {
    ipcMain.handle('get-emoji', async (_event: IpcMainInvokeEvent, id: string) => {
      return await this.database.getEmoji(id);
    });

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
      // Use transaction-like approach to ensure consistency
      try {
        const emoji = await this.database.getEmoji(id);
        if (emoji) {
          // Delete file first
          await this.fileManager.deleteEmojiFile(id);
          // Then remove DB record
          await this.database.deleteEmoji(id);
        }
      } catch (error) {
        // If file deletion fails, don't delete from DB
        throw new Error(`Failed to delete emoji: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
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

    ipcMain.handle('get-tags', async () => {
      return await this.database.getTags();
    });

    ipcMain.handle('create-tag', async (_event: IpcMainInvokeEvent, payload: unknown) => {
      if (typeof payload !== 'object' || payload === null) {
        throw new Error('Invalid tag payload');
      }
      const tag = payload as { name: string; color?: string; description?: string };
      return await this.database.createTag(tag);
    });

    ipcMain.handle('update-tag', async (_event: IpcMainInvokeEvent, id: string, updates: unknown) => {
      if (typeof updates !== 'object' || updates === null) {
        throw new Error('Invalid tag updates');
      }
      return await this.database.updateTag(id, updates as Partial<{ name: string; color?: string; description?: string }>);
    });

    ipcMain.handle('delete-tag', async (_event: IpcMainInvokeEvent, id: string) => {
      return await this.database.deleteTag(id);
    });

    ipcMain.handle('set-emoji-tags', async (_event: IpcMainInvokeEvent, emojiId: string, tagNames: string[]) => {
      return await this.database.setEmojiTagsForEmoji(emojiId, tagNames);
    });

    ipcMain.handle('get-saved-searches', async () => {
      return await this.database.getSavedSearches();
    });

    ipcMain.handle('create-saved-search', async (_event: IpcMainInvokeEvent, search: unknown) => {
      if (typeof search !== 'object' || search === null) {
        throw new Error('Invalid search object');
      }
      return await this.database.createSavedSearch(search as Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>);
    });

    ipcMain.handle('update-saved-search', async (_event: IpcMainInvokeEvent, id: string, updates: unknown) => {
      if (typeof updates !== 'object' || updates === null) {
        throw new Error('Invalid updates object');
      }
      return await this.database.updateSavedSearch(id, updates as Partial<Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>>);
    });

    ipcMain.handle('delete-saved-search', async (_event: IpcMainInvokeEvent, id: string) => {
      return await this.database.deleteSavedSearch(id);
    });

    ipcMain.handle('import-emojis', async (_event: IpcMainInvokeEvent, options: ImportOptions) => {
      return await this.fileManager.importEmojis(options);
    });

    ipcMain.handle('export-emojis', async (_event: IpcMainInvokeEvent, options: ExportOptions) => {
      return await this.fileManager.exportEmojis(options);
    });

    ipcMain.handle('select-folder', async (_event: IpcMainInvokeEvent) => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        throw new Error('Main window is not available');
      }
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory']
      });
      return result.canceled ? null : result.filePaths[0];
    });

    ipcMain.handle('select-files', async (_event: IpcMainInvokeEvent) => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        throw new Error('Main window is not available');
      }
      const result = await dialog.showOpenDialog(this.mainWindow, {
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
        // Enhanced Windows path handling
        let nativePath: string;
        if (filePath.startsWith('file:')) {
          try {
            nativePath = fileURLToPath(filePath);
          } catch {
            // Fallback for invalid file URLs
            nativePath = filePath.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '');
          }
        } else {
          nativePath = filePath;
        }

        // Handle Windows special characters
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

    ipcMain.handle('rename-emoji', async (_event: IpcMainInvokeEvent, id: string, newName: string) => {
      return await this.fileManager.renameEmoji(id, newName);
    });

    ipcMain.handle('scanner-detect-sources', async () => {
      return await this.scanner.detectSources();
    });

    ipcMain.handle('scanner-get-config', async () => {
      return await this.scanner.getConfig();
    });

    ipcMain.handle('scanner-save-config', async (_event: IpcMainInvokeEvent, config: unknown) => {
      if (typeof config !== 'object' || config === null) {
        throw new Error('Invalid config payload');
      }
      return await this.scanner.saveConfig(config as Partial<ScannerConfig>);
    });

    ipcMain.handle('scanner-run', async (_event: IpcMainInvokeEvent, options: unknown) => {
      if (typeof options !== 'object' || options === null) {
        throw new Error('Invalid scan options');
      }
      return await this.scanner.runScan(options as ScannerRunOptions);
    });
  }

  async initialize(): Promise<void> {
    await app.whenReady();
    await this.createWindow();
    void this.maybeAutoScan();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    app.on('window-all-closed', async () => {
      if (process.platform !== 'darwin') {
        try {
          await this.database.close();
        } catch (error) {
          console.error('Failed to close database properly:', error);
        } finally {
          app.quit();
        }
      }
    });
  }

  private async maybeAutoScan(): Promise<void> {
    try {
      const config = await this.scanner.getConfig();
      if (!config.autoScanOnLaunch) {
        return;
      }

      await this.scanner.runScan({
        sourceIds: config.enabledSources,
        additionalPaths: config.customPaths,
        skipDuplicates: true,
        autoTagPlatform: config.autoTagPlatform ?? false
      });
    } catch (error) {
      console.warn('Auto scan failed:', error);
    }
  }
}

const emojiApp = new EmojiManagerApp();
emojiApp.initialize().catch((error) => {
  console.error('Failed to initialize application:', error);
  dialog.showErrorBox('Initialization Error',
    `Failed to start Emoji Manager: ${error instanceof Error ? error.message : 'Unknown error'}`);
  app.quit();
});
