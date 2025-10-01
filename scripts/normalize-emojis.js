#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const sharp = require('sharp');
const {
  loadConfig,
  ensureDir,
  listImageFiles,
  hashFile,
  boolFromArgs
} = require('./emoji-sync-utils');

function getArgValue(args, flag, fallback) {
  const index = args.indexOf(flag);
  if (index >= 0 && index < args.length - 1) return args[index + 1];
  return fallback;
}

async function convertImage(sourcePath, targetPath, options) {
  const { targetFormat, maxDimension, quality } = options;
  let pipeline = sharp(sourcePath, { failOn: 'none' });
  if (maxDimension && Number.isFinite(maxDimension)) {
    pipeline = pipeline.resize({
      width: maxDimension,
      height: maxDimension,
      fit: 'inside',
      withoutEnlargement: true
    });
  }
  if (targetFormat) {
    const fmt = targetFormat.toLowerCase();
    if (fmt === 'png') pipeline = pipeline.png();
    else if (fmt === 'webp') pipeline = pipeline.webp({ quality: quality || 90 });
    else if (fmt === 'jpg' || fmt === 'jpeg') pipeline = pipeline.jpeg({ quality: quality || 90 });
    else throw new Error(`Unsupported target format: ${targetFormat}`);
  }
  await pipeline.toFile(targetPath);
}

async function run() {
  const args = process.argv.slice(2);
  const configPath = getArgValue(args, '--config', 'scripts/emoji-sync.config.json');
  const dryRun = boolFromArgs(args, 'dry-run', false);
  const force = boolFromArgs(args, 'force', false);
  const config = await loadConfig(configPath);

  await ensureDir(config.workspaceRoot);
  await ensureDir(config.cleanDir);

  const manifest = [];
  for (const platform of config.platforms) {
    const rawPlatformDir = path.join(config.rawDir, platform.name);
    const cleanPlatformDir = path.join(config.cleanDir, platform.name);
    if (!dryRun) await ensureDir(cleanPlatformDir);

    let existingNames = new Set();
    try {
      const present = await fsp.readdir(cleanPlatformDir);
      existingNames = new Set(present);
    } catch (_) {}

    const platformSeen = new Set();
    const images = await listImageFiles(rawPlatformDir);
    let processed = 0;
    let skippedDuplicates = 0;
    let skippedExisting = 0;

    for (const imagePath of images) {
      const hash = await hashFile(imagePath);
      const ext = config.normalization?.targetFormat
        ? `.${config.normalization.targetFormat.toLowerCase()}`
        : path.extname(imagePath).toLowerCase();
      const destName = `${platform.name}_${hash}${ext}`;
      const destPath = path.join(cleanPlatformDir, destName);

      if (!force && existingNames.has(destName)) {
        skippedExisting += 1;
        continue;
      }

      if (platformSeen.has(hash)) {
        skippedDuplicates += 1;
        continue;
      }

      if (dryRun) {
        platformSeen.add(hash);
        existingNames.add(destName);
        processed += 1;
        manifest.push({ platform: platform.name, hash, source: imagePath, output: destPath, dryRun: true });
        continue;
      }

      await ensureDir(path.dirname(destPath));
      if (config.normalization?.targetFormat || config.normalization?.maxDimension) {
        await convertImage(imagePath, destPath, config.normalization || {});
      } else {
        await fsp.copyFile(imagePath, destPath);
      }

      platformSeen.add(hash);
      existingNames.add(destName);
      processed += 1;
      manifest.push({ platform: platform.name, hash, source: imagePath, output: destPath });
    }

    console.log(`[normalize] ${platform.name}: processed ${processed}, skipped existing ${skippedExisting}, skipped duplicates ${skippedDuplicates}`);
  }

  if (!dryRun) {
    const manifestPath = path.join(config.cleanDir, 'manifest.json');
    await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`[normalize] manifest saved to ${manifestPath}`);
  }
}

run().catch((error) => {
  console.error('normalize-emojis failed:', error);
  process.exitCode = 1;
});
