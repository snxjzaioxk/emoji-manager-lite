// Ensure app icons exist before packaging. If missing, try to generate from assets/icon.png
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function exists(p) {
  try { fs.accessSync(p, fs.constants.F_OK); return true; } catch { return false; }
}

async function main() {
  const root = process.cwd();
  const ico = path.resolve(root, 'assets', 'icon.ico');
  const icns = path.resolve(root, 'assets', 'icon.icns');
  const iconsDir = path.resolve(root, 'assets', 'icons');
  const srcPng = path.resolve(root, 'assets', 'icon.png');

  const needIco = !exists(ico);
  const needIcns = !exists(icns);
  const needPngs = !exists(iconsDir) || fs.readdirSync(iconsDir).length === 0;

  if (!needIco && !needIcns && !needPngs) {
    console.log('[ensure:icons] All icon assets exist.');
    return;
  }

  if (!exists(srcPng)) {
    console.warn('[ensure:icons] Source PNG not found, generating a placeholder icon.png ...');
    try {
      const sharp = require('sharp');
      await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#007bff' } })
        .png()
        .toFile(srcPng);
      console.log('[ensure:icons] Placeholder assets/icon.png created.');
    } catch (e) {
      console.error('[ensure:icons] Failed to generate placeholder icon:', e.message);
      process.exit(1);
    }
  }

  console.log('[ensure:icons] Generating icons from assets/icon.png ...');
  const res = spawnSync(process.execPath, [path.resolve('scripts', 'generate-icons.js'), srcPng], {
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    console.error('[ensure:icons] Icon generation failed.');
    process.exit(res.status || 1);
  }
}

main().catch((e) => {
  console.error('[ensure:icons] Unexpected error:', e);
  process.exit(1);
});
