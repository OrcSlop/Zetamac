/**
 * electron-dev.cjs
 * Starts Vite, waits for it to be ready, then launches Electron.
 * This is more reliable than shell && chaining on Windows.
 */

const { spawn } = require('child_process');
const waitOn = require('wait-on');

const VITE_URL = 'http://localhost:5173';

console.log('[dev] Starting Vite...');
const vite = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    stdio: 'inherit',
    shell: true,
});

vite.on('error', (err) => {
    console.error('[dev] Failed to start Vite:', err);
    process.exit(1);
});

// Wait for Vite's HTTP server to be ready
waitOn({ resources: [VITE_URL], timeout: 30000, interval: 200 })
    .then(() => {
        console.log('[dev] Vite is ready. Launching Electron...');

        const electron = spawn('npx', ['electron', '.'], {
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, ELECTRON_START_URL: VITE_URL },
        });

        electron.on('error', (err) => {
            console.error('[dev] Failed to start Electron:', err);
        });

        // When the Electron window closes, kill Vite too
        electron.on('close', (code) => {
            console.log(`[dev] Electron exited (code ${code}). Stopping Vite.`);
            vite.kill();
            process.exit(code ?? 0);
        });
    })
    .catch((err) => {
        console.error('[dev] Timed out waiting for Vite:', err.message);
        vite.kill();
        process.exit(1);
    });

// If this process is killed, clean up Vite
process.on('SIGINT', () => { vite.kill(); process.exit(); });
process.on('SIGTERM', () => { vite.kill(); process.exit(); });
