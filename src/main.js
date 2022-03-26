/**
* system: Discord RPCTool
* author: dekitarpg@gmail.com
*/

// set true to show dev consoles
const SHOW_DEBUG = false; 

/**
* ■ Various Requirements:
*/
const {app, dialog, ipcMain, BrowserWindow, Menu, Tray} = require('electron');
const DataStore = require('./libs/data-store');
const path = require('path');
const HTML_PATH = path.join(__dirname, 'app.html');
const ICON_PATH = path.join(__dirname, 'img/rpc-icon.ico');
const PRELOAD_PATH = path.join(__dirname, 'preload.js');
const MAIN_WINDOW_SIZE = {w: 1024, h: 574};
const CHILD_WINDOW_SIZE = {w: 640, h: 420};
// DEKRPC stores the running app windows/tray:
const DEKRPC = {tray:null, main:null, child:null};
// Application variable configuration 
const app_config = new DataStore({  // DONT REMOVE!
    filename: "[dekita.rpc.data]",  // DONT REMOVE!
    defaults: {                     // DONT REMOVE!
        'auto-boot': false,     // DONT REMOVE!
        'auto-play': false,     // DONT REMOVE!
        'auto-tiny': false,     // DONT REMOVE!
        'tiny-tray': true,      // DONT REMOVE!
    }                     // DONT REMOVE!
});                       // DONT REMOVE!

/**
* ■ ipc handlers:
*/
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

/**
* ■ App/Windows Functions:
*/

// Create the main browser window.
function createMainWindow() {
    if (DEKRPC.main) return DEKRPC.main.reload();
    DEKRPC.tray = null;
    let reloading = false;
    const width = MAIN_WINDOW_SIZE.w;
    const height= MAIN_WINDOW_SIZE.h;
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
        },
    });
    DEKRPC.main.setMenu(null);
    DEKRPC.main.loadFile(HTML_PATH);
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
        // main_window.reload();
        reloading = true;
    });  
    DEKRPC.main.on('closed', event => {
        if (DEKRPC.child) DEKRPC.child.close();
    });
    DEKRPC.main.webContents.on('dom-ready', ()=>{
        if (!reloading && app_config.get('auto-tiny')) {
            DEKRPC.main.minimize();
        } else {
            DEKRPC.main.show();
        }
        if (SHOW_DEBUG){
            DEKRPC.main.webContents.openDevTools();
        }
        reloading = false;
    });
};

// Creates a child window (not a true child) and accepts an html file path
// to allow for easily opening additional windows/pages.
// This is used for creating the app help guide window.
function createChildWindow(html_path, width=null, height=null, debug=SHOW_DEBUG){
    if (!width) width = CHILD_WINDOW_SIZE.w;
    if (!height) height = CHILD_WINDOW_SIZE.h;
    if (DEKRPC.child) return DEKRPC.child.reload();
    const main_bounds = DEKRPC.main.getBounds();
    DEKRPC.child = new BrowserWindow({
        x: main_bounds.x + ((MAIN_WINDOW_SIZE.w - width)/2),
        y: main_bounds.y + ((MAIN_WINDOW_SIZE.h - height)/2),
        // parent: DEKRPC.main,
        // modal: true,
        icon: ICON_PATH,
        width: width, 
        height: height, 
        minWidth: width,
        minHeight: height,
        autoHideMenuBar: true,
        useContentSize: true,
        resizable: false, 
        show:  false,
        webPreferences: {
            preload: PRELOAD_PATH,
            contextIsolation: false,
        },
    });
    DEKRPC.child.setMenu(null);
    DEKRPC.child.loadURL(path.join(__dirname, html_path));
    if (debug) DEKRPC.child.webContents.openDevTools();
    DEKRPC.child.on('closed', () => DEKRPC.child = null);
    DEKRPC.child.webContents.on('dom-ready', () => DEKRPC.child.show());
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
    tray_app.on('double-click', function (event) {
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

// Keep running even if we hit unhandled rejections
process.on('unhandledRejection', console.error);
