#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const {
  loadConfig,
  ensureDir,
  listImageFiles,
  timestampSlug,
  boolFromArgs
} = require('./emoji-sync-utils');

function getArgValue(args, flag, fallback) {
  const index = args.indexOf(flag);
  if (index >= 0 && index < args.length - 1) return args[index + 1];
  return fallback;
}

async function copyUnique(src, destDir, reservedNames) {
  const baseName = path.basename(src);
  const ext = path.extname(baseName);
  const nameOnly = baseName.slice(0, baseName.length - ext.length);
  let candidate = baseName;
  let counter = 1;
  while (reservedNames.has(candidate)) {
    candidate = `${nameOnly}_${counter}${ext}`;
    counter += 1;
  }
  reservedNames.add(candidate);
  const destPath = path.join(destDir, candidate);
  await fsp.copyFile(src, destPath);
  return destPath;
}

async function run() {
  const args = process.argv.slice(2);
  const configPath = getArgValue(args, '--config', 'scripts/emoji-sync.config.json');
  const dryRun = boolFromArgs(args, 'dry-run', false);
  const stamp = timestampSlug();
  const config = await loadConfig(configPath);

  const summary = [];
  await ensureDir(config.workspaceRoot);
  await ensureDir(config.rawDir);

  for (const platform of config.platforms) {
    const batchDir = path.join(config.rawDir, platform.name, stamp);
    const reserved = new Set();
    if (!dryRun) await ensureDir(batchDir);

    const collected = [];
    for (const sourcePath of platform.sources) {
      const files = await listImageFiles(sourcePath);
      for (const file of files) {
        collected.push({ file, sourcePath });
      }
    }

    for (const item of collected) {
      if (dryRun) {
        reserved.add(path.basename(item.file));
        continue;
      }
      await copyUnique(item.file, batchDir, reserved);
    }

    summary.push({
      platform: platform.name,
      sources: platform.sources,
      batchDir,
      count: collected.length,
      dryRun
    });
  }

  summary.forEach((entry) => {
    console.log(`[collect] ${entry.platform}: ${entry.count} file(s) from ${entry.sources.length} source(s)`);
    if (entry.dryRun) console.log(`          dry-run -> planned target ${entry.batchDir}`);
    else console.log(`          saved to ${entry.batchDir}`);
  });
}

run().catch((error) => {
  console.error('collect-emojis failed:', error);
  process.exitCode = 1;
});
