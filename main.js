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

function typeText(webContents, text) {
  for (const char of text) {
    webContents.sendInputEvent({ type: 'char', keyCode: char });
  }
}

function pressTab(webContents) {
  webContents.sendInputEvent({ type: 'keyDown', keyCode: 'TAB' });
  webContents.sendInputEvent({ type: 'keyUp', keyCode: 'TAB' });
}

function autoLoginRfid(win) {
  setTimeout(() => {
    if (!win || win.isDestroyed()) return;
    win.focus();
    // El sitio debe tener el primer campo de login enfocado para esta secuencia.
    typeText(win.webContents, 'RV');
    pressTab(win.webContents);
    typeText(win.webContents, 'hhhigarcia');
    pressTab(win.webContents);
    typeText(win.webContents, '123123');
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'ENTER' });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'ENTER' });
  }, 1800);
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
    rfidReportWindow.webContents.on('did-finish-load', () => autoLoginRfid(rfidReportWindow));
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
