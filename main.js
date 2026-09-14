const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let server;

function getUserDataFile() {
  return path.join(app.getPath('userData'), 'monitor-data.json');
}

function startServer() {
  process.env.MONITOR_USER_DATA = getUserDataFile();
  server = require('./server.js');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 650,
    minWidth: 700,
    minHeight: 500,
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('load-device-config', () => {
  const file = getUserDataFile();
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.log('No se pudo leer la configuración:', e.message);
  }
  return null;
});

ipcMain.handle('save-device-config', (_event, config) => {
  const file = getUserDataFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(config, null, 2), 'utf8');
  return true;
});

app.whenReady().then(() => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
