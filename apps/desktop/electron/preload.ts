import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('aescionHardware', {
  printReceipt: (payload: any) => ipcRenderer.invoke('print-receipt', payload),
  openCashDrawer: () => ipcRenderer.invoke('open-drawer'),
  readScaleWeight: () => ipcRenderer.invoke('read-weight'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
