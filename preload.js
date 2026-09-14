const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('monitorAPI', {
  loadDeviceConfig: () => ipcRenderer.invoke('load-device-config'),
  saveDeviceConfig: (config) => ipcRenderer.invoke('save-device-config', config)
});
