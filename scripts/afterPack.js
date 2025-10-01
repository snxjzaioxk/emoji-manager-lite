// After pack script for Electron Builder
const fs = require('fs');
const path = require('path');

module.exports = async function(context) {
  console.log('Running after-pack script...');

  const { appOutDir, electronPlatformName, packager } = context;

  // Remove unnecessary files to reduce size
  const filesToRemove = [
    'LICENSES.chromium.html',
    'd3dcompiler_47.dll',
    'ffmpeg.dll',
    'libGLESv2.dll',
    'libEGL.dll',
    'swiftshader',
    'vulkan-1.dll',
    'vk_swiftshader.dll'
  ];

  for (const file of filesToRemove) {
    const filePath = path.join(appOutDir, file);
    if (fs.existsSync(filePath)) {
      try {
        if (fs.lstatSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
        console.log(`Removed: ${file}`);
      } catch (error) {
        console.warn(`Failed to remove ${file}:`, error.message);
      }
    }
  }

  // Create version file
  const versionInfo = {
    version: packager.appInfo.version,
    buildDate: new Date().toISOString(),
    platform: electronPlatformName
  };

  const versionPath = path.join(appOutDir, 'resources', 'version.json');
  fs.mkdirSync(path.dirname(versionPath), { recursive: true });
  fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));

  console.log('After-pack script completed.');
};