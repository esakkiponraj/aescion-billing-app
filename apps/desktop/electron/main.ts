import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: 'AESCION Commerce Enterprise POS',
    backgroundColor: '#F8FAFC',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
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
