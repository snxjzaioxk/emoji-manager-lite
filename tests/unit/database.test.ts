import { Database } from '../../src/main/database';
import { EmojiItem, Category, Tag } from '../../src/shared/types';

describe('Database', () => {
  let db: Database;

  beforeEach(() => {
    // Use in-memory database for testing
    db = new Database();
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Categories', () => {
    test('should create a new category', async () => {
      const category: Omit<Category, 'createdAt' | 'updatedAt'> = {
        id: 'test-category',
        name: 'Test Category',
        description: 'A test category'
      };

      await db.addCategory(category);
      const categories = await db.getCategories();

      expect(categories.find(c => c.id === 'test-category')).toBeDefined();
    });

    test('should update a category', async () => {
      const category: Omit<Category, 'createdAt' | 'updatedAt'> = {
        id: 'test-category',
        name: 'Test Category'
      };

      await db.addCategory(category);
      await db.updateCategory('test-category', { name: 'Updated Category' });

      const categories = await db.getCategories();
      const updated = categories.find(c => c.id === 'test-category');

      expect(updated?.name).toBe('Updated Category');
    });

    test('should delete a non-built-in category', async () => {
      const category: Omit<Category, 'createdAt' | 'updatedAt'> = {
        id: 'test-category',
        name: 'Test Category'
      };

      await db.addCategory(category);
      await db.deleteCategory('test-category');

      const categories = await db.getCategories();
      expect(categories.find(c => c.id === 'test-category')).toBeUndefined();
    });

    test('should not delete built-in categories', async () => {
      await expect(db.deleteCategory('default')).rejects.toThrow();
      await expect(db.deleteCategory('favorites')).rejects.toThrow();
      await expect(db.deleteCategory('recent')).rejects.toThrow();
    });
  });

  describe('Tags', () => {
    test('should create a new tag', async () => {
      const tag = await db.createTag({
        name: 'test-tag',
        color: '#FF0000'
      });

      expect(tag.name).toBe('test-tag');
      expect(tag.color).toBe('#FF0000');
    });

    test('should normalize tag names', async () => {
      const tag1 = await db.createTag({ name: 'TestTag' });
      const tag2 = await db.createTag({ name: 'testtag' });

      // Should return the same tag (case-insensitive)
      expect(tag1.id).toBe(tag2.id);
    });

    test('should update a tag', async () => {
      const tag = await db.createTag({ name: 'test-tag' });
      const updated = await db.updateTag(tag.id, {
        name: 'updated-tag',
        color: '#00FF00'
      });

      expect(updated.name).toBe('updated-tag');
      expect(updated.color).toBe('#00FF00');
    });

    test('should delete a tag', async () => {
      const tag = await db.createTag({ name: 'test-tag' });
      await db.deleteTag(tag.id);

      const tags = await db.getTags();
      expect(tags.find(t => t.id === tag.id)).toBeUndefined();
    });
  });

  describe('Emojis', () => {
    test('should add an emoji', async () => {
      const emoji: Omit<EmojiItem, 'createdAt' | 'updatedAt'> = {
        id: 'test-emoji',
        filename: 'test.png',
        originalPath: '/path/to/test.png',
        storagePath: '/storage/test.png',
        format: 'png',
        size: 1024,
        width: 100,
        height: 100,
        tags: ['test'],
        categoryId: 'default',
        isFavorite: false,
        usageCount: 0
      };

      await db.addEmoji(emoji);
      const retrieved = await db.getEmoji('test-emoji');

      expect(retrieved).toBeDefined();
      expect(retrieved?.filename).toBe('test.png');
    });

    test('should update an emoji', async () => {
      const emoji: Omit<EmojiItem, 'createdAt' | 'updatedAt'> = {
        id: 'test-emoji',
        filename: 'test.png',
        originalPath: '/path/to/test.png',
        storagePath: '/storage/test.png',
        format: 'png',
        size: 1024,
        width: 100,
        height: 100,
        tags: [],
        categoryId: 'default',
        isFavorite: false,
        usageCount: 0
      };

      await db.addEmoji(emoji);
      await db.updateEmoji('test-emoji', {
        isFavorite: true,
        usageCount: 5
      });

      const updated = await db.getEmoji('test-emoji');
      expect(updated?.isFavorite).toBe(true);
      expect(updated?.usageCount).toBe(5);
    });

    test('should delete an emoji', async () => {
      const emoji: Omit<EmojiItem, 'createdAt' | 'updatedAt'> = {
        id: 'test-emoji',
        filename: 'test.png',
        originalPath: '/path/to/test.png',
        storagePath: '/storage/test.png',
        format: 'png',
        size: 1024,
        width: 100,
        height: 100,
        tags: [],
        categoryId: 'default',
        isFavorite: false,
        usageCount: 0
      };

      await db.addEmoji(emoji);
      await db.deleteEmoji('test-emoji');

      const retrieved = await db.getEmoji('test-emoji');
      expect(retrieved).toBeNull();
    });

    test('should search emojis by keyword', async () => {
      const emoji1: Omit<EmojiItem, 'createdAt' | 'updatedAt'> = {
        id: 'emoji-1',
        filename: 'smile.png',
        originalPath: '/path/smile.png',
        storagePath: '/storage/smile.png',
        format: 'png',
        size: 1024,
        width: 100,
        height: 100,
        tags: ['happy'],
        categoryId: 'default',
        isFavorite: false,
        usageCount: 0
      };

      const emoji2: Omit<EmojiItem, 'createdAt' | 'updatedAt'> = {
        id: 'emoji-2',
        filename: 'sad.png',
        originalPath: '/path/sad.png',
        storagePath: '/storage/sad.png',
        format: 'png',
        size: 1024,
        width: 100,
        height: 100,
        tags: ['sad'],
        categoryId: 'default',
        isFavorite: false,
        usageCount: 0
      };

      await db.addEmoji(emoji1);
      await db.addEmoji(emoji2);

      const results = await db.getEmojis({ keyword: 'smile' });
      expect(results.length).toBe(1);
      expect(results[0].filename).toBe('smile.png');
    });

    test('should filter emojis by category', async () => {
      const category: Omit<Category, 'createdAt' | 'updatedAt'> = {
        id: 'custom',
        name: 'Custom'
      };

      await db.addCategory(category);

      const emoji: Omit<EmojiItem, 'createdAt' | 'updatedAt'> = {
        id: 'test-emoji',
        filename: 'test.png',
        originalPath: '/path/test.png',
        storagePath: '/storage/test.png',
        format: 'png',
        size: 1024,
        width: 100,
        height: 100,
        tags: [],
        categoryId: 'custom',
        isFavorite: false,
        usageCount: 0
      };

      await db.addEmoji(emoji);

      const results = await db.getEmojis({ categoryId: 'custom' });
      expect(results.length).toBe(1);
      expect(results[0].categoryId).toBe('custom');
    });
  });

  describe('Settings', () => {
    test('should save and retrieve settings', async () => {
      await db.setSetting('testKey', 'testValue');
      const value = await db.getSetting('testKey');

      expect(value).toBe('testValue');
    });

    test('should save complex objects', async () => {
      const settings = {
        theme: 'dark',
        viewMode: 'grid',
        thumbnailSize: 'large'
      };

      await db.setSetting('appSettings', settings);
      const retrieved = await db.getSetting('appSettings');

      expect(retrieved).toEqual(settings);
    });
  });
});