const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let server;
const SHARED_RACKS_DATA_FILE = '\\\\10.3.0.220\\Grupos\\IT\\2026\\MonitorRed\\rack-data.json';
const SHARED_RACKS_DIR = '\\\\10.3.0.220\\Grupos\\IT\\2026\\MonitorRed\\racks';

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

ipcMain.handle('load-rack-config', () => {
  try {
    if (fs.existsSync(SHARED_RACKS_DATA_FILE)) return JSON.parse(fs.readFileSync(SHARED_RACKS_DATA_FILE, 'utf8'));
  } catch (e) {
    console.log('No se pudo leer la configuración de racks:', e.message);
  }
  return {};
});

ipcMain.handle('save-rack-config', (_event, config) => {
  try {
    fs.mkdirSync(path.dirname(SHARED_RACKS_DATA_FILE), { recursive: true });
    fs.writeFileSync(SHARED_RACKS_DATA_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.log('No se pudo guardar la configuración de racks:', e.message);
    return false;
  }
});

function safeRackName(rack) {
  return String(rack || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

ipcMain.handle('load-rack-image', (_event, rack) => {
  const safeRack = safeRackName(rack);
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const file = path.join(SHARED_RACKS_DIR, `${safeRack}.${ext}`);
    try {
      if (fs.existsSync(file)) {
        const buffer = fs.readFileSync(file);
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
        return `data:${mime};base64,${buffer.toString('base64')}`;
      }
    } catch (e) {
      console.log(`No se pudo leer la imagen del rack ${safeRack}:`, e.message);
    }
  }
  return null;
});

ipcMain.handle('open-rack-image', async (_event, rack) => {
  const safeRack = safeRackName(rack);
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const file = path.join(SHARED_RACKS_DIR, `${safeRack}.${ext}`);
    try {
      if (fs.existsSync(file)) {
        const result = await shell.openPath(file);
        return result || true;
      }
    } catch (e) {
      console.log(`No se pudo abrir la imagen del rack ${safeRack}:`, e.message);
    }
  }
  return false;
});

app.whenReady().then(() => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
