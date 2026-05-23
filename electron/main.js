import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { setupFileHandlers, packEvrakFile } from './handlers/fileHandler';
import { setupDbHandlers } from './handlers/dbHandler';
import { setupExportHandlers } from './handlers/exportHandler';
import { setupTemplateHandlers } from './handlers/templateHandler';

// ─── Portable mode: config next to .exe ──────────────────────────────────────
const isPortable = process.env.PORTABLE_EXECUTABLE_DIR != null;
if (isPortable) {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  app.setPath('userData', path.join(portableDir, 'EvraktronData'));
  app.setPath('appData', path.join(portableDir, 'EvraktronData'));
}

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let currentFilePath = null;
let tempDir = null;
let db = null;
let lockAcquired = false;
let isUnsaved = false;

// ─── File association: argv ───────────────────────────────────────────────────
function getOpenFilePath() {
  const args = process.argv.slice(isDev ? 2 : 1);
  const evrakArg = args.find(a => (a.endsWith('.etap') || a.endsWith('.etapp')) && fs.existsSync(a));
  return evrakArg || null;
}

// ─── Create main window ───────────────────────────────────────────────────────
function createWindow() {
  let iconPath = path.join(__dirname, '../public/icon.png');
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, '../../public/icon.png');
  }

  let preloadPath = path.join(__dirname, 'preload.js');
  if (!fs.existsSync(preloadPath)) {
    preloadPath = path.join(__dirname, '../preload/preload.js');
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    icon: iconPath,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    mainWindow.webContents.openDevTools();
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const htmlPath = fs.existsSync(path.join(__dirname, '../dist/index.html'))
      ? path.join(__dirname, '../dist/index.html')
      : path.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(htmlPath);
  }

  // Custom title bar IPC
  ipcMain.on('window:minimize', () => mainWindow.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow.close());

  mainWindow.on('maximize', () => mainWindow.webContents.send('window:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximized', false));

  mainWindow.on('close', async (e) => {
    e.preventDefault();
    await cleanup();
    mainWindow.destroy();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    const filePath = getOpenFilePath();
    if (filePath) {
      mainWindow.webContents.send('file:open-request', filePath);
    }
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });
}

// ─── Cleanup on exit ─────────────────────────────────────────────────────────
async function cleanup() {
  try {
    // Çıkışta otomatik kaydetme (sadece diske daha önce kaydedilmiş dosyalar için)
    if (currentFilePath && !isUnsaved && tempDir && fs.existsSync(tempDir)) {
      try {
        packEvrakFile(currentFilePath, tempDir, { currentFilePath, tempDir });
      } catch (err) {
        console.error('Auto-save error:', err);
      }
    }

    if (db) {
      db.close();
      db = null;
    }
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
    if (currentFilePath && lockAcquired) {
      const lockPath = currentFilePath + '.lock';
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
      lockAcquired = false;
    }
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();

  const state = { mainWindow, currentFilePath, tempDir, db, lockAcquired, isUnsaved };
  const setState = (updates) => {
    if ('currentFilePath' in updates) currentFilePath = updates.currentFilePath;
    if ('tempDir' in updates) tempDir = updates.tempDir;
    if ('db' in updates) db = updates.db;
    if ('lockAcquired' in updates) lockAcquired = updates.lockAcquired;
    if ('isUnsaved' in updates) isUnsaved = updates.isUnsaved;
    Object.assign(state, updates);
  };

  setupFileHandlers(ipcMain, state, setState);
  setupDbHandlers(ipcMain, state, setState);
  setupExportHandlers(ipcMain, state, setState);
  setupTemplateHandlers(ipcMain, state);

  // Second instance / file open on Windows
  app.on('second-instance', (_event, argv) => {
    const filePath = argv.find(a => (a.endsWith('.etap') || a.endsWith('.etapp')) && fs.existsSync(a));
    if (filePath && mainWindow) {
      mainWindow.focus();
      mainWindow.webContents.send('file:open-request', filePath);
    }
  });

  // macOS
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (mainWindow) mainWindow.webContents.send('file:open-request', filePath);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.requestSingleInstanceLock();

app.on('window-all-closed', async () => {
  await cleanup();
  if (process.platform !== 'darwin') app.quit();
});
