const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('[main] Electron main process starting...');
console.log('[main] __dirname:', __dirname);

function createWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 700,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),  // Loads our bridge
            contextIsolation: true,  // Keeps Vite and Electron safely separated
            nodeIntegration: false
        }
    });

    // Tip: Uncomment the line below if you ever need to see the console for errors!
    // win.webContents.openDevTools();

    const isDev = process.env.ELECTRON_START_URL || !require('fs').existsSync(path.join(__dirname, 'dist', 'index.html'));
    console.log('[main] isDev:', !!isDev);
    let startUrl = isDev
        ? (process.env.ELECTRON_START_URL || 'http://127.0.0.1:5173')
        : `file://${path.join(__dirname, './dist/index.html')}`;

    if (isDev && startUrl.includes('localhost')) {
        startUrl = startUrl.replace('localhost', '127.0.0.1');
    }

    console.log('[main] Loading URL:', startUrl);
    win.loadURL(startUrl);
}

// Listen for React asking us to save a file
ipcMain.on('save-csv', (event, filename, content) => {
    try {
        const docsPath = path.join(os.homedir(), 'Documents', 'ZetamacResults');

        // Create the folder if it doesn't exist
        if (!fs.existsSync(docsPath)) {
            fs.mkdirSync(docsPath, {recursive: true});
        }

        // Write the file
        const filePath = path.join(docsPath, filename);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Successfully saved to:', filePath);
    } catch (error) {
        console.error('Failed to save file:', error);
    }
});

// Return a list of all saved CSV filenames
ipcMain.handle('list-csvs', () => {
    try {
        const docsPath = path.join(os.homedir(), 'Documents', 'ZetamacResults');
        if (!fs.existsSync(docsPath)) return [];
        return fs.readdirSync(docsPath)
            .filter(f => f.endsWith('.csv'))
            .sort()
            .reverse(); // newest first
    } catch (e) {
        console.error('Failed to list CSVs:', e);
        return [];
    }
});

// Read and return the contents of a specific CSV file
ipcMain.handle('read-csv', (event, filename) => {
    try {
        const filePath = path.join(os.homedir(), 'Documents', 'ZetamacResults', filename);
        return fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
        console.error('Failed to read CSV:', e);
        return null;
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});