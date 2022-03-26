/**
* system: Discord RPCTool
* author: dekitarpg@gmail.com
*/

/**
* ■ Various Requirements:
*/
const fs = require('fs');
const path = require('path');
const electron = require("electron");
const getJSON = require('bent')('json');
const DiscordRPC = require('discord-rpc');
let rpc, last_stats, stats={p:'??',s:'??',players:'??',servers:'??'};

/**
* ■ config module:
* used to get/set app config settings
*/
class config {
    static async get(key) {
        return await electron.ipcRenderer.invoke('get-config', key);
    }
    static async set(key, value) {
        return await electron.ipcRenderer.invoke('set-config', key, value);
    }
    static async delete(key) {
        return await electron.ipcRenderer.invoke('delete-config', key);
    }
};

/**
* ■ drpc:
* used to perform other 'lower level' functions
* such as opening external urls, and rpc communications
*/
class drpc {
    static get version(){ return 'beta' }
    static get renderer(){ return electron.ipcRenderer}
    static async openExternal(path, options) {
        return electron.shell.openExternal(path, options)
    }
    static async login(clientId, callback){
        try {
            if (rpc) rpc.destroy();
            rpc = new DiscordRPC.Client({transport: 'ipc'});
            if (callback) rpc.once('ready', callback);
            await rpc.login({clientId});
            console.log('should be logged in!');
        } catch (error) {
            console.error('login error:', error);
            callback(error);
        }
    }
    static async logout(){
        if (rpc) await rpc.destroy();
    }
    static async updateStats(url, cache_time = 1000 * 60 * 5) {
        try {
            if (!last_stats || last_stats - Date.now() > cache_time){
                last_stats = Date.now();
                stats = await getJSON(url);
            }
        } catch (error) {
            console.error(`Error Fetching stats: please check data url`);
        }
        return stats;
    }
    static async updateActivity(activity) {
        return await rpc.setActivity(activity);
    }
    static async getAppPath(key='app') {
        return await electron.ipcRenderer.invoke('get-path', key);
    }
    static async openFileDialog() {
        return await electron.ipcRenderer.invoke('openFileDialog');
    }
    static async openChildWindow() {
        return await electron.ipcRenderer.invoke('open-child-window', ...arguments);
    }
    static async reloadChildWindow() {
        return await electron.ipcRenderer.invoke('reload-child-window');
    }
    static async tryReadFile(filename) {
        try {
            const file = path.join(__dirname, filename);
            await fs.promises.access(file, fs.constants.R_OK);
            return await fs.promises.readFile(file, 'utf8');
        } catch (error) {
            console.error(error)
            return error.message;
        }
    }
    // checks if string is like a discord snowflake id
    static seemsFlakey(potential_flake) {
        return /^[0-9]{14,19}$/.test(potential_flake);
    }
    // returns true if given object is a valid number
    static isValidNumber(value) {
        return typeof value === 'number' && !isNaN(value);
    }
    // returns true if given object is a valid string
    static isValidString(value) {
        return typeof value === 'string' && !!value;
    }
    // returns true if given string is a valid url
    static isValidURL(string) {
        return /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g.test(String(string));
    }
    // returns true if given string is a valid image url
    static isImageURL(string) {
        if (!this.isValidURL(string)) return false;
        return /.(jpg|gif|png|jpeg)$/i.test(string);
    }
    // format string using object properties as replacers
    // eg: format("hi NAME!", {NAME: 'mr hankey'});
    static format(str, objekt) {
        const regstr = Object.keys(objekt).join("|");
        const regexp = new RegExp(regstr,"gi");
        return str.replace(regexp, matched => {
            return objekt[matched.toLowerCase()];
        });
    }
}

/**
* ■ exports:
* allows the classes defined above to be accessed
* from within the applications renderer javascript.
*/
window.dekita_rpc = drpc;
window.app_config = config;
