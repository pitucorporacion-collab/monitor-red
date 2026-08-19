const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let server;
let rfidReportWindow;
let rfidStockWindow;

const RFID_REPORT_URL = 'http://rfid.radiovictoria.com.ar/#/Reporte01';


function getUserDataFile() {
  return path.join(app.getPath('userData'), 'monitor-data.json');
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

    const pressTab = async () => {
      pressKey(win, 'TAB');
    };

    const pressBackspace = async () => {
      pressKey(win, 'BACKSPACE');
    };

    const pressEnter = async () => {
      pressKey(win, 'ENTER');
    };

    // Limpiar caracteres que hayan quedado en el campo enfocado.
    for (let i = 0; i < 6; i++) {
      await pressBackspace();
      await wait(150);
    }
    await wait(1000);

    // Login solicitado: RV -> TAB -> hhhigarcia -> TAB -> 123123 -> ENTER.
    await typeText('RV');
    await wait(600);
    await pressTab();
    await wait(600);
    await typeText('hhhigarcia');
    await wait(600);
    await pressTab();
    await wait(600);
    await typeText('123123');
    await wait(3000);
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

  if (rfidStockWindow && !rfidStockWindow.isDestroyed()) {
    rfidStockWindow.show();
  } else {
    rfidStockWindow = createRfidWindow(RFID_STOCK_URL, 'RFID - Stock');
    rfidStockWindow.on('closed', () => { rfidStockWindow = null; });
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

app.whenReady().then(() => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
