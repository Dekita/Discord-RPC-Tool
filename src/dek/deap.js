/**
* system: DEAP - Dekitas Electron App Project 
* author: dekitarpg@gmail.com
* 
* This module handles creating an electron application
* it uses various configuration options to determine
* how windows behave, and the pages loaded. 
* 
*/
const {app, dialog, ipcMain, BrowserWindow, Menu, Tray} = require('electron');
const { autoUpdater } = require("electron-updater");
const logger = require('./logger')(__filename);
const EJS = require('ejs-electron');
const DataStore = require('./store');
const fs = require('fs');
const path = require('path');

const PACKAGE_JSON = (()=> {
    if (app.isPackaged) return {};
    return require('../../package.json');
})();
const APP_NAME = (() => {
    if (app.isPackaged) return app.getName();
    return PACKAGE_JSON.build.productName;
})();
const APP_VERSION = (() => {
    if (app.isPackaged) return app.getVersion();
    return PACKAGE_JSON.version;
})();

function capitalize([char1, ...rest]) {
    return char1.toUpperCase() + rest.join("");
}

module.exports = class DEAP {
    // quick reference to electron.app;
    static get app() {return app}
    static get name() {return APP_NAME}
    static get version() {return APP_VERSION}
    static get datastore() {return this._datastore}
    static get window_keys(){return Object.keys(this._windows)}
    static get main_window() {
        const winkey = Object.keys(this._windows);
        return this._windows[winkey.shift()] || null;
    }
    /**
    * setup app using given config
    */
    static setup(config={}) {
        this._tray = null;
        this._windows = {};
        this._config = config;
        this.setupDefaultEJS();
        this.setupDefaultIPC();
        this.setThemes(config.themes_dir);
        this.setInstanceLock(!config.dev_mode && config.single_instance);
        this.setDatastore({
            filename: "[dekita.rpc.data]",
            defaults: config.data_store,
        });
        this.setUserAgent("dekitarpg.com");
        // setup global logfile
        logger.setGlobalOptions({
            ...config.logger,
            file_options: {
                filename: path.join(app.getAppPath(), '/errors.log'),
                options: {flags: 'a', encoding: 'utf8'},
            },
            // http_options: {
            //     port: 9699,
            //     host: '127.0.0.1', 
            // }
        });
        logger.info(app.getAppPath());
    }
    static setThemes(dir) {
        this._theme_files = fs.readdirSync(dir);
        this._app_themes = this._theme_files.map(theme => {
            return theme.replace(__dirname).replace('.css','')
        });
        // add custom theme to the theme menu:
        this._app_themes.unshift('custom'); 
    }
    static setInstanceLock(single) {
        if (single && !app.requestSingleInstanceLock({})) app.quit();
    }
    static setDatastore(store_options) {
        this._datastore = new DataStore(store_options);
    }
    static setUserAgent(agent_str) {
        this._user_agent = `${APP_NAME} ${APP_VERSION} ${agent_str}`.trim();
    }
    // set default ejs data:
    static setupDefaultEJS() {
        EJS.data('devmode', this._config.dev_mode);
        EJS.data('appname', APP_NAME);
        EJS.data('version', APP_VERSION);
    }
    /**
    * ■ ipc handlers:
    */
    static setupDefaultIPC() {
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
            return this._datastore.get(key);
        });
        ipcMain.handle("set-config", async (event, key, value) => {
            const return_value = this._datastore.set(key, value);
            if (key === 'auto-boot') this.updateAutoBootMode();
            return return_value;
        });
        ipcMain.handle("delete-config", async (event, key) => {
            return this._datastore.delete(key);
        });
        ipcMain.handle("open-child-window", async (event, ...args) => {
            return this.createWindow(...args);
        });
        ipcMain.handle("reload-window", async (event, id) => {
            return this._windows[id] ? (this._windows[id].reload() || true) : false;
        });
        ipcMain.handle("window-fully-rendered", async (event, id) => {
            this._windows[id].emit('window-fully-rendered');
        });
        ipcMain.handle("install-update", async() => {
            if (app.isPackaged) autoUpdater.quitAndInstall();
        });
        ipcMain.handle("app-action", async(event, id, action) => {
            switch(action) {
                case 'maximize': {
                    if (this._windows[id].isMaximized()) {
                        this._windows[id].restore();
                        return false;
                    }
                    this._windows[id].maximize();
                    return true;
                }
                case 'minimize': return this._windows[id].minimize();
                case 'exit': return this._windows[id].close();
            }
        });
    }
    static addIPCHandler(handle, callback) {
        ipcMain.handle(handle, callback);
    }
    static createWindow(id, windoe_config = this._config.windows[id]) {
        if (!windoe_config) throw new Error(`window ${id} is not defined in config!`);
        if (this._windows[id]) return this._windows[id].reload();
        // if making first window, then assign it systray on mini: 
        const assign_systray = !this.window_keys.length;
        const width = windoe_config.size.w;
        const height= windoe_config.size.h;
        let reloading = false;
        this._windows[id] = new BrowserWindow({
            icon: this._config.app_icon.ico,
            show: false, 
            width, height,
            minWidth: width,
            minHeight: height,
            autoHideMenuBar: true, 
            useContentSize: true,
            backgroundColor: '#36393f',
            frame: windoe_config.opts.show_frame,
            fullscreen: windoe_config.opts.fullscreen,
            transparent: windoe_config.opts.transparent,
            webPreferences: {
                preload: windoe_config.load,
                devTools: !app.isPackaged,
                contextIsolation: false,
            },
        });
        this._windows[id].setMenu(null);
        this._windows[id].on('minimize', event => {
            if (assign_systray && this._datastore.get('tiny-tray')) {
                this._windows[id].setSkipTaskbar(true);
                this.createTray(this._windows[id]);
                event.preventDefault();
            }
        });
        this._windows[id].on('restore', event => {
            if (assign_systray && this._datastore.get('tiny-tray')) {
                this._windows[id].setSkipTaskbar(false);
                this.destroyTray();
            }
            event.preventDefault();
            reloading = true;
        });  
        this._windows[id].on('closed', event => {
            this._windows[id] = null;
            delete this._windows[id];
            if (!assign_systray) return; // - child windows
            const other_keys = this.window_keys.filter(key => key !== id); // main window:
            for (const key of other_keys) this._windows[key].close(); // - close kids
        });
        this._windows[id].on('window-fully-rendered', ()=>{
            const can_tiny = assign_systray && !reloading && this._datastore.get('auto-tiny');
            if (this._config.dev_mode) this._windows[id].webContents.openDevTools();
            if (!can_tiny) this._windows[id].show();
            else this._windows[id].minimize();
            reloading = false;
        });
        this._windows[id].webContents.on('before-input-event', (event, input) => {
            if (input.control && input.key.toUpperCase() === 'R') {
                this.loadFileToWindow(id, windoe_config);
                event.preventDefault();
            }
        });
        this.loadFileToWindow(id, windoe_config);
    }
    // creates a system tray icon and defines its options
    static createTray(windoe) {
        this._tray = new Tray(this._config.app_icon.ico);
        const menu = this.createTrayMenu(windoe); 
        this._tray.on('double-click', ()=>windoe.show());
        this._tray.setToolTip(windoe.title);
        this._tray.setContextMenu(menu);
    }
    static createTrayMenu(windoe) {
        return Menu.buildFromTemplate([
            {label: 'Show', click: () => windoe.show()},
            {label: 'Exit', click: () => {
                app.isQuiting = true;
                app.quit();
            }},
        ]); 
    }
    static destroyTray() {
        if (!this._tray) return;
        this._tray.destroy();
        this._tray = null;
    }
    static async loadFileToWindow(id, config) {
        const windoe = this._windows[id];
        let theme = this._datastore.get('gui-theme');
        // in case of using old (now unsupported) theme
        if (!this._app_themes.includes(theme)) { // reset
            this._datastore.set('gui-theme', this._app_themes[0]);
        }
        // set/update windoe ejs data
        EJS.data('page', id);
        EJS.data('theme', theme);
        EJS.data('themes', this._app_themes);
        EJS.data('color', this._datastore.get('gui-color'));
        EJS.data('title', id !== 'main' ? capitalize(id) : '');
        for (let data_id in config.data){
            EJS.data(data_id, config.data[data_id]);
        }
        // set user agent and show/reload
        windoe.webContents.setUserAgent(this._user_agent); 
        if (windoe.isVisible()) windoe.reload();
        else windoe.loadFile(config.page);
        logger.log(`loading window: ${id}`);
        logger.log(config)
    }
    // updates the 'auto-start at system boot' feature
    static updateAutoBootMode(){
        const openAtLogin = this._datastore.get('auto-boot');
        app.setLoginItemSettings({openAtLogin});    
    }
    static launch() {
        if (this._config.handle_rejections) {
            process.on('unhandledRejection', logger.error);
        }
        app.on('ready', ()=>this.onAppReady());
        app.on('activate', ()=>this.onAppActivate());
        app.on('before-quit', ()=>this.onBeforeQuitApp());
        app.on('window-all-closed', ()=>this.onAppWindowsClosed());
        app.on('second-instance', ()=>this.onSecondInstanceLaunched());
    }
    static onAppReady() {
        // create window when electron has initialized.
        this.createWindow('main');
        this.initializeAutoUpdater();
    }
    static onAppActivate() {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (!BrowserWindow.getAllWindows().length) createMainWindow();
    }
    static onAppWindowsClosed() {
        if (process.platform !== 'darwin') app.quit();
    }
    static onBeforeQuitApp() {
        // for completeness
    }
    // someone tried to run a second instance of app
    static onSecondInstanceLaunched() {
        if (!this._config.single_instance) return;
        if (!this.main_window) return;
        if (this.main_window.isMinimized()) {
            this.main_window.restore();
        }
        this.main_window.focus();
    }
    static onAppAutoUpdaterEvent(event_id, ...event_argz) {
        this.sendUpdaterInfoToRenderer(...arguments);
    }
    // Handle automatic updates
    // triggered from createMainWindow:
    static sendUpdaterInfoToRenderer(type, info) {
        this.main_window?.webContents?.send('updater', type, info);
    }
    static initializeAutoUpdater() {
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
                onAppAutoUpdaterEvent(event, ...data);
            });
        }
        // begin checking updates:
        autoUpdater.checkForUpdates();
    }
}