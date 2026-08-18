const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('monitorAPI', {
  openRfidPages: () => ipcRenderer.send('open-rfid-pages')
});
