import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

function getPreloadPath(): string {
  const localPreload = path.join(__dirname, 'preload.cjs');
  if (fs.existsSync(localPreload)) return localPreload;
  const jsPreload = path.join(__dirname, 'preload.js');
  if (fs.existsSync(jsPreload)) return jsPreload;
  return path.join(app.getAppPath(), 'electron/dist/preload.cjs');
}

function getIndexHtmlPath(): string {
  const appPath = app.getAppPath();
  const candidates = [
    path.join(__dirname, '../../dist/index.html'),
    path.join(__dirname, '../dist/index.html'),
    path.join(appPath, 'dist/index.html')
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(appPath, 'dist/index.html');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: 'AESCION Commerce Enterprise POS',
    backgroundColor: '#F7F9FC',
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(getIndexHtmlPath());
  }
}

// Hardware & Peripheral IPC Handlers
ipcMain.handle('print-receipt', async (_event, payload) => {
  console.log('[ELECTRON-IPC] Thermal Receipt Print Request:', payload?.invoiceNumber);
  return { success: true, timestamp: Date.now() };
});

ipcMain.handle('open-drawer', async () => {
  console.log('[ELECTRON-IPC] Cash Drawer Pulse Signal Transmitted');
  return { success: true };
});

ipcMain.handle('read-weight', async () => {
  console.log('[ELECTRON-IPC] Scale Weight Queried');
  return { weightKg: 1.25, isStable: true };
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion() || '2.0.0';
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
