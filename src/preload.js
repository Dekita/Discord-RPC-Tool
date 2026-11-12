/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*
* Preload bridge. Runs sandboxed with context isolation, so it only
* exposes a narrow set of ipc wrappers to the renderer. All node work
* (discord rpc, file access, http requests) happens in the main process.
* Renderer side helpers live in app/js/bridge.js.
*/
const {contextBridge, ipcRenderer} = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('dekita_bridge', {
    // app info
    getAppName: () => invoke('get-name'),
    getAppVersion: () => invoke('get-version'),
    getUserCount: () => invoke('get-user-count'),
    // app config (datastore)
    getConfig: key => invoke('get-config', key),
    setConfig: (key, value) => invoke('set-config', key, value),
    onConfigChanged: callback => {
        ipcRenderer.on('config-changed', (_event, key, value) => callback(key, value));
    },
    // windows
    openChildWindow: id => invoke('open-child-window', id),
    sendReadyEvent: id => invoke('window-fully-rendered', id),
    appAction: (id, action) => invoke('app-action', id, action),
    installUpdate: () => invoke('install-update'),
    onUpdater: callback => {
        ipcRenderer.on('updater', (_event, type, info) => callback(type, info));
    },
    // applications/activities data
    getAppData: () => invoke('get-app-data'),
    setAppData: applications => invoke('set-app-data', applications),
    exportAppData: application => invoke('export-app-data', application),
    importAppData: () => invoke('import-app-data'),
    // system
    openExternal: url => invoke('open-external', url),
    readAppFile: filename => invoke('read-app-file', filename),
    saveCssFile: css_string => invoke('save-css-file', css_string),
    fetchJSON: url => invoke('fetch-json', url),
    // discord rpc
    rpcLogin: client_id => invoke('rpc-login', client_id),
    rpcLogout: () => invoke('rpc-logout'),
    rpcSetActivity: activity => invoke('rpc-set-activity', activity),
    onRpcDisconnected: callback => {
        ipcRenderer.on('rpc-disconnected', () => callback());
    },
});
