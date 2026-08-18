const { app, BrowserWindow } = require('electron');
const path = require('path');

let server;

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
      contextIsolation: true
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
