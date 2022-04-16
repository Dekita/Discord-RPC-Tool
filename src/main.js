/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*/

/**
* ■ Various Requirements:
*/
const {app, dialog, ipcMain, BrowserWindow, Menu, Tray} = require('electron');
const dapi = require('bent')('https://dekitarpg.com/', 'POST', 'json', 200);
const { autoUpdater } = require("electron-updater");
const fs = require('fs');
const path = require('path');
const config = require('./config');
const EJS = require('ejs-electron');
const DataStore = require('./libs/data-store');
const HTML_PATH = path.join(__dirname, 'main.ejs');
const ICON_PATH = path.join(__dirname, 'img/rpc-icon.ico');
const PRELOAD_PATH = path.join(__dirname, 'preload.js');
const theme_files = fs.readdirSync(path.join(__dirname, 'themes'));
const app_themes = theme_files.map(theme => {
    return theme.replace(__dirname).replace('.css','')
});
// add custom theme to the theme menu:
app_themes.push('custom'); 

// DEKRPC stores the running app windows/tray && dapi data:
const DEKRPC = {tray:null, main:null, child:null, dapi:{}};

// allow only one instance of app to run:
const instance_locked = app.requestSingleInstanceLock({});
if (!instance_locked) app.quit();

// app_config:
// Stores application configuration that can be 
// manually changed by app users. DONT REMOVE!
const app_config = new DataStore({
    filename: "[dekita.rpc.data]",
    defaults: config.data_store,
});
const APP_NAME = (() => {
    if (app.isPackaged) return app.getName();
    return require('../package.json').build.productName;
})();
const APP_VERSION = (() => {
    if (app.isPackaged) return app.getVersion();
    return require('../package.json').version;
})();
const APP_USER_AGENT = (()=>{
    return `${APP_NAME} ${APP_VERSION} - dekitarpg.com`;
})();

// set default ejs data:
EJS.data('devmode', config.dev_mode);
EJS.data('appname', APP_NAME);
EJS.data('version', APP_VERSION);

/**
* ■ ipc handlers:
*/
ipcMain.handle('get-name', e => APP_NAME);
ipcMain.handle('get-version', e => APP_VERSION);
ipcMain.handle('get-path', (event, key) => {
    if (key === 'app') return app.getAppPath();
    return app.getPath(key);
});
ipcMain.handle('openFileDialog', async (event) => {
    const extensions = ['jpg','png','gif'];
    return await dialog.showOpenDialog({
        filters: [{name: 'Images', extensions}],
        properties: ['openFile'],
    });
});
ipcMain.handle('saveFileDialog', async (event) => {
    const filters = [{name: 'Stylesheet', extensions: ['css']}];
    return await dialog.showSaveDialog({filters});
});
ipcMain.handle("get-config", async (event, key) => {
    return app_config.get(key);
});
ipcMain.handle("set-config", async (event, key, value) => {
    const return_value = app_config.set(key, value);
    if (key === 'auto-boot') updateAutoBootMode();
    return return_value;
});
ipcMain.handle("delete-config", async (event, key) => {
    return app_config.delete(key);
});
ipcMain.handle("open-child-window", async (event, ...args) => {
    return createChildWindow(...args);
});
ipcMain.handle("reload-child-window", async (event) => {
    return DEKRPC.child ? (DEKRPC.child.reload() || true) : false;
});
ipcMain.handle("window-fully-rendered", async (event, windowname) => {
    DEKRPC[windowname].emit('window-fully-rendered');
});
ipcMain.handle("install-update", async() => {
    if (app.isPackaged) autoUpdater.quitAndInstall();
});
ipcMain.handle("get-user-count", async() => {
    return DEKRPC.dapi?.count || 0;
});

// update dekita api with user counter data
// only run when app is packaged:
(async function dapiupdater(){
    // if (!app.isPackaged) return;
    const result = await dapi('rpc-ping', {
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        uuid: await app_config.get('uuid'),
        version: APP_VERSION,
    });
    if (result.success && result.counter) {
        DEKRPC.dapi.count = result.counter;
    }
    setTimeout(dapiupdater, 1000 * 60 * 5);
})();

/**
* ■ App/Windows Functions:
*/
// Create the main browser window.
async function createMainWindow() {
    if (DEKRPC.main) return DEKRPC.main.reload();
    DEKRPC.tray = null;
    let reloading = false;
    const width = config.window_sizes.main.w;
    const height= config.window_sizes.main.h;
    DEKRPC.main = new BrowserWindow({
        show: false, 
        icon: ICON_PATH,
        width, height,
        minWidth: width,
        minHeight: height,
        autoHideMenuBar: true, 
        useContentSize: true,
        backgroundColor: '#36393f',
        webPreferences: {
            preload: PRELOAD_PATH,
            contextIsolation: false,
            devTools: !app.isPackaged,
        },
    });
    DEKRPC.main.setMenu(null);
    DEKRPC.main.on('minimize', event => {
        if (app_config.get('tiny-tray')) {
            DEKRPC.main.setSkipTaskbar(true);
            DEKRPC.tray = createTray(DEKRPC.main);
            event.preventDefault();
        }
    });
    DEKRPC.main.on('restore', event => {
        if (app_config.get('tiny-tray')) {
            DEKRPC.main.setSkipTaskbar(false);
            DEKRPC.tray.destroy();
            DEKRPC.tray = null;
        }
        event.preventDefault();
        reloading = true;
    });  
    DEKRPC.main.on('closed', event => {
        if (DEKRPC.child) DEKRPC.child.close();
    });
    DEKRPC.main.on('window-fully-rendered', ()=>{
        const can_tiny = !reloading && app_config.get('auto-tiny');
        if (!can_tiny) DEKRPC.main.show();
        else DEKRPC.main.minimize();
        if (config.dev_mode) DEKRPC.main.webContents.openDevTools();
        initializeAutoUpdater();
        reloading = false;
    });
    DEKRPC.main.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.key.toUpperCase() === 'R') {
            loadFileToWindow('app', DEKRPC.main);
            event.preventDefault();
        }
    });
    await loadFileToWindow('app', DEKRPC.main);
};
// Creates a child window (not a true child) and accepts an html file path
// to allow for easily opening additional windows/pages.
// This is used for creating the app help guide window.
async function createChildWindow(html_path, width=null, height=null, debug=config.dev_mode){
    if (DEKRPC.child) {
        await DEKRPC.child.destroy();
        DEKRPC.child = null;
        // return DEKRPC.child.reload();
    }
    const page = html_path.split('.').shift();
    if (!width) width = config.window_sizes[page]?.w ?? 512;
    if (!height) height = config.window_sizes[page]?.h ?? 256;
    const main_bounds = DEKRPC.main.getBounds();
    DEKRPC.child = new BrowserWindow({
        x: main_bounds.x + ((config.window_sizes.main.w - width)/2),
        y: main_bounds.y + ((config.window_sizes.main.h - height)/2),
        // parent: DEKRPC.main,
        // modal: true,
        icon: ICON_PATH,
        width: width, 
        height: height, 
        minWidth: width,
        minHeight: height,
        autoHideMenuBar: true,
        useContentSize: true,
        // resizable: false, 
        show:  false,
        webPreferences: {
            preload: PRELOAD_PATH,
            contextIsolation: false,
            devTools: !app.isPackaged,
        },
    });
    DEKRPC.child.setMenu(null);
    DEKRPC.child.on('closed', () => DEKRPC.child = null);
    DEKRPC.child.on('window-fully-rendered', () => DEKRPC.child.show());
    DEKRPC.child.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.key.toUpperCase() === 'R') {
            loadFileToWindow(page, DEKRPC.child);
            event.preventDefault();
        }
    });
    await loadFileToWindow(page, DEKRPC.child);
    if (debug) DEKRPC.child.webContents.openDevTools();
};
// creates a system tray icon and defines its options
function createTray(windoe) {
    let tray_app = new Tray(ICON_PATH);
    const contextMenu = Menu.buildFromTemplate([
        {label: 'Show', click: () => windoe.show()},
        {label: 'Exit', click: () => {
            app.isQuiting = true;
            app.quit();
        }},
    ]); 
    tray_app.on('double-click', event => {
        windoe.show();
    });
    tray_app.setToolTip(windoe.title);
    tray_app.setContextMenu(contextMenu);
    return tray_app;
}
// updates the 'auto-start at system boot' feature
function updateAutoBootMode(){
    const openAtLogin = app_config.get('auto-boot');
    app.setLoginItemSettings({openAtLogin});    
}
async function loadFileToWindow(page, windoe) {
    let theme = await app_config.get('gui-theme');
    // in case of using old (now unsupported) theme
    if (!app_themes.includes(theme)) {
        theme = app_themes[0];
        await app_config.set('gui-theme', theme);
    }
    EJS.data('theme', theme);
    EJS.data('color', await app_config.get('gui-color'));
    EJS.data('title',page !== 'app'?capitalize(page):'');
    EJS.data('themes', app_themes);
    EJS.data('page', page);
    windoe.webContents.setUserAgent(APP_USER_AGENT); 
    if (windoe.isVisible()) windoe.reload();
    else windoe.loadFile(HTML_PATH);
}
function capitalize([char1, ...rest]) {
    return char1.toUpperCase() + rest.join("");
}
// someone tried to run a second instance of app
app.on('second-instance', ()=>{
    if (DEKRPC.main) {
        if (DEKRPC.main.isMinimized()) {
            DEKRPC.main.restore()
        }
        DEKRPC.main.focus();
    }
});
// create window when electron has initialized.
app.on('ready', createMainWindow);
// Quit when all windows are closed, except on macOS. 
// Mac apps normally exit only when user uses CMD+Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
// On OS X it's common to re-create a window in the app when the
// dock icon is clicked and there are no other windows open.
app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createMainWindow();
});
// Handle automatic updates
// triggered from createMainWindow:
function sendUpdaterInfoToRenderer(type, info) {
    if (DEKRPC.main) DEKRPC.main.webContents.send('updater', type, info);
}
function initializeAutoUpdater() {
    if (!app.isPackaged) return;
    // define listeners:
    const updater_events = [
        'checking-for-update',
        'update-available',
        'update-not-available',
        'download-progress',
        'update-downloaded',
        'before-quit-for-update',
        'error',
    ];
    for (const event of updater_events) {
        autoUpdater.on(event, (...data) => {
            sendUpdaterInfoToRenderer(event, ...data);
        });
    }
    // begin checking updates:
    autoUpdater.checkForUpdates();
}
// Keep running even if we hit unhandled rejections
process.on('unhandledRejection', console.error);
// Hot reloading
if (config.enable_reloader) {
    require('electron-reloader')(module, {
        debug: config.dev_mode,
        watchRenderer: true,
    });
}
