import { promises as fs } from 'fs';
import { join, resolve, basename, extname } from 'path';
import { homedir } from 'os';
import { app } from 'electron';
import { randomUUID, createHash } from 'crypto';
import { FileManager } from './fileManager';
import { Database } from './database';
import {
  ScannerDetectedSource,
  ScannerConfig,
  ScannerRunOptions,
  ScannerRunResult,
  ScannerFileRecord
} from '../shared/types';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']);
const SPECIAL_EXTENSIONS = new Set(['.dat', '.tmp', '.rdb', '']);
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB per file upper bound
const MAX_SCAN_FILES = 5000;
const DECODE_MAX_SIZE = 12 * 1024 * 1024;

interface PreparedAsset {
  platform: string;
  originalPath: string;
  preparedPath: string;
  record: ScannerFileRecord;
}

interface SignatureDefinition {
  ext: string;
  bytes: number[];
  offset?: number;
}

const DECODE_SIGNATURES: SignatureDefinition[] = [
  { ext: '.png', bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { ext: '.gif', bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] },
  { ext: '.gif', bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] },
  { ext: '.jpg', bytes: [0xFF, 0xD8, 0xFF] },
  { ext: '.webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }
];

const PLATFORM_LABELS: Record<string, { name: string; color: string }> = {
  wechat: { name: '微信', color: '#07C160' },
  qq: { name: 'QQ', color: '#0099FF' },
  douyin: { name: '抖音', color: '#FF0050' },
  telegram: { name: 'Telegram', color: '#0088CC' },
  discord: { name: 'Discord', color: '#5865F2' },
  slack: { name: 'Slack', color: '#4A154B' },
  teams: { name: 'Teams', color: '#6264A7' },
  browser: { name: '浏览器', color: '#8C54FF' },
  custom: { name: '自定义', color: '#6c757d' }
};

async function ensureDir(path: string): Promise<void> {
  await fs.mkdir(path, { recursive: true });
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

function normalizePath(target: string): string {
  return resolve(target);
}

export class EmojiScanner {
  constructor(private database: Database, private fileManager: FileManager) {}

  async detectSources(): Promise<ScannerDetectedSource[]> {
    const config = await this.getConfig();
    const overrides = config.sourceOverrides ?? {};
    const candidates = this.buildDefaultCandidates();
    const detected: ScannerDetectedSource[] = [];

    for (const candidate of candidates) {
      const overridePath = overrides[candidate.id];
      const effectivePath = overridePath ? normalizePath(overridePath) : candidate.path;
      const normalized = normalizePath(effectivePath);
      const exists = await pathExists(normalized);
      let lastModified: string | undefined;
      if (exists) {
        try {
          const stat = await fs.stat(normalized);
          lastModified = stat.mtime.toISOString();
        } catch {
          lastModified = undefined;
        }
      }

      detected.push({
        id: candidate.id,
        platform: candidate.platform,
        label: candidate.label,
        description: candidate.description,
        path: normalized,
        exists,
        recommended: candidate.recommended,
        lastModified,
        defaultPath: normalizePath(candidate.path),
        isOverride: Boolean(overridePath)
      });
    }

    return detected;
  }

  async getConfig(): Promise<ScannerConfig> {
    const raw = await this.database.getSetting('scannerConfig');
    const defaults: ScannerConfig = {
      enabledSources: [],
      customPaths: [],
      autoScanOnLaunch: false,
      targetCategoryMap: {
        wechat: 'wechat',
        qq: 'qq',
        douyin: 'douyin',
        telegram: 'telegram',
        discord: 'discord',
        slack: 'slack',
        teams: 'teams',
        browser: 'browser',
        custom: 'custom'
      },
      sourceOverrides: {},
      mergeIntoDefaultCategory: true,
      autoTagPlatform: false
    };

    if (!raw || typeof raw !== 'object') {
      return defaults;
    }

    return {
      ...defaults,
      ...(raw as Partial<ScannerConfig>)
    };
  }

  async saveConfig(partial: Partial<ScannerConfig>): Promise<ScannerConfig> {
    const current = await this.getConfig();
    let currentOverrides = { ...(current.sourceOverrides ?? {}) };
    if (partial.sourceOverrides !== undefined) {
      currentOverrides = {};
      for (const [key, value] of Object.entries(partial.sourceOverrides)) {
        if (value) {
          currentOverrides[key] = normalizePath(value);
        }
      }
    }

    const next: ScannerConfig = {
      ...current,
      ...partial,
      enabledSources: Array.from(new Set(partial.enabledSources ?? current.enabledSources)),
      customPaths: Array.from(new Set((partial.customPaths ?? current.customPaths).map(normalizePath))),
      targetCategoryMap: {
        ...current.targetCategoryMap,
        ...(partial.targetCategoryMap ?? {})
      },
      sourceOverrides: currentOverrides,
      mergeIntoDefaultCategory: partial.mergeIntoDefaultCategory ?? current.mergeIntoDefaultCategory ?? false,
      autoTagPlatform: partial.autoTagPlatform ?? current.autoTagPlatform ?? false
    };

    await this.database.setSetting('scannerConfig', next);
    return next;
  }

  async runScan(options: ScannerRunOptions): Promise<ScannerRunResult> {
    const config = await this.getConfig();
    const detected = await this.detectSources();
    const records: ScannerFileRecord[] = [];
    const selectedPaths: Array<{ path: string; platform: string }> = [];

    const ids = new Set(options.sourceIds || []);
    const additionalPaths = options.additionalPaths?.map(normalizePath) ?? [];

    for (const source of detected) {
      if (ids.has(source.id) && source.exists) {
        selectedPaths.push({ path: source.path, platform: source.platform });
      }
    }

    for (const customPath of config.customPaths) {
      if (await pathExists(customPath)) {
        selectedPaths.push({ path: customPath, platform: 'custom' });
      }
    }

    for (const additional of additionalPaths) {
      if (await pathExists(additional)) {
        selectedPaths.push({ path: additional, platform: 'custom' });
      } else {
        records.push({
          originalPath: additional,
          status: 'failed',
          reason: '路径不存在'
        });
      }
    }

    if (selectedPaths.length === 0) {
      return {
        totalFound: 0,
        imported: 0,
        skipped: records.length,
        duplicates: 0,
        failed: records.length,
        records
      };
    }

    const tempRoot = await fs.mkdtemp(join(app.getPath('temp'), 'emoji-scan-'));
    const preparedPerPlatform = new Map<string, PreparedAsset[]>();
    let totalFound = 0;
    let duplicates = 0;
    let skipped = 0;
    let failed = 0;
    const shouldSkipDuplicates = options.skipDuplicates !== false;
    const shouldTagPlatform = options.autoTagPlatform ?? (config.autoTagPlatform ?? false);
    const mergeAll = config.mergeIntoDefaultCategory ?? false;

    try {
      for (const entry of selectedPaths) {
        const assets = await this.collectAssets(entry.path, entry.platform, tempRoot, records, shouldSkipDuplicates);
        totalFound += assets.total;
        duplicates += assets.duplicates;
        skipped += assets.skipped;
        failed += assets.failed;

        if (assets.prepared.length > 0) {
          const existing = preparedPerPlatform.get(entry.platform) ?? [];
          preparedPerPlatform.set(entry.platform, existing.concat(assets.prepared));
        }
      }

      let imported = 0;
      for (const [platform, assets] of preparedPerPlatform.entries()) {
        const preferredCategory = mergeAll
          ? 'default'
          : options.targetCategory
            || config.targetCategoryMap[platform]
            || config.targetCategoryMap.custom
            || 'default';

        if (preferredCategory !== 'default') {
          await this.ensureCategory(platform, preferredCategory);
        }

        const filePaths = assets.map((asset) => asset.preparedPath);
        const extraTags = shouldTagPlatform ? [platform] : [];

        const result = await this.fileManager.importFromPreparedFiles(filePaths, {
          targetCategory: preferredCategory,
          skipDuplicates: false,
          autoGenerateTags: true,
          extraTags
        });

        imported += result.success;

        if (result.failed > 0) {
          failed += result.failed;
        }
      }

      await this.saveConfig({ lastScanAt: new Date().toISOString() });

      return {
        totalFound,
        imported,
        skipped,
        duplicates,
        failed,
        records
      };
    } finally {
      await this.cleanupTemp(tempRoot);
    }
  }

  private buildDefaultCandidates(): Array<{
    id: string;
    platform: string;
    label: string;
    description?: string;
    path: string;
    recommended: boolean;
  }> {
    const result: Array<{
      id: string;
      platform: string;
      label: string;
      description?: string;
      path: string;
      recommended: boolean;
    }> = [];

    const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');

    const entries = [
      {
        id: 'wechat-appdata',
        platform: 'wechat',
        label: '微信缓存目录',
        description: '默认聊天资源位置',
        path: join(appData, 'Tencent', 'WeChat', 'WeChat Files'),
        recommended: true
      },
      {
        id: 'wechat-documents',
        platform: 'wechat',
        label: '微信文档目录',
        description: '部分版本存储在文档目录',
        path: join(homedir(), 'Documents', 'WeChat Files'),
        recommended: false
      },
      {
        id: 'qq-appdata',
        platform: 'qq',
        label: 'QQ 缓存目录',
        description: '包含好友/群图片缓存',
        path: join(appData, 'Tencent', 'QQ'),
        recommended: true
      },
      {
        id: 'qq-documents',
        platform: 'qq',
        label: 'QQ 公共文件夹',
        description: '公共文档中的 QQ 表情',
        path: join(homedir(), 'Documents', 'Tencent Files'),
        recommended: false
      },
      {
        id: 'douyin-cache',
        platform: 'douyin',
        label: '抖音缓存目录',
        description: 'Douyin PC 版默认缓存',
        path: join(localAppData, 'Douyin', 'livecache'),
        recommended: false
      },
      {
        id: 'telegram-desktop',
        platform: 'telegram',
        label: 'Telegram Desktop',
        description: 'Telegram 桌面版缓存目录',
        path: join(appData, 'Telegram Desktop', 'tdata'),
        recommended: true
      },
      {
        id: 'discord-cache',
        platform: 'discord',
        label: 'Discord 缓存',
        description: 'Discord 表情和图片缓存',
        path: join(appData, 'discord', 'Cache'),
        recommended: true
      },
      {
        id: 'discord-local',
        platform: 'discord',
        label: 'Discord 本地存储',
        description: 'Discord 本地存储目录',
        path: join(localAppData, 'Discord', 'Cache'),
        recommended: false
      },
      {
        id: 'slack-cache',
        platform: 'slack',
        label: 'Slack 缓存',
        description: 'Slack 表情和图片缓存',
        path: join(localAppData, 'Slack', 'Cache'),
        recommended: true
      },
      {
        id: 'teams-cache',
        platform: 'teams',
        label: 'Microsoft Teams',
        description: 'Teams 表情和贴纸缓存',
        path: join(appData, 'Microsoft', 'Teams', 'Cache'),
        recommended: true
      },
      {
        id: 'teams-backgrounds',
        platform: 'teams',
        label: 'Teams 背景图片',
        description: 'Teams 自定义背景图片',
        path: join(appData, 'Microsoft', 'Teams', 'Backgrounds'),
        recommended: false
      },
      {
        id: 'browser-downloads',
        platform: 'browser',
        label: '浏览器下载目录',
        description: '常见的下载保存位置',
        path: join(homedir(), 'Downloads'),
        recommended: false
      },
      {
        id: 'browser-chrome-cache',
        platform: 'browser',
        label: 'Chrome 缓存',
        description: 'Chrome 浏览器图片缓存',
        path: join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
        recommended: false
      },
      {
        id: 'browser-edge-cache',
        platform: 'browser',
        label: 'Edge 缓存',
        description: 'Edge 浏览器图片缓存',
        path: join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
        recommended: false
      }
    ];

    return result.concat(entries);
  }

  private async collectAssets(
    root: string,
    platform: string,
    tempRoot: string,
    records: ScannerFileRecord[],
    shouldSkipDuplicates: boolean
  ): Promise<{ prepared: PreparedAsset[]; total: number; duplicates: number; skipped: number; failed: number }> {
    const stack: string[] = [root];
    const prepared: PreparedAsset[] = [];
    let total = 0;
    let duplicates = 0;
    let skipped = 0;
    let failed = 0;

    while (stack.length > 0) {
      if (total >= MAX_SCAN_FILES) {
        break;
      }
      const current = stack.pop();
      if (!current) continue;

      let stats;
      try {
        stats = await fs.stat(current);
      } catch {
        records.push({ originalPath: current, status: 'failed', reason: '无法读取路径' });
        failed++;
        continue;
      }

      if (stats.isDirectory()) {
        let entries: string[] = [];
        try {
          entries = await fs.readdir(current);
        } catch {
          records.push({ originalPath: current, status: 'failed', reason: '目录不可访问' });
          failed++;
          continue;
        }
        for (const entry of entries) {
          stack.push(join(current, entry));
        }
        continue;
      }

      if (!stats.isFile()) continue;
      if (stats.size === 0 || stats.size > MAX_FILE_SIZE) {
        records.push({ originalPath: current, status: 'skipped', reason: '文件大小不匹配', platform });
        skipped++;
        continue;
      }

      total++;
      const ext = extname(current).toLowerCase();

      if (IMAGE_EXTENSIONS.has(ext)) {
        const asset = await this.prepareCopy(current, ext, platform, tempRoot, records);
        if (!asset) {
          failed++;
          continue;
        }

        if (shouldSkipDuplicates && await this.fileManager.isDuplicate(asset.preparedPath)) {
          asset.record.status = 'skipped';
          asset.record.reason = '已存在相同文件';
          duplicates++;
          skipped++;
          continue;
        }

        prepared.push(asset);
        continue;
      }

      if (SPECIAL_EXTENSIONS.has(ext)) {
        const decoded = await this.tryDecodeSpecial(current);
        if (!decoded) {
          records.push({ originalPath: current, status: 'skipped', reason: '无法识别的缓存格式', platform });
          skipped++;
          continue;
        }

        const asset = await this.prepareDecoded(current, decoded.data, decoded.ext, platform, tempRoot, records);
        if (!asset) {
          failed++;
          continue;
        }

        if (shouldSkipDuplicates && await this.fileManager.isDuplicate(asset.preparedPath)) {
          asset.record.status = 'skipped';
          asset.record.reason = '已存在相同文件';
          duplicates++;
          skipped++;
          continue;
        }

        prepared.push(asset);
        continue;
      }

      records.push({ originalPath: current, status: 'skipped', reason: '不支持的文件类型', platform });
      skipped++;
    }

    return { prepared, total, duplicates, skipped, failed };
  }

  private async prepareCopy(
    originalPath: string,
    ext: string,
    platform: string,
    tempRoot: string,
    records: ScannerFileRecord[]
  ): Promise<PreparedAsset | null> {
    try {
      const targetDir = join(tempRoot, platform, randomUUID());
      await ensureDir(targetDir);
      const targetPath = join(targetDir, basename(originalPath));
      await fs.copyFile(originalPath, targetPath);
      const record: ScannerFileRecord = {
        originalPath,
        outputPath: targetPath,
        status: 'copied',
        platform
      };
      records.push(record);
      return { platform, originalPath, preparedPath: targetPath, record };
    } catch (error) {
      records.push({ originalPath, status: 'failed', reason: '复制失败', platform });
      return null;
    }
  }

  private async prepareDecoded(
    originalPath: string,
    data: Buffer,
    ext: string,
    platform: string,
    tempRoot: string,
    records: ScannerFileRecord[]
  ): Promise<PreparedAsset | null> {
    try {
      const targetDir = join(tempRoot, platform, randomUUID());
      await ensureDir(targetDir);
      const base = basename(originalPath, extname(originalPath));
      const filename = `${base || createHash('md5').update(originalPath).digest('hex')}${ext}`;
      const targetPath = join(targetDir, filename);
      await fs.writeFile(targetPath, data);
      const record: ScannerFileRecord = {
        originalPath,
        outputPath: targetPath,
        status: 'decoded',
        platform
      };
      records.push(record);
      return { platform, originalPath, preparedPath: targetPath, record };
    } catch (error) {
      records.push({ originalPath, status: 'failed', reason: '解码缓存失败', platform });
      return null;
    }
  }

  private async tryDecodeSpecial(filePath: string): Promise<{ data: Buffer; ext: string } | null> {
    try {
      const content = await fs.readFile(filePath);
      if (content.length === 0 || content.length > DECODE_MAX_SIZE) {
        return null;
      }

      for (const signature of DECODE_SIGNATURES) {
        if (content.length <= (signature.offset ?? 0)) continue;
        const offset = signature.offset ?? 0;
        if (content.length < offset + signature.bytes.length) continue;
        const key = content[offset] ^ signature.bytes[0];
        let matched = true;
        for (let i = 0; i < signature.bytes.length; i++) {
          if ((content[offset + i] ^ key) !== signature.bytes[i]) {
            matched = false;
            break;
          }
        }

        if (!matched) continue;

        const decoded = Buffer.allocUnsafe(content.length);
        for (let i = 0; i < content.length; i++) {
          decoded[i] = content[i] ^ key;
        }

        return { data: decoded, ext: signature.ext };
      }

      return null;
    } catch {
      return null;
    }
  }

  private async ensureCategory(platform: string, categoryId: string): Promise<void> {
    const categories = await this.database.getCategories();
    if (categories.some((cat) => cat.id === categoryId)) {
      return;
    }

    const label = PLATFORM_LABELS[platform]?.name ?? PLATFORM_LABELS.custom.name;
    const color = PLATFORM_LABELS[platform]?.color ?? PLATFORM_LABELS.custom.color;

    await this.database.addCategory({
      id: categoryId,
      name: label,
      description: `${label} 自动扫描`,
      color,
      parentId: undefined
    });
  }

  private async cleanupTemp(tempRoot: string): Promise<void> {
    try {
      await fs.rm(tempRoot, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}
