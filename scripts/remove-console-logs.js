/**
 * 批量移除或替换生产代码中的 console.log
 * 将 console.log/error 替换为 logger 调用
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

function replaceConsoleLogs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 检查是否已经导入 logger
  const hasLoggerImport = content.includes("from '../../shared/logger'") ||
                          content.includes("from '../../../shared/logger'");

  // 替换 console.error
  const errorPattern = /console\.error\((.*?)\)/g;
  if (errorPattern.test(content)) {
    content = content.replace(errorPattern, 'logger.error($1)');
    modified = true;
  }

  // 替换 console.log
  const logPattern = /console\.log\((.*?)\)/g;
  if (logPattern.test(content)) {
    content = content.replace(logPattern, 'logger.debug($1)');
    modified = true;
  }

  // 替换 console.warn
  const warnPattern = /console\.warn\((.*?)\)/g;
  if (warnPattern.test(content)) {
    content = content.replace(warnPattern, 'logger.warn($1)');
    modified = true;
  }

  // 如果进行了替换但没有导入 logger，添加导入
  if (modified && !hasLoggerImport) {
    // 判断是渲染进程还是主进程
    const isRenderer = filePath.includes('renderer');
    const importPath = isRenderer ? "'../../shared/logger'" : "'../shared/logger'";

    // 在第一个 import 后添加 logger import
    const importRegex = /(import.*?;)/;
    if (importRegex.test(content)) {
      content = content.replace(importRegex, `$1\nimport { logger } from ${importPath};`);
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated: ${path.relative(srcDir, filePath)}`);
    return true;
  }

  return false;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let count = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      count += processDirectory(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (replaceConsoleLogs(filePath)) {
        count++;
      }
    }
  });

  return count;
}

console.log('Starting console.log replacement...\n');
const count = processDirectory(srcDir);
console.log(`\nCompleted! Updated ${count} files.`);
