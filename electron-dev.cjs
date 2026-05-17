/**
 * electron-dev.cjs
 * Starts Vite, waits for it to be ready, then launches Electron.
 * This is more reliable than shell && chaining on Windows.
 */

const { spawn } = require('child_process');
const waitOn = require('wait-on');

const VITE_URL = 'http://127.0.0.1:5173';

console.log('[dev] Starting Vite...');
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const vite = spawn(npxCmd, ['vite', '--port', '5173', '--strictPort'], {
    stdio: 'inherit',
    shell: true,
});

vite.on('error', (err) => {
    console.error('[dev] Failed to start Vite:', err);
    process.exit(1);
});

// Wait for Vite's HTTP server to be ready
waitOn({ resources: [VITE_URL], timeout: 30000, interval: 200 })
    .then(async () => {
        console.log(`[dev] Vite is ready. Waiting 1s for stability...`);
        await new Promise(r => setTimeout(r, 1000));
        console.log(`[dev] Launching Electron with URL: ${VITE_URL}`);
        console.log(`[dev] (Note: main.cjs will force 127.0.0.1 if it receives localhost)`);

        const electron = spawn(npxCmd, ['electron', '.'], {
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
