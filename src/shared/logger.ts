/**
 * 生产环境日志系统
 * 在开发环境输出到控制台，生产环境可选择性禁用或输出到文件
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  isDevelopment: boolean;
}

class Logger {
  private config: LoggerConfig;
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  constructor() {
    this.config = {
      enabled: process.env.NODE_ENV !== 'production',
      minLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
      isDevelopment: process.env.NODE_ENV !== 'production'
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return this.levels[level] >= this.levels[this.config.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, ..._args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return `${prefix} ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, error?: unknown, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), error, ...args);
    }
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  setMinLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }
}

// 单例导出
export const logger = new Logger();
export type { LogLevel };
