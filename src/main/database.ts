import sqlite3 from 'sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { EmojiItem, Category, AppSettings, SearchFilters, Tag, SavedSearch, ExportTemplate } from '../shared/types';

// Database row interfaces for type safety
interface DatabaseEmojiRow {
  id: string;
  filename: string;
  original_path: string;
  storage_path: string;
  format: string;
  size: number;
  width: number;
  height: number;
  tags: string | null;
  category_id: string | null;
  is_favorite: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface DatabaseCategoryRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  parent_id: string | null;
  position: number | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

interface DatabaseCountRow {
  count: number;
}

interface DatabaseSettingRow {
  value: string;
}

interface DatabaseTagRow {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export class Database {
  private db: sqlite3.Database;
  private dbPath: string;

  constructor() {
    this.dbPath = join(app.getPath('userData'), 'emoji-manager.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.initialize();
  }

  private run(sql: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private getRow<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  private allRows<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  private initialize(): void {
    this.db.serialize(() => {
      this.db.run('PRAGMA foreign_keys = ON');
      this.db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          color TEXT,
          parent_id TEXT,
          position INTEGER DEFAULT 0,
          icon TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES categories (id)
        )
      `);

      this.db.run(`
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

      this.db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE COLLATE NOCASE,
          color TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS emoji_tags (
          emoji_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          PRIMARY KEY (emoji_id, tag_id),
          FOREIGN KEY (emoji_id) REFERENCES emojis (id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
        )
      `);

      this.db.run(`
        CREATE INDEX IF NOT EXISTS idx_emojis_category ON emojis(category_id)
      `);

      this.db.run(`
        CREATE INDEX IF NOT EXISTS idx_emojis_tags ON emojis(tags)
      `);

      this.db.run(`
        CREATE INDEX IF NOT EXISTS idx_emojis_favorite ON emojis(is_favorite)
      `);

      this.db.run('CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_emoji_tags_tag ON emoji_tags(tag_id)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_emoji_tags_emoji ON emoji_tags(emoji_id)');

      this.db.run(`
        CREATE TABLE IF NOT EXISTS saved_searches (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          filters TEXT NOT NULL,
          is_default BOOLEAN DEFAULT FALSE,
          icon TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS export_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          config TEXT NOT NULL,
          is_default BOOLEAN DEFAULT FALSE,
          icon TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run('ALTER TABLE categories ADD COLUMN position INTEGER DEFAULT 0', (err) => {
        if (err && !/(duplicate column name)/i.test(err.message)) {
          console.warn('Failed to add position column:', err.message);
        }
      });

      this.db.run('ALTER TABLE categories ADD COLUMN icon TEXT', (err) => {
        if (err && !/(duplicate column name)/i.test(err.message)) {
          console.warn('Failed to add icon column:', err.message);
        }
      });

      this.initializeDefaultData();
    });

    this.migrateLegacyTags().catch((error) => {
      console.error('Failed to migrate legacy tags:', error);
    });
  }

  private initializeDefaultData(): void {
    this.db.get("SELECT COUNT(*) as count FROM categories", (err: Error | null, row: DatabaseCountRow | undefined) => {
      if (!err && row && row.count === 0) {
        const defaultCategories = [
          { id: 'default', name: '默认分类', description: '未分类的表情包' },
          { id: 'favorites', name: '收藏夹', description: '收藏的表情包' },
          { id: 'recent', name: '最近使用', description: '最近使用的表情包' }
        ];

        defaultCategories.forEach(category => {
          this.db.run(
            "INSERT INTO categories (id, name, description) VALUES (?, ?, ?)",
            [category.id, category.name, category.description]
          );
        });
      }
    });

    const defaultSettings: Partial<AppSettings> = {
      defaultImportPath: app.getPath('pictures'),
      defaultExportPath: app.getPath('pictures'),
      storageLocation: join(app.getPath('userData'), 'emojis'),
      theme: 'auto',
      viewMode: 'grid',
      thumbnailSize: 'medium',
      autoBackup: true,
      maxStorageSize: 1024 * 1024 * 1024,
      recentLimit: 100
    };

    Object.entries(defaultSettings).forEach(([key, value]) => {
      this.db.run(
        "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
        [key, JSON.stringify(value)]
      );
    });

    const defaultScannerConfig = {
      enabledSources: [],
      customPaths: [],
      autoScanOnLaunch: false,
      targetCategoryMap: {
        wechat: 'wechat',
        qq: 'qq',
        douyin: 'douyin',
        browser: 'browser',
        custom: 'custom'
      },
      sourceOverrides: {},
      mergeIntoDefaultCategory: true,
      autoTagPlatform: false
    };

    this.db.run(
      "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
      ['scannerConfig', JSON.stringify(defaultScannerConfig)]
    );
  }

  private normalizeTagNames(tagNames: string[]): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const name of tagNames) {
      if (typeof name !== 'string') continue;
      const trimmed = name.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      normalized.push(lower);
    }
    return normalized;
  }

  private parseLegacyTags(raw: string | null): string[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return this.normalizeTagNames(parsed as string[]);
      }
      if (typeof parsed === 'string') {
        return this.normalizeTagNames(parsed.split(',').map((t) => t.trim()));
      }
    } catch {
      return this.normalizeTagNames(String(raw).split(',').map((t) => t.trim()));
    }
    return [];
  }

  private async ensureTagsExist(tagNames: string[]): Promise<DatabaseTagRow[]> {
    const normalized = this.normalizeTagNames(tagNames);
    if (normalized.length === 0) return [];

    const placeholders = normalized.map(() => '?').join(',');
    const existing = await this.allRows<DatabaseTagRow>(
      `SELECT * FROM tags WHERE name IN (${placeholders})`,
      normalized
    );

    const existingSet = new Set(existing.map((row) => row.name.toLowerCase()));
    const missing = normalized.filter((name) => !existingSet.has(name));

    for (const name of missing) {
      const id = randomUUID();
      await this.run('INSERT INTO tags (id, name) VALUES (?, ?)', [id, name]);
    }

    return await this.allRows<DatabaseTagRow>(
      `SELECT * FROM tags WHERE name IN (${normalized.map(() => '?').join(',')})`,
      normalized
    );
  }

  private async setEmojiTagsInternal(
    emojiId: string,
    tagNames: string[],
    options: { persistColumn?: boolean; touch?: boolean } = {}
  ): Promise<string[]> {
    const normalized = this.normalizeTagNames(tagNames);
    const rows = await this.ensureTagsExist(normalized);
    const map = new Map(rows.map((row) => [row.name.toLowerCase(), row]));

    await this.run('DELETE FROM emoji_tags WHERE emoji_id = ?', [emojiId]);

    for (const name of normalized) {
      const row = map.get(name);
      if (!row) continue;
      await this.run('INSERT OR IGNORE INTO emoji_tags (emoji_id, tag_id) VALUES (?, ?)', [emojiId, row.id]);
    }

    if (options.persistColumn !== false) {
      const json = JSON.stringify(normalized);
      if (options.touch === false) {
        await this.run('UPDATE emojis SET tags = ? WHERE id = ?', [json, emojiId]);
      } else {
        await this.run('UPDATE emojis SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [json, emojiId]);
      }
    }

    return normalized;
  }

  private async fetchTagsForEmojiIds(emojiIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (emojiIds.length === 0) return map;

    const placeholders = emojiIds.map(() => '?').join(',');
    const rows = await this.allRows<{ emoji_id: string; name: string }>(
      `SELECT et.emoji_id AS emoji_id, t.name AS name
       FROM emoji_tags et
       INNER JOIN tags t ON t.id = et.tag_id
       WHERE et.emoji_id IN (${placeholders})
       ORDER BY t.name ASC`,
      emojiIds
    );

    for (const row of rows) {
      const list = map.get(row.emoji_id) ?? [];
      list.push(row.name.toLowerCase());
      map.set(row.emoji_id, list);
    }

    return map;
  }

  private async migrateLegacyTags(): Promise<void> {
    try {
      const existing = await this.getRow<DatabaseCountRow>('SELECT COUNT(*) as count FROM emoji_tags');
      if (existing && existing.count > 0) return;

      const rows = await this.allRows<{ id: string; tags: string | null }>(
        "SELECT id, tags FROM emojis WHERE tags IS NOT NULL AND TRIM(tags) <> ''",
        []
      );

      for (const row of rows) {
        const tagNames = this.parseLegacyTags(row.tags);
        if (tagNames.length === 0) continue;
        await this.setEmojiTagsInternal(row.id, tagNames, { touch: false });
      }
    } catch (error) {
      console.error('Legacy tag migration error:', error);
    }
  }

  private mapTagRow(row: DatabaseTagRow): Tag {
    return {
      id: row.id,
      name: row.name,
      color: row.color || undefined,
      description: row.description || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapCategoryRow(row: DatabaseCategoryRow): Category {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      color: row.color || undefined,
      parentId: row.parent_id || undefined,
      position: row.position ?? undefined,
      icon: row.icon || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private async getNextCategoryPosition(parentId?: string): Promise<number> {
    const row = parentId
      ? await this.getRow<{ maxPos: number }>('SELECT COALESCE(MAX(position), 0) AS maxPos FROM categories WHERE parent_id = ?', [parentId])
      : await this.getRow<{ maxPos: number }>('SELECT COALESCE(MAX(position), 0) AS maxPos FROM categories WHERE parent_id IS NULL', []);
    return (row?.maxPos ?? 0) + 1;
  }

  async getEmoji(id: string): Promise<EmojiItem | null> {
    const row = await this.getRow<DatabaseEmojiRow>('SELECT * FROM emojis WHERE id = ?', [id]);
    if (!row) return null;

    const tagMap = await this.fetchTagsForEmojiIds([row.id]);
    const tags = tagMap.get(row.id) ?? this.parseLegacyTags(row.tags);

    return {
      id: row.id,
      filename: row.filename,
      originalPath: row.original_path,
      storagePath: row.storage_path,
      format: row.format,
      size: row.size,
      width: row.width,
      height: row.height,
      tags,
      categoryId: row.category_id || undefined,
      isFavorite: Boolean(row.is_favorite),
      usageCount: row.usage_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async getEmojis(filters?: SearchFilters): Promise<EmojiItem[]> {
    let query = 'SELECT * FROM emojis WHERE 1=1';
    const params: (string | number)[] = [];

    if (filters?.categoryId) {
      query += ' AND category_id = ?';
      params.push(filters.categoryId);
    }

    if (filters?.keyword) {
      const keyword = `%${filters.keyword}%`;
      query += ' AND (filename LIKE ? OR tags LIKE ?)';
      params.push(keyword, keyword);
    }

    if (filters?.isFavorite !== undefined) {
      query += ' AND is_favorite = ?';
      params.push(filters.isFavorite ? 1 : 0);
    }

    if (filters?.format) {
      query += ' AND LOWER(format) = LOWER(?)';
      params.push(filters.format);
    }

    if (filters?.tags && filters.tags.length > 0) {
      for (const tagName of filters.tags) {
        const normalized = this.normalizeTagNames([tagName])[0];
        if (!normalized) continue;
        query += ' AND tags LIKE ?';
        params.push(`%"${normalized}"%`);
      }
    }

    if (filters?.tagIds && filters.tagIds.length > 0) {
      const placeholders = filters.tagIds.map(() => '?').join(',');
      query += ` AND id IN (
        SELECT emoji_id FROM emoji_tags
        WHERE tag_id IN (${placeholders})
        GROUP BY emoji_id
        HAVING COUNT(DISTINCT tag_id) = ?
      )`;
      params.push(...filters.tagIds, filters.tagIds.length);
    }

    if (filters?.excludeTagIds && filters.excludeTagIds.length > 0) {
      const placeholders = filters.excludeTagIds.map(() => '?').join(',');
      query += ` AND id NOT IN (
        SELECT emoji_id FROM emoji_tags WHERE tag_id IN (${placeholders})
      )`;
      params.push(...filters.excludeTagIds);
    }

    if (filters?.sizeRange) {
      if (typeof filters.sizeRange.min === 'number') {
        query += ' AND size >= ?';
        params.push(filters.sizeRange.min);
      }
      if (typeof filters.sizeRange.max === 'number') {
        query += ' AND size <= ?';
        params.push(filters.sizeRange.max);
      }
    }

    if (filters?.dateRange) {
      const start = filters.dateRange.start instanceof Date ? filters.dateRange.start.toISOString() : String(filters.dateRange.start);
      const end = filters.dateRange.end instanceof Date ? filters.dateRange.end.toISOString() : String(filters.dateRange.end);
      query += ' AND created_at BETWEEN ? AND ?';
      params.push(start, end);
    }

    // 高级过滤选项
    if (typeof filters?.minWidth === 'number') {
      query += ' AND width >= ?';
      params.push(filters.minWidth);
    }
    if (typeof filters?.maxWidth === 'number') {
      query += ' AND width <= ?';
      params.push(filters.maxWidth);
    }
    if (typeof filters?.minHeight === 'number') {
      query += ' AND height >= ?';
      params.push(filters.minHeight);
    }
    if (typeof filters?.maxHeight === 'number') {
      query += ' AND height <= ?';
      params.push(filters.maxHeight);
    }
    if (filters?.isAnimated === true) {
      query += ' AND format IN (?, ?)';
      params.push('gif', 'webp');
    }
    if (filters?.isAnimated === false) {
      query += ' AND format NOT IN (?, ?)';
      params.push('gif', 'webp');
    }

    const sortMap: Record<string, string> = {
      updatedAt: 'updated_at',
      createdAt: 'created_at',
      usageCount: 'usage_count',
      name: 'filename',
      size: 'size'
    };
    const sortByDb = filters?.sortBy ? sortMap[filters.sortBy] : 'updated_at';
    const sortOrder = filters?.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortByDb} ${sortOrder}`;

    if (typeof filters?.limit === 'number' && filters.limit > 0) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = await this.allRows<DatabaseEmojiRow>(query, params);
    const ids = rows.map((row) => row.id);
    const tagMap = await this.fetchTagsForEmojiIds(ids);

    return rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      originalPath: row.original_path,
      storagePath: row.storage_path,
      format: row.format,
      size: row.size,
      width: row.width,
      height: row.height,
      tags: tagMap.get(row.id) ?? this.parseLegacyTags(row.tags),
      categoryId: row.category_id || undefined,
      isFavorite: Boolean(row.is_favorite),
      usageCount: row.usage_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async addEmoji(emoji: Omit<EmojiItem, 'createdAt' | 'updatedAt'>): Promise<void> {
    const normalizedTags = this.normalizeTagNames(emoji.tags);
    await this.run(
      `INSERT INTO emojis (
        id, filename, original_path, storage_path, format, size, width, height,
        tags, category_id, is_favorite, usage_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        emoji.id,
        emoji.filename,
        emoji.originalPath,
        emoji.storagePath,
        emoji.format,
        emoji.size,
        emoji.width,
        emoji.height,
        JSON.stringify(normalizedTags),
        emoji.categoryId || 'default',
        emoji.isFavorite ? 1 : 0,
        emoji.usageCount
      ]
    );

    if (normalizedTags.length > 0) {
      await this.setEmojiTagsInternal(emoji.id, normalizedTags, { persistColumn: false });
    }
  }

  async updateEmoji(id: string, updates: Partial<EmojiItem>): Promise<void> {
    if (!updates || Object.keys(updates).length === 0) return;

    const normalizedTags = updates.tags ? this.normalizeTagNames(updates.tags) : undefined;

    const fieldMap: Record<string, string> = {
      isFavorite: 'is_favorite',
      categoryId: 'category_id',
      usageCount: 'usage_count',
      originalPath: 'original_path',
      storagePath: 'storage_path'
    };

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'tags') continue;
      const dbField = fieldMap[key] ?? key;
      fields.push(`${dbField} = ?`);
      if (key === 'isFavorite') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }

    if (fields.length > 0) {
      await this.run(
        `UPDATE emojis SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, id]
      );
    }

    if (normalizedTags) {
      await this.setEmojiTagsInternal(id, normalizedTags);
    }
  }

  async deleteEmoji(id: string): Promise<void> {
    await this.run('DELETE FROM emojis WHERE id = ?', [id]);
  }

  async getCategories(): Promise<Category[]> {
    const rows = await this.allRows<DatabaseCategoryRow>(
      'SELECT * FROM categories ORDER BY position ASC, name ASC',
      []
    );
    return rows.map((row) => this.mapCategoryRow(row));
  }

  async addCategory(category: Omit<Category, 'createdAt' | 'updatedAt'>): Promise<void> {
    const position = category.position ?? (await this.getNextCategoryPosition(category.parentId));
    await this.run(
      'INSERT INTO categories (id, name, description, color, parent_id, position, icon) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        category.id,
        category.name,
        category.description ?? null,
        category.color ?? null,
        category.parentId ?? null,
        position,
        category.icon ?? null
      ]
    );
  }

  async updateCategory(id: string, updates: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    if (!updates || Object.keys(updates).length === 0) return;

    const allowed: Array<keyof Omit<Category, 'id' | 'createdAt' | 'updatedAt'>> = ['name', 'description', 'color', 'parentId', 'position', 'icon'];
    const fields = Object.keys(updates).filter((key) => allowed.includes(key as keyof typeof updates));
    if (fields.length === 0) return;

    const setClause = fields
      .map((field) => {
        const dbField = field === 'parentId' ? 'parent_id' : field;
        return `${dbField} = ?`;
      })
      .join(', ');

    const values = fields.map((field) => updates[field as keyof typeof updates] ?? null);

    await this.run(
      `UPDATE categories SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
  }

  async deleteCategory(id: string): Promise<void> {
    if (['default', 'favorites', 'recent'].includes(id)) {
      throw new Error('Cannot delete built-in category');
    }

    await this.run(
      `UPDATE emojis SET category_id = 'default', updated_at = CURRENT_TIMESTAMP WHERE category_id = ?`,
      [id]
    );
    await this.run('DELETE FROM categories WHERE id = ?', [id]);
  }

  async getTags(): Promise<Tag[]> {
    const rows = await this.allRows<DatabaseTagRow>('SELECT * FROM tags ORDER BY name COLLATE NOCASE', []);
    return rows.map((row) => this.mapTagRow(row));
  }

  async createTag(tag: { name: string; color?: string; description?: string }): Promise<Tag> {
    const normalizedName = this.normalizeTagNames([tag.name])[0];
    if (!normalizedName) throw new Error('Tag name cannot be empty');

    const existing = await this.getRow<DatabaseTagRow>('SELECT * FROM tags WHERE name = ?', [normalizedName]);
    if (existing) {
      return this.mapTagRow(existing);
    }

    const id = randomUUID();
    await this.run('INSERT INTO tags (id, name, color, description) VALUES (?, ?, ?, ?)', [
      id,
      normalizedName,
      tag.color ?? null,
      tag.description ?? null
    ]);

    const inserted = await this.getRow<DatabaseTagRow>('SELECT * FROM tags WHERE id = ?', [id]);
    if (!inserted) {
      throw new Error('Failed to create tag');
    }
    return this.mapTagRow(inserted);
  }

  async updateTag(id: string, updates: Partial<{ name: string; color?: string; description?: string }>): Promise<Tag> {
    if (!updates || Object.keys(updates).length === 0) {
      const existing = await this.getRow<DatabaseTagRow>('SELECT * FROM tags WHERE id = ?', [id]);
      if (!existing) throw new Error('Tag not found');
      return this.mapTagRow(existing);
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      const normalizedName = this.normalizeTagNames([updates.name])[0];
      if (!normalizedName) throw new Error('Tag name cannot be empty');
      fields.push('name = ?');
      values.push(normalizedName);
    }

    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color ?? null);
    }

    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description ?? null);
    }

    if (fields.length > 0) {
      await this.run(
        `UPDATE tags SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, id]
      );
    }

    const row = await this.getRow<DatabaseTagRow>('SELECT * FROM tags WHERE id = ?', [id]);
    if (!row) throw new Error('Tag not found');
    return this.mapTagRow(row);
  }

  async deleteTag(id: string): Promise<void> {
    await this.run('DELETE FROM tags WHERE id = ?', [id]);
  }

  async setEmojiTagsForEmoji(emojiId: string, tagNames: string[]): Promise<string[]> {
    return await this.setEmojiTagsInternal(emojiId, tagNames);
  }

  async getSavedSearches(): Promise<SavedSearch[]> {
    const rows = await this.allRows<{
      id: string;
      name: string;
      description: string | null;
      filters: string;
      is_default: number;
      icon: string | null;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM saved_searches ORDER BY name ASC', []);

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      filters: JSON.parse(row.filters),
      isDefault: Boolean(row.is_default),
      icon: row.icon || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async createSavedSearch(search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedSearch> {
    const id = randomUUID();
    const now = new Date();

    await this.run(
      `INSERT INTO saved_searches (id, name, description, filters, is_default, icon)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        search.name,
        search.description || null,
        JSON.stringify(search.filters),
        search.isDefault ? 1 : 0,
        search.icon || null
      ]
    );

    return {
      id,
      ...search,
      createdAt: now,
      updatedAt: now
    };
  }

  async updateSavedSearch(id: string, updates: Partial<Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description || null);
    }
    if (updates.filters !== undefined) {
      fields.push('filters = ?');
      values.push(JSON.stringify(updates.filters));
    }
    if (updates.isDefault !== undefined) {
      fields.push('is_default = ?');
      values.push(updates.isDefault ? 1 : 0);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon || null);
    }

    if (fields.length > 0) {
      await this.run(
        `UPDATE saved_searches SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, id]
      );
    }
  }

  async deleteSavedSearch(id: string): Promise<void> {
    await this.run('DELETE FROM saved_searches WHERE id = ?', [id]);
  }

  async getExportTemplates(): Promise<ExportTemplate[]> {
    const rows = await this.allRows<{
      id: string;
      name: string;
      description: string | null;
      config: string;
      is_default: number;
      icon: string | null;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM export_templates ORDER BY name ASC', []);

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      config: JSON.parse(row.config),
      isDefault: Boolean(row.is_default),
      icon: row.icon || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async createExportTemplate(template: Omit<ExportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExportTemplate> {
    const id = randomUUID();
    const now = new Date();

    await this.run(
      `INSERT INTO export_templates (id, name, description, config, is_default, icon)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        template.name,
        template.description || null,
        JSON.stringify(template.config),
        template.isDefault ? 1 : 0,
        template.icon || null
      ]
    );

    return {
      id,
      ...template,
      createdAt: now,
      updatedAt: now
    };
  }

  async updateExportTemplate(id: string, updates: Partial<Omit<ExportTemplate, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description || null);
    }
    if (updates.config !== undefined) {
      fields.push('config = ?');
      values.push(JSON.stringify(updates.config));
    }
    if (updates.isDefault !== undefined) {
      fields.push('is_default = ?');
      values.push(updates.isDefault ? 1 : 0);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon || null);
    }

    if (fields.length > 0) {
      await this.run(
        `UPDATE export_templates SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, id]
      );
    }
  }

  async deleteExportTemplate(id: string): Promise<void> {
    await this.run('DELETE FROM export_templates WHERE id = ?', [id]);
  }

  async getSetting(key: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT value FROM settings WHERE key = ?", [key], (err: Error | null, row: DatabaseSettingRow | undefined) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? JSON.parse(row.value) : null);
        }
      });
    });
  }

  async setSetting(key: string, value: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
        [key, JSON.stringify(value)],
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Wait for all pending operations to complete
      this.db.wait(() => {
        this.db.close((err) => {
          if (err) {
            reject(new Error(`Failed to close database: ${err.message}`));
          } else {
            resolve();
          }
        });
      });
    });
  }
}
