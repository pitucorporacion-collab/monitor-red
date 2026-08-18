const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let server;
let rfidReportWindow;
let rfidStockWindow;

const RFID_REPORT_URL = 'http://rfid.radiovictoria.com.ar/#/Reporte01';
const RFID_STOCK_URL = 'http://rfid.radiovictoria.com.ar/#/stkItemMov';

function startServer() {
  server = require('./server.js');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 820,
    height: 576,
    resizable: false,
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

async function autoLoginRfid(win) {
  await wait(1800);
  if (!win || win.isDestroyed()) return;

  try {
    await win.webContents.executeJavaScript(`(() => {
      const inputs = [...document.querySelectorAll('input')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && !el.disabled;
      });
      if (inputs.length) inputs[0].focus();
      return inputs.length;
    })()`);

    win.focus();

    const typeText = async (text) => {
      for (const char of text) {
        win.webContents.sendInputEvent({ type: 'char', keyCode: char });
        await wait(35);
      }
    };

    const pressTab = async () => {
      win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'TAB' });
      win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'TAB' });
    };

    const pressEnter = async () => {
      win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'ENTER' });
      win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'ENTER' });
    };

    // Secuencia solicitada: RV -> esperar 1 s -> TAB -> esperar 1 s -> TAB -> 123123 -> ENTER
    // Limpiar lo que haya quedado escrito anteriormente
for (let i = 0; i < 6; i++) {
  await pressBackspace();
  await wait(150);
}

await wait(1000);

// Usuario
await typeText('RV');
await wait(1000);

// Pasar al siguiente campo
await pressTab();
await wait(1000);

// Segundo dato
await typeText('hhhigarcia');
await wait(1000);

// Pasar al siguiente campo
await pressTab();
await wait(1000);

// Contraseña
await typeText('123123');
await wait(1000);

// Ingresar
await pressEnter();
  } catch (e) {
    console.log('Login RFID automático no pudo completarse:', e.message);
  }
}

function openRfidPages() {
  if (rfidReportWindow && !rfidReportWindow.isDestroyed()) {
    rfidReportWindow.focus();
  } else {
    rfidReportWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      autoHideMenuBar: true,
      title: 'RFID - Reporte',
      webPreferences: { contextIsolation: true }
    });
    rfidReportWindow.loadURL(RFID_REPORT_URL);
    rfidReportWindow.webContents.once('did-finish-load', () => autoLoginRfid(rfidReportWindow));
    rfidReportWindow.on('closed', () => { rfidReportWindow = null; });
  }

  if (rfidStockWindow && !rfidStockWindow.isDestroyed()) {
    rfidStockWindow.focus();
  } else {
    rfidStockWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      autoHideMenuBar: true,
      title: 'RFID - Stock',
      webPreferences: { contextIsolation: true }
    });
    rfidStockWindow.loadURL(RFID_STOCK_URL);
    rfidStockWindow.on('closed', () => { rfidStockWindow = null; });
  }
}

ipcMain.on('open-rfid-pages', openRfidPages);

app.whenReady().then(() => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
