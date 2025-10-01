// After sign script for Electron Builder (macOS code signing)
module.exports = async function(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  console.log('Running after-sign script for macOS...');

  // Add notarization here if you have Apple Developer account
  // const { notarize } = require('electron-notarize');
  //
  // await notarize({
  //   appBundleId: context.packager.appInfo.id,
  //   appPath: context.appOutDir,
  //   appleId: process.env.APPLE_ID,
  //   appleIdPassword: process.env.APPLE_ID_PASSWORD,
  //   teamId: process.env.APPLE_TEAM_ID
  // });

  console.log('After-sign script completed.');
};