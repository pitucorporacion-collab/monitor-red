const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('monitorAPI', {
  openRfidPages: () => ipcRenderer.send('open-rfid-pages'),
  loadDeviceConfig: () => ipcRenderer.invoke('load-device-config'),
  saveDeviceConfig: (config) => ipcRenderer.invoke('save-device-config', config),
  loadRackConfig: () => ipcRenderer.invoke('load-rack-config'),
  saveRackConfig: (config) => ipcRenderer.invoke('save-rack-config', config),
  loadRackImage: (rack) => ipcRenderer.invoke('load-rack-image', rack),
  openRackImage: (rack) => ipcRenderer.invoke('open-rack-image', rack)
});
