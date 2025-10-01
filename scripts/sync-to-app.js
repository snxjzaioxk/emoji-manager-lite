#!/usr/bin/env node
const path = require('path');
const os = require('os');
const fs = require('fs');
const fsp = fs.promises;
const sqlite3 = require('sqlite3');
const sharp = require('sharp');
const { randomUUID } = require('crypto');
const {
  loadConfig,
  ensureDir,
  listImageFiles,
  boolFromArgs
} = require('./emoji-sync-utils');

function getArgValue(args, flag, fallback) {
  const index = args.indexOf(flag);
  if (index >= 0 && index < args.length - 1) return args[index + 1];
  return fallback;
}

function getUserDataPath(overridePath) {
  if (overridePath) return path.isAbsolute(overridePath) ? overridePath : path.resolve(process.cwd(), overridePath);
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(base, 'Emoji Manager Lite');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Emoji Manager Lite');
  }
  return path.join(os.homedir(), '.config', 'Emoji Manager Lite');
}

function openDatabase(dbPath) {
  sqlite3.verbose();
  return new sqlite3.Database(dbPath);
}

function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initializeSchema(db) {
  await runAsync(db, `
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      parent_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES categories (id)
    )
  `);

  await runAsync(db, `
    CREATE TABLE IF NOT EXISTS emojis (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_path TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      format TEXT NOT NULL,
      size INTEGER NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      tags TEXT,
      category_id TEXT,
      is_favorite BOOLEAN DEFAULT FALSE,
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    )
  `);

  await runAsync(db, `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runAsync(db, `CREATE INDEX IF NOT EXISTS idx_emojis_category ON emojis(category_id)`);
  await runAsync(db, `CREATE INDEX IF NOT EXISTS idx_emojis_tags ON emojis(tags)`);
  await runAsync(db, `CREATE INDEX IF NOT EXISTS idx_emojis_favorite ON emojis(is_favorite)`);
}

async function ensureDefaultData(db, userDataPath) {
  const categories = await getAsync(db, 'SELECT COUNT(*) as count FROM categories');
  if (!categories || categories.count === 0) {
    const defaults = [
      { id: 'default', name: '默认分类', description: '未分类的表情包' },
      { id: 'favorites', name: '收藏夹', description: '收藏的表情包' },
      { id: 'recent', name: '最近使用', description: '最近使用的表情包' }
    ];
    for (const item of defaults) {
      await runAsync(db, 'INSERT OR IGNORE INTO categories (id, name, description) VALUES (?, ?, ?)', [item.id, item.name, item.description]);
    }
  }

  const defaultSettings = {
    defaultImportPath: path.join(os.homedir(), 'Pictures'),
    defaultExportPath: path.join(os.homedir(), 'Pictures'),
    storageLocation: path.join(userDataPath, 'emojis'),
    theme: 'auto',
    viewMode: 'grid',
    thumbnailSize: 'medium',
    autoBackup: true,
    maxStorageSize: 1024 * 1024 * 1024,
    recentLimit: 100
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    await runAsync(db, 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
  }
}

function parseSetting(raw) {
  if (!raw || typeof raw.value !== 'string') return undefined;
  try {
    return JSON.parse(raw.value);
  } catch (_) {
    return raw.value;
  }
}

async function ensureCategory(db, categoryId, categoryName) {
  await runAsync(db, 'INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)', [categoryId, categoryName]);
  return categoryId;
}

async function emojiExists(db, filename, originalPath) {
  const row = await getAsync(db, 'SELECT id FROM emojis WHERE filename = ? OR original_path = ?', [filename, originalPath]);
  return Boolean(row);
}

async function insertEmoji(db, record) {
  const sql = `
    INSERT INTO emojis (
      id, filename, original_path, storage_path, format, size, width, height, tags, category_id, is_favorite, usage_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    record.id,
    record.filename,
    record.originalPath,
    record.storagePath,
    record.format,
    record.size,
    record.width,
    record.height,
    JSON.stringify(record.tags || []),
    record.categoryId,
    record.isFavorite ? 1 : 0,
    record.usageCount || 0
  ];
  await runAsync(db, sql, params);
}

async function gatherMetadata(filePath) {
  const stat = await fsp.stat(filePath);
  let width = 0;
  let height = 0;
  try {
    const metadata = await sharp(filePath, { failOn: 'none' }).metadata();
    width = metadata.width || 0;
    height = metadata.height || 0;
  } catch (_) {}
  const format = path.extname(filePath).replace('.', '').toLowerCase();
  return { size: stat.size, width, height, format };
}

function displayName(platformName) {
  if (!platformName) return 'Unknown';
  return platformName.charAt(0).toUpperCase() + platformName.slice(1);
}

async function run() {
  const args = process.argv.slice(2);
  const configPath = getArgValue(args, '--config', 'scripts/emoji-sync.config.json');
  const dryRun = boolFromArgs(args, 'dry-run', false);
  const config = await loadConfig(configPath);

  const userDataPath = getUserDataPath(config.sync?.userDataPathOverride);
  await ensureDir(userDataPath);
  const dbPath = path.join(userDataPath, 'emoji-manager.db');
  const db = openDatabase(dbPath);

  try {
    await initializeSchema(db);
    await ensureDefaultData(db, userDataPath);
    const storageSetting = await getAsync(db, 'SELECT value FROM settings WHERE key = ?', ['storageLocation']);
    let storageDir = parseSetting(storageSetting);
    if (!storageDir || typeof storageDir !== 'string') {
      storageDir = path.join(userDataPath, 'emojis');
      if (!dryRun) {
        await runAsync(db, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['storageLocation', JSON.stringify(storageDir)]);
      }
    }
    await ensureDir(storageDir);

    const summary = [];
    for (const platform of config.platforms) {
      const cleanPlatformDir = path.join(config.cleanDir, platform.name);
      const files = await listImageFiles(cleanPlatformDir);
      if (files.length === 0) {
        summary.push({ platform: platform.name, added: 0, skipped: 0 });
        continue;
      }

      const categoryId = config.sync?.categoryMap?.[platform.name] || platform.name;
      const categoryName = (config.sync?.categoryPrefix || '') + (config.sync?.categoryNames?.[platform.name] || displayName(platform.name));
      if (!dryRun) await ensureCategory(db, categoryId, categoryName);

      let added = 0;
      let skipped = 0;
      for (const file of files) {
        const filename = path.basename(file);
        if (config.sync?.skipDuplicates) {
          const exists = await emojiExists(db, filename, file);
          if (exists) {
            skipped += 1;
            continue;
          }
        }

        const id = randomUUID();
        const targetPath = path.join(storageDir, `${id}${path.extname(file)}`);
        const metadata = await gatherMetadata(file);
        const tags = [];
        if (config.sync?.autoTagPlatform) tags.push(platform.name);
        const extraTags = config.sync?.extraTags?.[platform.name];
        if (Array.isArray(extraTags)) tags.push(...extraTags);

        if (!dryRun) {
          await fsp.copyFile(file, targetPath);
          await insertEmoji(db, {
            id,
            filename,
            originalPath: file,
            storagePath: targetPath,
            format: metadata.format,
            size: metadata.size,
            width: metadata.width,
            height: metadata.height,
            tags,
            categoryId,
            isFavorite: false,
            usageCount: 0
          });
        }

        added += 1;
      }

      summary.push({ platform: platform.name, added, skipped });
    }

    summary.forEach((entry) => {
      console.log(`[sync] ${entry.platform}: added ${entry.added}, skipped ${entry.skipped}`);
    });
  } finally {
    db.close();
  }
}

run().catch((error) => {
  console.error('sync-to-app failed:', error);
  process.exitCode = 1;
});
