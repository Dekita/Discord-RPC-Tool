/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*
* Stores the users applications/activities in a json file within
* the app data folder, and handles exporting/importing applications.
*/
const {dialog, BrowserWindow} = require('electron');
const stringify = require("json-stringify-pretty-compact");
const DataStore = require('./store');
const {isHttpURL} = require('../shared/validate');
const {cleanImportedApplication, isSavedApiURL} = require('./ipc-validators');
const fs = require('fs');

// max size of an imported application file
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const FILE_FILTERS = [{name: 'RPC Application', extensions: ['json']}];

// makes a filesystem friendly filename for an application
function exportFilename(application) {
    const name = String(application.name || application.id || 'application');
    return `${name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'application'}.rpc.json`;
}

module.exports = function registerAppDataHandlers(DEAP) {
    const store = new DataStore({
        filename: "[dekita.rpc.apps]",
        defaults: {applications: null},
    });
    // applications is null if nothing has been saved yet.
    // problem is set when the saved file was broken and had to be replaced
    DEAP.addIPCHandler('get-app-data', () => {
        const problem = store.load_problem;
        return {applications: store.get('applications'), problem};
    });
    DEAP.addIPCHandler('set-app-data', (event, applications) => {
        if (!Array.isArray(applications)) throw new Error('applications must be an array');
        store.set('applications', applications);
        return true;
    });
    // shows a save dialog and writes the given application as json
    DEAP.addIPCHandler('export-app-data', async (event, application) => {
        if (!application || typeof application !== 'object') throw new Error('nothing to export');
        const parent = BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showSaveDialog(parent, {
            defaultPath: exportFilename(application),
            filters: FILE_FILTERS,
        });
        if (result.canceled || !result.filePath) return false;
        const json = stringify(application, {maxLength: 108, indent: 4});
        await fs.promises.writeFile(result.filePath, json, 'utf8');
        return true;
    });
    // shows an open dialog and returns the chosen application data
    DEAP.addIPCHandler('import-app-data', async (event) => {
        const parent = BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showOpenDialog(parent, {
            filters: FILE_FILTERS,
            properties: ['openFile'],
        });
        if (result.canceled || !result.filePaths.length) return null;
        const filepath = result.filePaths[0];
        const {size} = await fs.promises.stat(filepath);
        if (size > MAX_IMPORT_BYTES) throw new Error('File is too large!');
        let data;
        try {
            data = JSON.parse(await fs.promises.readFile(filepath, 'utf8'));
        } catch {
            throw new Error('File is not valid JSON!');
        }
        const application = cleanImportedApplication(data);
        if (!application) throw new Error('File does not contain RPC Tool application data!');
        return application;
    });
    // fetches json for an activities stats. only the stats urls saved in the
    // users activities can be fetched, so the renderer cannot use this to
    // reach any other address (eg: services on the local network)
    DEAP.addIPCHandler('fetch-json', async (event, url) => {
        if (!isHttpURL(url) || !isSavedApiURL(store.get('applications'), url)) {
            throw new Error(`url is not a saved activity stats url: ${url}`);
        }
        const response = await fetch(url, {
            headers: {'User-Agent': DEAP.user_agent},
            signal: AbortSignal.timeout(10 * 1000),
        });
        if (!response.ok) throw new Error(`bad response: ${response.status}`);
        return await response.json();
    });
    DEAP.app.on('before-quit', () => store.flush());
};
