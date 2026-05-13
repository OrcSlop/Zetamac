const {contextBridge, ipcRenderer} = require('electron');

// This exposes a safe API to your React app called "window.electronAPI"
contextBridge.exposeInMainWorld(
    'electronAPI', {saveCSV: (filename, data) => ipcRenderer.send('save-csv', filename, data)});