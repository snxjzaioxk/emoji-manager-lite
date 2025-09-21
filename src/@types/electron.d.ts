// Temporary Electron type definitions until Electron is properly installed
declare module 'electron' {
  export interface BrowserWindow {
    loadURL(url: string): Promise<void>;
    loadFile(filePath: string): Promise<void>;
    show(): void;
    webContents: {
      openDevTools(): void;
    };
    on(event: string, listener: Function): void;
    once(event: string, listener: Function): void;
  }

  export interface WebPreferences {
    nodeIntegration?: boolean;
    contextIsolation?: boolean;
    preload?: string;
  }

  export interface BrowserWindowConstructorOptions {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    webPreferences?: WebPreferences;
    titleBarStyle?: string;
    show?: boolean;
  }

  export interface OpenDialogOptions {
    properties?: string[];
    filters?: Array<{ name: string; extensions: string[] }>;
  }

  export interface OpenDialogReturnValue {
    canceled: boolean;
    filePaths: string[];
  }

  export interface IpcMain {
    handle(channel: string, listener: (event: any, ...args: any[]) => any): void;
    on(channel: string, listener: (event: any, ...args: any[]) => void): void;
  }

  export interface IpcRenderer {
    invoke(channel: string, ...args: any[]): Promise<any>;
    on(channel: string, listener: (event: any, ...args: any[]) => void): void;
  }

  export interface App {
    whenReady(): Promise<void>;
    on(event: string, listener: Function): void;
    quit(): void;
    getPath(name: string): string;
  }

  export interface Dialog {
    showOpenDialog(browserWindow: BrowserWindow, options: OpenDialogOptions): Promise<OpenDialogReturnValue>;
  }

  export interface Shell {
    showItemInFolder(fullPath: string): void;
  }

  export interface Clipboard {
    writeImage(image: any): void;
  }

  export interface NativeImage {
    createFromPath(path: string): any;
  }

  export const BrowserWindow: {
    new(options?: BrowserWindowConstructorOptions): BrowserWindow;
    getAllWindows(): BrowserWindow[];
  };

  export const app: App;
  export const ipcMain: IpcMain;
  export const ipcRenderer: IpcRenderer;
  export const dialog: Dialog;
  export const shell: Shell;
  export const clipboard: Clipboard;
  export const nativeImage: NativeImage;
  export const contextBridge: {
    exposeInMainWorld(apiKey: string, api: any): void;
  };
}