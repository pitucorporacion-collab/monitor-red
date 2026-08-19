const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('monitorAPI', {
  openRfidPages: () => ipcRenderer.send('open-rfid-pages'),
  loadDeviceConfig: () => ipcRenderer.invoke('load-device-config'),
  saveDeviceConfig: (config) => ipcRenderer.invoke('save-device-config', config)
});
