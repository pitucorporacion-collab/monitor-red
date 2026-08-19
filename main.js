const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let server;
let rfidReportWindow;

const RFID_REPORT_URL = 'http://rfid.radiovictoria.com.ar/#/Reporte01';

// Archivos compartidos en el File Server.
const SHARED_DATA_FILE = '\\\\10.3.0.220\\Grupos\\IT\\2026\\MonitorRed\\monitor-data.json';
const SHARED_RACKS_DATA_FILE = '\\\\10.3.0.220\\Grupos\\IT\\2026\\MonitorRed\\rack-data.json';
const SHARED_RACKS_DIR = '\\\\10.3.0.220\\Grupos\\IT\\2026\\MonitorRed\\racks';

function getUserDataFile() {
  return SHARED_DATA_FILE;
}

function startServer() {
  process.env.MONITOR_USER_DATA = getUserDataFile();
  server = require('./server.js');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 860,
    height: 576,
    minWidth: 700,
    minHeight: 500,
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pressKey(win, keyCode) {
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode });
}

async function autoLoginRfid(win) {
  await wait(2500);
  if (!win || win.isDestroyed()) return;

  try {
    await win.webContents.executeJavaScript(`(() => {
      const inputs = [...document.querySelectorAll('input')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && !el.disabled && !el.readOnly;
      });
      if (inputs.length) inputs[0].focus();
      return inputs.length;
    })()`);

    win.focus();
    await wait(500);

    const typeText = async (text) => {
      for (const char of text) {
        win.webContents.sendInputEvent({ type: 'char', keyCode: char });
        await wait(60);
      }
    };

    const pressTab = async () => pressKey(win, 'TAB');
    const pressBackspace = async () => pressKey(win, 'BACKSPACE');
    const pressEnter = async () => pressKey(win, 'ENTER');

    for (let i = 0; i < 6; i++) {
      await pressBackspace();
      await wait(150);
    }
    await wait(1000);

    // Login: RV -> TAB -> hhhigarcia -> TAB -> 123123 -> TAB -> ENTER.
    // Se mantienen 600 ms entre acciones.
    await typeText('RV');
    await wait(600);
    await pressTab();
    await wait(600);
    await typeText('hhhigarcia');
    await wait(600);
    await pressTab();
    await wait(600);
    await typeText('123123');
    await wait(600);
    await pressTab();
    await wait(600);
    await pressEnter();
  } catch (e) {
    console.log('Login RFID automático no pudo completarse:', e.message);
  }
}

function createRfidWindow(url, titleText, onReady) {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 550,
    resizable: true,
    autoHideMenuBar: true,
    title: titleText,
    webPreferences: { contextIsolation: true }
  });
  win.loadURL(url);
  if (onReady) win.webContents.once('did-finish-load', () => onReady(win));
  return win;
}

function openRfidPages() {
  if (rfidReportWindow && !rfidReportWindow.isDestroyed()) {
    rfidReportWindow.show();
    rfidReportWindow.focus();
  } else {
    rfidReportWindow = createRfidWindow(RFID_REPORT_URL, 'RFID - Reporte', autoLoginRfid);
    rfidReportWindow.on('closed', () => { rfidReportWindow = null; });
  }
}

ipcMain.on('open-rfid-pages', openRfidPages);

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
  fs.mkdirSync(path.dirname(SHARED_RACKS_DATA_FILE), { recursive: true });
  fs.writeFileSync(SHARED_RACKS_DATA_FILE, JSON.stringify(config, null, 2), 'utf8');
  return true;
});

function safeRackName(rack) {
  return String(rack || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

ipcMain.handle('load-rack-image', (_event, rack) => {
  const safeRack = safeRackName(rack);
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  for (const ext of extensions) {
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
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  for (const ext of extensions) {
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
