/* Simple dev bootstrap for Electron
 * - waits for dist/main/main.js to exist
 * - waits for Vite dev server on port 3000
 * - then launches Electron pointing to dist main entry
 */
const fs = require('fs');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');

// Match TypeScript outDir structure: dist/main + preserved src path (main/main.js)
const distMain = path.resolve(__dirname, '..', 'dist', 'main', 'main', 'main.js');
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

function waitForAnyPort(ports, host = '127.0.0.1', timeoutMs = 60000, intervalMs = 300) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryPorts = () => {
      const elapsed = Date.now() - start;
      if (elapsed > timeoutMs) return reject(new Error(`Timed out waiting for dev server on ${ports.join(', ')}`));

      let remaining = ports.length;
      let resolved = false;

      for (const p of ports) {
        const socket = new net.Socket();
        socket
          .once('connect', () => {
            if (!resolved) {
              resolved = true;
              socket.destroy();
              resolve(p);
            }
          })
          .once('error', () => {
            socket.destroy();
            remaining -= 1;
            if (remaining === 0 && !resolved) {
              setTimeout(tryPorts, intervalMs);
            }
          })
          .connect(p, host);
      }
    };
    tryPorts();
  });
}

(async () => {
  try {
    await waitForFile(distMain);
    // Vite defaults to 3000; allow fallback ports similar to main.ts
    const vitePort = Number(process.env.VITE_PORT) || undefined;
    await waitForAnyPort([vitePort || 3000, 3001, 3002, 3003]);

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
