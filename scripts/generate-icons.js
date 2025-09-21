/*
 Generate application icons for Windows/macOS/Linux from a single PNG source.

 Usage:
   node scripts/generate-icons.js <source.png>

 Defaults:
   - Source: assets/icon.png
   - Outputs:
       assets/icon.ico
       assets/icon.icns
       assets/icons/{16,24,32,48,64,128,256,512}.png
*/

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function fileExists(p) {
  try {
    await fs.promises.access(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function generatePngSizes(src, outDir, sizes) {
  await ensureDir(outDir);
  for (const size of sizes) {
    const outPath = path.join(outDir, `${size}x${size}.png`);
    await sharp(src)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(outPath);
    console.log(`[icons] PNG ${size}x${size} -> ${path.relative(process.cwd(), outPath)}`);
  }
}

async function generateIco(src, outIco, sizes) {
  try {
    const pngToIco = require('png-to-ico');
    const buffers = [];
    for (const size of sizes) {
      const buf = await sharp(src).resize(size, size, { fit: 'cover' }).png().toBuffer();
      buffers.push(buf);
    }
    const ico = await pngToIco(buffers);
    await fs.promises.writeFile(outIco, ico);
    console.log(`[icons] ICO -> ${path.relative(process.cwd(), outIco)}`);
  } catch (err) {
    console.warn('[icons] Skipped ICO generation:', err.message);
  }
}

async function generateIcns(src, outDir) {
  try {
    const iconGen = require('icon-gen');
    const res = await iconGen(src, path.dirname(outDir), {
      report: false,
      modes: ['icns'],
      names: { icns: path.basename(outDir, '.icns') },
      icns: { compress: true },
    });
    if (Array.isArray(res)) {
      console.log(`[icons] ICNS -> ${path.relative(process.cwd(), outDir)}`);
    }
  } catch (err) {
    console.warn('[icons] Skipped ICNS generation:', err.message);
  }
}

(async () => {
  const src = process.argv[2] || path.resolve('assets', 'icon.png');
  if (!(await fileExists(src))) {
    console.error(`[icons] Source not found: ${src}`);
    process.exit(1);
  }

  const outIconsDir = path.resolve('assets', 'icons');
  const outIco = path.resolve('assets', 'icon.ico');
  const outIcns = path.resolve('assets', 'icon.icns');

  const linuxSizes = [16, 24, 32, 48, 64, 128, 256, 512];
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];

  await generatePngSizes(src, outIconsDir, linuxSizes);
  await generateIco(src, outIco, icoSizes);
  await generateIcns(src, outIcns);

  console.log('[icons] Done.');
})();

