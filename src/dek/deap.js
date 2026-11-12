/**
* system: DEAP - Dekitas Electron App Project
* author: dekitarpg@gmail.com
*
* This module handles creating an electron application
* it uses various configuration options to determine
* how windows behave, and the pages loaded.
*
*/
const {app, dialog, ipcMain, shell, BrowserWindow, Menu, Tray} = require('electron');
const { autoUpdater } = require("electron-updater");
const logger = require('./logger')(__filename);
const EJS = require('ejs-electron');
const DataStore = require('./store');
const {isHttpURL, parseThemeVariables} = require('../shared/validate');
const {isEditableConfig, resolveAppFile, isOwnPage} = require('./ipc-validators');
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
const DEFAULT_THEME = 'slate-dark';
// old theme name => new theme name (dropped themes use the default)
const RENAMED_THEMES = {
    'dek-dark': 'slate-dark',
    'dek-light': 'slate-light',
    'khakii': 'olive-smoke',
    'metroid1': 'violet-lime',
    'metroid2': 'copper-steel',
    'nature1': 'forest-night',
    'nature2': 'forest-day',
    'nature3': 'lavender-dusk',
    'purple1': 'plum-night',
    'purple2': 'indigo-night',
};

// root folder for app source files (src)
const SOURCE_DIR = path.join(__dirname, '..');

// reads the colors used for a themes picker tile from its css
function getThemeSwatch(css) {
    const vars = parseThemeVariables(css);
    const resolve = key => {
        let value = vars[key];
        for (let i = 0; value?.startsWith('var(') && i < 5; i++) {
            value = vars[value.match(/--dek-([a-z0-9-]+)/)?.[1]];
        }
        return value;
    };
    return {
        body: resolve('body-color'),
        text: resolve('text-color'),
        primary: resolve('primary-normal'),
        secondary: resolve('secondary-normal'),
        success: resolve('success-normal'),
    };
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
    // windows uses the .ico file, linux and mac need a png
    static get app_icon() {
        const {ico, png} = this._config.app_icon;
        return process.platform === 'win32' ? ico : png;
    }
    /**
    * setup app using given config
    * returns false if another instance of the app is already running
    */
    static setup(config={}) {
        this._tray = null;
        this._windows = {};
        this._config = config;
        if (!this.setInstanceLock(!config.dev_mode && config.single_instance)) {
            app.quit();
            return false;
        }
        // setup global logfile
        const log_file = path.join(app.getPath('logs'), 'errors.log');
        this.rotateLogFile(log_file);
        logger.setGlobalOptions({
            ...config.logger,
            file_options: {
                filename: log_file,
                options: {flags: 'a', encoding: 'utf8'},
            },
        });
        this.setupDefaultEJS();
        this.setupDefaultIPC();
        this.setThemes(config.themes_dir);
        this.setDatastore({
            filename: "[dekita.rpc.data]",
            defaults: config.data_store,
        });
        this.setUserAgent("dekitarpg.com");
        logger.info(app.getAppPath());
        return true;
    }
    // keeps the error log from growing forever: once it passes
    // the size limit it is moved to errors.old.log and restarted.
    static rotateLogFile(log_file, max_bytes = 1024 * 1024) {
        try {
            if (fs.statSync(log_file).size < max_bytes) return;
            fs.renameSync(log_file, log_file.replace(/\.log$/, '.old.log'));
        } catch (error) {
            if (error.code !== 'ENOENT') console.error(error);
        }
    }
    static setThemes(dir) {
        this._theme_files = fs.readdirSync(dir).filter(file => file.endsWith('.css'));
        this._app_themes = this._theme_files.map(file => file.replace('.css', ''));
        // a few colors from each theme, used to draw the theme picker tiles
        this._theme_swatches = {};
        for (const file of this._theme_files) {
            const css = fs.readFileSync(path.join(dir, file), 'utf8');
            this._theme_swatches[file.replace('.css','')] = getThemeSwatch(css);
        }
        // add custom theme to the theme menu:
        this._app_themes.unshift('custom');
    }
    // returns false if the lock is needed, but another instance holds it
    static setInstanceLock(single) {
        return !single || app.requestSingleInstanceLock({});
    }
    static setDatastore(store_options) {
        this._datastore = new DataStore(store_options);
        // first run: save the defaults, so values made at random (eg: the
        // uuid) are the same on the next launch
        if (!fs.existsSync(this._datastore.path)) this._datastore.save();
    }
    static setUserAgent(agent_str) {
        this._user_agent = `${APP_NAME} ${APP_VERSION} ${agent_str}`.trim();
    }
    static get user_agent() {return this._user_agent}
    // set default ejs data:
    static setupDefaultEJS() {
        EJS.data('devmode', this._config.dev_mode);
        EJS.data('appname', APP_NAME);
        EJS.data('version', APP_VERSION);
    }
    /**
    * ■ ipc handlers:
    * handlers throw an Error when something goes wrong. returning
    * false or null is a normal result, eg: a dialog was cancelled.
    */
    static setupDefaultIPC() {
        ipcMain.handle('get-name', () => APP_NAME);
        ipcMain.handle('get-version', () => APP_VERSION);
        ipcMain.handle('open-external', async (event, url) => {
            if (!isHttpURL(url)) throw new Error(`invalid url: ${url}`);
            await shell.openExternal(url);
            return true;
        });
        // reads a markdown file from within the app folder (eg: readme)
        ipcMain.handle('read-app-file', async (event, filename) => {
            const file = resolveAppFile(SOURCE_DIR, filename);
            if (!file) throw new Error(`cannot read file: ${filename}`);
            return await fs.promises.readFile(file, 'utf8');
        });
        // shows a save dialog and writes the given css to the chosen path
        ipcMain.handle('save-css-file', async (event, css_string) => {
            const parent = BrowserWindow.fromWebContents(event.sender);
            const filters = [{name: 'Stylesheet', extensions: ['css']}];
            const result = await dialog.showSaveDialog(parent, {filters});
            if (result.canceled || !result.filePath) return false;
            await fs.promises.writeFile(result.filePath, String(css_string), 'utf8');
            return true;
        });
        ipcMain.handle("get-config", (event, key) => {
            return this._datastore.get(key);
        });
        ipcMain.handle("set-config", (event, key, value) => {
            if (!isEditableConfig(this._config.data_store, key, value)) {
                throw new Error(`cannot set config: ${key}`);
            }
            const return_value = this._datastore.set(key, value);
            if (key === 'auto-boot') this.updateAutoBootMode();
            // other windows follow changes, eg: the help window and the theme
            for (const windoe of BrowserWindow.getAllWindows()) {
                windoe.webContents.send('config-changed', key, return_value);
            }
            return return_value;
        });
        ipcMain.handle("open-child-window", (event, id) => {
            if (!Object.hasOwn(this._config.windows, id)) throw new Error(`unknown window: ${id}`);
            this.createWindow(id);
            return true;
        });
        ipcMain.handle("window-fully-rendered", (event, id) => {
            this._windows[id]?.emit('window-fully-rendered');
        });
        ipcMain.handle("install-update", () => {
            if (app.isPackaged) autoUpdater.quitAndInstall();
        });
        ipcMain.handle("app-action", (event, id, action) => {
            const windoe = this._windows[id];
            if (!windoe) throw new Error(`unknown window: ${id}`);
            switch(action) {
                case 'maximize': {
                    if (windoe.isMaximized()) {
                        windoe.restore();
                        return false;
                    }
                    windoe.maximize();
                    return true;
                }
                case 'minimize': return windoe.minimize();
                case 'exit': return windoe.close();
            }
            throw new Error(`unknown window action: ${action}`);
        });
    }
    static addIPCHandler(handle, callback) {
        ipcMain.handle(handle, callback);
    }
    static createWindow(id, windoe_config = this._config.windows[id]) {
        if (!windoe_config) throw new Error(`window ${id} is not defined in config!`);
        // already open: bring it to the front
        if (this._windows[id]) {
            if (this._windows[id].isMinimized()) this._windows[id].restore();
            this._windows[id].show();
            return this._windows[id].focus();
        }
        // if making first window, then assign it systray on mini:
        const assign_systray = !this.window_keys.length;
        const width = windoe_config.size.w;
        const height= windoe_config.size.h;
        // true while the page reloads (ctrl+r), so auto-tiny only runs at launch
        let reloading = false;
        let has_shown = false;
        this._windows[id] = new BrowserWindow({
            icon: this.app_icon,
            show: false,
            width, height,
            minWidth: windoe_config.min?.w ?? width,
            minHeight: windoe_config.min?.h ?? height,
            autoHideMenuBar: true,
            useContentSize: true,
            backgroundColor: '#36393f',
            frame: windoe_config.opts.show_frame,
            fullscreen: windoe_config.opts.fullscreen,
            transparent: windoe_config.opts.transparent,
            webPreferences: {
                preload: windoe_config.load,
                devTools: !app.isPackaged,
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true,
            },
        });
        this._windows[id].setMenu(null);
        // never allow the renderer to open new windows or navigate away,
        // external links are opened in the system browser instead.
        this._windows[id].webContents.setWindowOpenHandler(({url}) => {
            if (isHttpURL(url)) shell.openExternal(url);
            return {action: 'deny'};
        });
        this._windows[id].webContents.on('will-navigate', (event, url) => {
            if (!isOwnPage(url, windoe_config.page)) event.preventDefault();
        });
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
            if (this._config.dev_mode) this._windows[id].webContents.openDevTools({mode: 'detach'});
            if (!can_tiny) this._windows[id].show();
            else this._windows[id].minimize();
            reloading = false;
            has_shown = true;
        });
        // show the window anyway if the page never reports that it is ready
        this._windows[id].webContents.once('did-finish-load', () => {
            setTimeout(() => {
                const windoe = this._windows[id];
                if (has_shown || !windoe || windoe.isDestroyed()) return;
                logger.warn(`window ${id} did not report ready, showing it anyway`);
                windoe.show();
                has_shown = true;
            }, 10 * 1000);
        });
        this._windows[id].webContents.on('before-input-event', (event, input) => {
            if (input.control && input.key.toUpperCase() === 'R') {
                reloading = true;
                this.loadFileToWindow(id, windoe_config);
                event.preventDefault();
            }
        });
        this.loadFileToWindow(id, windoe_config);
    }
    // creates a system tray icon and defines its options
    static createTray(windoe) {
        this._tray = new Tray(this.app_icon);
        const menu = this.createTrayMenu(windoe);
        this._tray.on('double-click', ()=>windoe.show());
        this._tray.setToolTip(windoe.title);
        this._tray.setContextMenu(menu);
    }
    static createTrayMenu(windoe) {
        return Menu.buildFromTemplate([
            {label: 'Show', click: () => windoe.show()},
            {label: 'Exit', click: () => app.quit()},
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
        // themes were renamed, carry users over to the new name
        if (Object.hasOwn(RENAMED_THEMES, theme)) {
            theme = this._datastore.set('gui-theme', RENAMED_THEMES[theme]);
        }
        // in case of using old (now unsupported) theme
        if (!this._app_themes.includes(theme)) { // reset
            theme = this._datastore.set('gui-theme', DEFAULT_THEME);
        }
        // set/update shared ejs data. the page and title are passed in by
        // each windows own entry file, as ejs data is shared by all windows
        // custom theme variables are applied on top of the default theme
        EJS.data('theme', theme === 'custom' ? DEFAULT_THEME : theme);
        EJS.data('platform', process.platform);
        EJS.data('themes', this._app_themes);
        EJS.data('theme_swatches', this._theme_swatches);
        for (const data_id in config.data){
            EJS.data(data_id, config.data[data_id]);
        }
        // set user agent and show/reload
        windoe.webContents.setUserAgent(this._user_agent);
        logger.log(`loading window: ${id}`);
        if (windoe.isVisible()) return windoe.reload();
        try {
            await windoe.loadFile(config.page);
        } catch (error) {
            // eg: the load was aborted by a reload
            logger.warn(`could not load window ${id}: ${error.message}`);
        }
    }
    // updates the 'auto-start at system boot' feature
    static updateAutoBootMode(){
        const openAtLogin = this._datastore.get('auto-boot');
        app.setLoginItemSettings({openAtLogin});
    }
    static launch() {
        if (this._config.handle_rejections) {
            process.on('unhandledRejection', error => logger.error(error));
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
        if (!BrowserWindow.getAllWindows().length) this.createWindow('main');
    }
    static onAppWindowsClosed() {
        if (process.platform !== 'darwin') app.quit();
    }
    static onBeforeQuitApp() {
        // write any pending settings before closing
        this._datastore.flush();
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
        if (event_id === 'error') logger.error(event_argz[0]);
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
                this.onAppAutoUpdaterEvent(event, ...data);
            });
        }
        // begin checking updates:
        // failures are also sent as an 'error' event, which logs them
        autoUpdater.checkForUpdates().catch(() => {});
    }
}
