const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

    const startUrl =
        process.env.ELECTRON_START_URL || `file://${path.join(__dirname, './dist/index.html')}`;
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});