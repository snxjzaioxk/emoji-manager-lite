import sqlite3 from 'sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { EmojiItem, Category, AppSettings, SearchFilters } from '../shared/types';

export class Database {
  private db: sqlite3.Database;
  private dbPath: string;

  constructor() {
    this.dbPath = join(app.getPath('userData'), 'emoji-manager.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.initialize();
  }

  private initialize(): void {
    this.db.serialize(() => {
      this.db.run(`
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
        CREATE INDEX IF NOT EXISTS idx_emojis_category ON emojis(category_id)
      `);

      this.db.run(`
        CREATE INDEX IF NOT EXISTS idx_emojis_tags ON emojis(tags)
      `);

      this.db.run(`
        CREATE INDEX IF NOT EXISTS idx_emojis_favorite ON emojis(is_favorite)
      `);

      this.initializeDefaultData();
    });
  }

  private initializeDefaultData(): void {
    this.db.get("SELECT COUNT(*) as count FROM categories", (err: Error | null, row: any) => {
      if (!err && row.count === 0) {
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
  }

  async getEmojis(filters?: SearchFilters): Promise<EmojiItem[]> {
    return new Promise((resolve, reject) => {
      let query = "SELECT * FROM emojis WHERE 1=1";
      const params: any[] = [];

      if (filters?.categoryId) {
        query += " AND category_id = ?";
        params.push(filters.categoryId);
      }

      if (filters?.keyword) {
        query += " AND (filename LIKE ? OR tags LIKE ?)";
        params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
      }

      if (filters?.isFavorite !== undefined) {
        query += " AND is_favorite = ?";
        params.push(filters.isFavorite);
      }

      // Sorting
      const sortMap: Record<string, string> = {
        updatedAt: 'updated_at',
        createdAt: 'created_at',
        usageCount: 'usage_count'
      };
      const sortByDb = filters?.sortBy ? sortMap[filters.sortBy] : 'updated_at';
      const sortOrder = (filters?.sortOrder === 'ASC' ? 'ASC' : 'DESC');
      query += ` ORDER BY ${sortByDb} ${sortOrder}`;

      // Limit
      if (typeof filters?.limit === 'number' && filters.limit > 0) {
        query += ` LIMIT ?`;
        params.push(filters.limit);
      }

      this.db.all(query, params, (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const emojis = rows.map(row => ({
            ...row,
            tags: row.tags ? JSON.parse(row.tags) : [],
            isFavorite: Boolean(row.is_favorite),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
          }));
          resolve(emojis);
        }
      });
    });
  }

  async addEmoji(emoji: Omit<EmojiItem, 'createdAt' | 'updatedAt'>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO emojis (
          id, filename, original_path, storage_path, format, size, width, height,
          tags, category_id, is_favorite, usage_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        emoji.id, emoji.filename, emoji.originalPath, emoji.storagePath,
        emoji.format, emoji.size, emoji.width, emoji.height,
        JSON.stringify(emoji.tags), emoji.categoryId, emoji.isFavorite, emoji.usageCount
      ], (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async updateEmoji(id: string, updates: Partial<EmojiItem>): Promise<void> {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates).filter(key => key !== 'id');
      const setClause = fields.map(field => {
        const dbField = field === 'isFavorite' ? 'is_favorite' : 
                       field === 'categoryId' ? 'category_id' :
                       field === 'usageCount' ? 'usage_count' :
                       field === 'originalPath' ? 'original_path' :
                       field === 'storagePath' ? 'storage_path' : field;
        return `${dbField} = ?`;
      }).join(', ');

      const values = fields.map(field => {
        const value = (updates as any)[field];
        return field === 'tags' ? JSON.stringify(value) : value;
      });

      this.db.run(
        `UPDATE emojis SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, id],
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async deleteEmoji(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM emojis WHERE id = ?", [id], (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getCategories(): Promise<Category[]> {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM categories ORDER BY name", (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const categories = rows.map(row => ({
            ...row,
            parentId: row.parent_id,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
          }));
          resolve(categories);
        }
      });
    });
  }

  async addCategory(category: Omit<Category, 'createdAt' | 'updatedAt'>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT INTO categories (id, name, description, color, parent_id) VALUES (?, ?, ?, ?, ?)",
        [category.id, category.name, category.description, category.color, category.parentId],
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async updateCategory(id: string, updates: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    return new Promise((resolve, reject) => {
      const allowed: Array<keyof typeof updates> = ['name', 'description', 'color', 'parentId'] as any;
      const fields = Object.keys(updates || {}).filter((k) => (allowed as any).includes(k));
      if (fields.length === 0) return resolve();

      const setClause = fields.map((field) => {
        const dbField = field === 'parentId' ? 'parent_id' : field;
        return `${dbField} = ?`;
      }).join(', ');

      const values = fields.map((field) => (updates as any)[field]);

      this.db.run(
        `UPDATE categories SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, id],
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async deleteCategory(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (['default', 'favorites', 'recent'].includes(id)) {
        return reject(new Error('Cannot delete built-in category'));
      }

      this.db.serialize(() => {
        this.db.run(
          `UPDATE emojis SET category_id = 'default', updated_at = CURRENT_TIMESTAMP WHERE category_id = ?`,
          [id],
          (err: Error | null) => {
            if (err) return reject(err);
            this.db.run(
              `DELETE FROM categories WHERE id = ?`,
              [id],
              (err2: Error | null) => {
                if (err2) reject(err2);
                else resolve();
              }
            );
          }
        );
      });
    });
  }

  async getSetting(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT value FROM settings WHERE key = ?", [key], (err: Error | null, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? JSON.parse(row.value) : null);
        }
      });
    });
  }

  async setSetting(key: string, value: any): Promise<void> {
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

  close(): void {
    this.db.close();
  }
}
