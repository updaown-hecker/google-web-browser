const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const Store = require('electron-store');
require('@electron/remote/main').initialize();

const store = new Store();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: true,
      webviewTag: true,
      allowDisplayingInsecureContent: true
    },
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, 'assets', 'Blinx.ico')
  });

  mainWindow.loadFile('index.html');

  // Wait for renderer.js to load before initializing modules
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('initialize-modules');
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  // Register blinx:// protocol
  protocol.registerFileProtocol('blinx', (request, callback) => {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname.substring(2); // Remove leading //
      
      if (pathname === 'settings') {
        callback({
          path: path.join(__dirname, 'settings.html')
        });
      } else {
        // Handle other internal pages here
        console.warn('Unhandled blinx:// URL:', pathname);
        callback({ error: -2 });
      }
    } catch (err) {
      console.error('Error handling blinx:// protocol:', err);
      callback({ error: -2 });
    }
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Handle IPC messages
ipcMain.on('modules-loaded', () => {
  console.log('✅ All modules loaded successfully');
});

ipcMain.on('minimize-window', () => {
  const win = BrowserWindow.getFocusedWindow();
  win.minimize();
});

ipcMain.on('maximize-window', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

ipcMain.on('close-window', () => {
  const win = BrowserWindow.getFocusedWindow();
  win.close();
});