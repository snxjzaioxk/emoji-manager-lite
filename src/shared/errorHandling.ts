/**
 * 用户友好的错误处理工具类
 */

// 错误类型枚举
export enum ErrorType {
  NETWORK = 'network',
  FILE_SYSTEM = 'filesystem',
  PERMISSION = 'permission',
  VALIDATION = 'validation',
  DATABASE = 'database',
  CONVERSION = 'conversion',
  IMPORT = 'import',
  UNKNOWN = 'unknown'
}

// 错误信息映射
const ERROR_MESSAGES = {
  [ErrorType.NETWORK]: {
    title: '网络连接问题',
    message: '请检查您的网络连接后重试',
    action: '重新连接'
  },
  [ErrorType.FILE_SYSTEM]: {
    title: '文件操作失败',
    message: '无法访问或操作该文件，请检查文件权限',
    action: '重新尝试'
  },
  [ErrorType.PERMISSION]: {
    title: '权限不足',
    message: '没有足够的权限执行此操作',
    action: '检查权限设置'
  },
  [ErrorType.VALIDATION]: {
    title: '输入验证失败',
    message: '请检查输入的信息是否正确',
    action: '重新输入'
  },
  [ErrorType.DATABASE]: {
    title: '数据库错误',
    message: '数据操作失败，可能是数据损坏或连接问题',
    action: '重新启动应用'
  },
  [ErrorType.CONVERSION]: {
    title: '格式转换失败',
    message: '文件格式不支持或文件损坏',
    action: '尝试其他格式'
  },
  [ErrorType.IMPORT]: {
    title: '导入失败',
    message: '无法导入选定的文件',
    action: '检查文件格式'
  },
  [ErrorType.UNKNOWN]: {
    title: '未知错误',
    message: '发生了预期之外的错误',
    action: '重新尝试'
  }
};

// 特定错误的详细映射
const SPECIFIC_ERROR_PATTERNS = [
  {
    pattern: /ENOENT|file not found/i,
    type: ErrorType.FILE_SYSTEM,
    message: '找不到指定的文件或文件夹'
  },
  {
    pattern: /EACCES|permission denied/i,
    type: ErrorType.PERMISSION,
    message: '没有权限访问该文件或文件夹'
  },
  {
    pattern: /EMFILE|too many open files/i,
    type: ErrorType.FILE_SYSTEM,
    message: '打开的文件过多，请关闭一些应用后重试'
  },
  {
    pattern: /ENOSPC|no space left/i,
    type: ErrorType.FILE_SYSTEM,
    message: '磁盘空间不足，请清理磁盘空间后重试'
  },
  {
    pattern: /network|timeout|connection/i,
    type: ErrorType.NETWORK,
    message: '网络连接超时或失败'
  },
  {
    pattern: /sqlite|database/i,
    type: ErrorType.DATABASE,
    message: '数据库操作失败，可能是数据文件损坏'
  },
  {
    pattern: /sharp|image processing/i,
    type: ErrorType.CONVERSION,
    message: '图像处理失败，可能是文件格式不受支持'
  }
];

export interface UserFriendlyError {
  type: ErrorType;
  title: string;
  message: string;
  action: string;
  originalError?: string;
  code?: string;
}

/**
 * 将技术错误转换为用户友好的错误信息
 */
export function createUserFriendlyError(
  error: Error | string,
  fallbackType: ErrorType = ErrorType.UNKNOWN
): UserFriendlyError {
  const errorMessage = typeof error === 'string' ? error : error.message;

  // 尝试匹配特定错误模式
  for (const pattern of SPECIFIC_ERROR_PATTERNS) {
    if (pattern.pattern.test(errorMessage)) {
      const errorInfo = ERROR_MESSAGES[pattern.type];
      return {
        type: pattern.type,
        title: errorInfo.title,
        message: pattern.message,
        action: errorInfo.action,
        originalError: errorMessage,
        code: extractErrorCode(errorMessage)
      };
    }
  }

  // 使用回退错误类型
  const errorInfo = ERROR_MESSAGES[fallbackType];
  return {
    type: fallbackType,
    title: errorInfo.title,
    message: errorInfo.message,
    action: errorInfo.action,
    originalError: errorMessage,
    code: extractErrorCode(errorMessage)
  };
}

/**
 * 从错误信息中提取错误代码
 */
function extractErrorCode(errorMessage: string): string | undefined {
  const codeMatch = errorMessage.match(/\b(E[A-Z]+)\b/);
  return codeMatch ? codeMatch[1] : undefined;
}

/**
 * 显示用户友好的错误对话框
 */
export function showUserFriendlyError(error: UserFriendlyError, showDetails = false): void {
  let message = `${error.title}\n\n${error.message}`;

  if (error.code) {
    message += `\n\n错误代码: ${error.code}`;
  }

  if (showDetails && error.originalError) {
    message += `\n\n技术详情: ${error.originalError}`;
  }

  message += `\n\n建议操作: ${error.action}`;

  alert(message);
}

/**
 * 安全的异步操作包装器，自动处理用户友好的错误显示
 */
export async function safeAsyncWithUserFriendlyError<T>(
  operation: () => Promise<T>,
  errorType: ErrorType = ErrorType.UNKNOWN,
  showErrorDialog = true
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const userError = createUserFriendlyError(
      error instanceof Error ? error : String(error),
      errorType
    );

    if (showErrorDialog) {
      showUserFriendlyError(userError);
    } else {
      console.error('Operation failed:', userError);
    }

    return null;
  }
}