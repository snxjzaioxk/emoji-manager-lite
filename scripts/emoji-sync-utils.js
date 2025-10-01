const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']);

function resolvePath(baseDir, targetPath) {
  if (!targetPath) return baseDir;
  return path.isAbsolute(targetPath) ? targetPath : path.resolve(baseDir, targetPath);
}

async function loadConfig(configPath) {
  const absConfig = resolvePath(process.cwd(), configPath || 'scripts/emoji-sync.config.json');
  const configDir = path.dirname(absConfig);
  const rawConfig = await fsp.readFile(absConfig, 'utf8');
  const config = JSON.parse(rawConfig);

  const workspaceRoot = resolvePath(configDir, config.workspaceRoot || './emoji-sync');
  const rawDir = resolvePath(configDir, config.rawDir || path.join(config.workspaceRoot || './emoji-sync', 'raw'));
  const cleanDir = resolvePath(configDir, config.cleanDir || path.join(config.workspaceRoot || './emoji-sync', 'clean'));

  const platforms = (config.platforms || []).map((platform) => ({
    name: platform.name,
    sources: (platform.sources || []).map((src) => resolvePath(configDir, src))
  })).filter((p) => p.name && p.sources.length > 0);

  return {
    ...config,
    configPath: absConfig,
    configDir,
    workspaceRoot,
    rawDir,
    cleanDir,
    platforms
  };
}

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

async function listImageFiles(root) {
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    let stat;
    try {
      stat = await fsp.stat(current);
    } catch (error) {
      console.warn(`Skipping missing path: ${current}`, error.message);
      continue;
    }
    if (stat.isDirectory()) {
      const entries = await fsp.readdir(current);
      for (const entry of entries) {
        stack.push(path.join(current, entry));
      }
    } else if (stat.isFile()) {
      if (IMAGE_EXTENSIONS.has(path.extname(current).toLowerCase())) {
        files.push(current);
      }
    }
  }
  return files;
}

async function hashFile(filePath) {
  const hash = crypto.createHash('sha1');
  const stream = fs.createReadStream(filePath);
  return await new Promise((resolve, reject) => {
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function timestampSlug(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('') +
    '_' + [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join('');
}

function boolFromArgs(args, flag, defaultValue = false) {
  if (args.includes(`--${flag}`)) return true;
  if (args.includes(`--no-${flag}`)) return false;
  return defaultValue;
}

module.exports = {
  loadConfig,
  ensureDir,
  listImageFiles,
  hashFile,
  timestampSlug,
  boolFromArgs,
  resolvePath,
  IMAGE_EXTENSIONS
};
