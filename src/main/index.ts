// import { updateElectronApp } from 'update-electron-app';
import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import {
  BrowserWindow,
  app,
  ipcMain,
  shell,
  dialog,
  Tray,
  nativeImage,
  Menu,
} from 'electron';
import { join } from 'path';
import {
  getUIStore,
  getUpgradeKey,
  store,
  ConnectionStatus,
  getResourcePath,
} from './store';
import { socketIOConnect } from './socket';
import { checkModelsFolder } from './check-models-folder';
import { eventsListeners } from './events';
// import { folderWatcher } from './folder-watcher';

// Colored Logo Assets
import logo from '../../resources/favicon@2x.png?asset';
import logoConnected from '../../resources/favicon-connected@2x.png?asset';
import logoPending from '../../resources/favicon-pending@2x.png?asset';
import logoDisconnected from '../../resources/favicon-disconnected@2x.png?asset';

// updateElectronApp();

let mainWindow;
let tray;

//defaults
let width = 400;
let height = 600;
let framed = false;

const DEBUG = import.meta.env.MAIN_VITE_DEBUG === 'true' || false;
const browserWindowOptions = DEBUG
  ? {
      show: false,
      titleBarOverlay: true,
    }
  : {
      show: true,
      frame: framed,
      fullscreenable: false,
      useContentSize: true,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      thickFrame: false,
    };

function createWindow() {
  const upgradeKey = getUpgradeKey();

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: width,
    maxWidth: width,
    useContentSize: true,
    resizable: false,
    ...browserWindowOptions,
    ...(process.platform === 'linux' ? { logo } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
    icon: logo,
  });

  // Prevents dock icon from appearing on macOS
  mainWindow.setMenu(null);

  mainWindow.on('ready-to-show', () => {
    if (DEBUG) {
      mainWindow.webContents.openDevTools();
    }

    // Set logo to disconnected (red)
    const icon = nativeImage.createFromPath(logoDisconnected);
    tray = new Tray(icon);
    tray.setToolTip('Civitai Link');
    tray.on('click', () => {
      toggleWindow();
    });

    // Pass upgradeKey to window
    if (upgradeKey) {
      mainWindow.webContents.send('upgrade-key', { key: upgradeKey });
    }

    mainWindow.webContents.send('store-ready', getUIStore());
    mainWindow.webContents.send('app-ready', true);
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    mainWindow.showInactive();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function setWindowAutoHide() {
  mainWindow.hide();
  mainWindow.on('blur', () => {
    if (!mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide();
    }
  });
  if (framed) {
    mainWindow.on('close', function (event) {
      event.preventDefault();
      mainWindow.hide();
    });
  }
}

function toggleWindow() {
  mainWindow.isDestroyed() ? createWindow() : showWindow();
}

function alignWindow() {
  const trayBounds = tray.getBounds();
  mainWindow.setBounds({
    width: width,
    height: height,
    x: trayBounds.x,
    y: trayBounds.y,
  });
}

function showWindow() {
  alignWindow();
  mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
}

Menu.setApplicationMenu(null);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.civitai.link');

  checkModelsFolder();
  createWindow();
  socketIOConnect({ mainWindow, app });
  // folderWatcher();
  eventsListeners({ mainWindow });

  ipcMain.handle('get-resource-path', (_, type: ResourceType) => {
    return getResourcePath(type);
  });

  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });

    // Fix closed window when dialog takes focus Windows
    mainWindow.show();

    if (canceled) {
      return;
    } else {
      return filePaths[0];
    }
  });

  // Updates activities in the UI when a change is detected
  store.onDidChange('activitiesList', (newValue) => {
    mainWindow.webContents.send('activity-update', newValue);
  });

  // Updates all files once changed (Happens when file finishes download)
  store.onDidChange('resources', (newValue) => {
    mainWindow.webContents.send('files-update', newValue);
  });

  // Updates the UI and Tray icon with the socket connection status
  store.onDidChange('connectionStatus', async (newValue) => {
    let icon;

    if (newValue === ConnectionStatus.CONNECTED) {
      icon = nativeImage.createFromPath(logoConnected);
    } else if (newValue === ConnectionStatus.DISCONNECTED) {
      icon = nativeImage.createFromPath(logoDisconnected);
    } else if (newValue === ConnectionStatus.CONNECTING) {
      icon = nativeImage.createFromPath(logoPending);
    }

    tray.setImage(icon);
    mainWindow.webContents.send('connection-status', newValue);
  });

  if (!DEBUG) {
    setWindowAutoHide();
  }

  // Hides dock icon on macOS but keeps in taskbar
  app.dock.hide();

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
