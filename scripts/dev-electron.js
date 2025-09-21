/* Simple dev bootstrap for Electron
 * - waits for dist/main/main.js to exist
 * - waits for Vite dev server on port 3000
 * - then launches Electron pointing to dist main entry
 */
const fs = require('fs');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');

const distMain = path.resolve(__dirname, '..', 'dist', 'main', 'main.js');
const electronBin = require('electron');

function waitForFile(filePath, timeoutMs = 60000, intervalMs = 250) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (fs.existsSync(filePath)) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error(`Timed out waiting for file: ${filePath}`));
      }
    }, intervalMs);
  });
}

function waitForPort(port, host = '127.0.0.1', timeoutMs = 60000, intervalMs = 300) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = new net.Socket();
      socket
        .once('connect', () => {
          socket.destroy();
          resolve();
        })
        .once('error', () => {
          socket.destroy();
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Timed out waiting for port ${port}`));
          } else {
            setTimeout(tryConnect, intervalMs);
          }
        })
        .connect(port, host);
    };
    tryConnect();
  });
}

(async () => {
  try {
    await Promise.all([
      waitForFile(distMain),
      waitForPort(3000),
    ]);

    const child = spawn(electronBin, [distMain], {
      stdio: 'inherit',
      env: {
        ...process.env,
      },
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  } catch (err) {
    console.error(`[dev-electron] ${err.message}`);
    process.exit(1);
  }
})();

