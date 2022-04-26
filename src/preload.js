/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*/

/**
* ■ Various Requirements:
*/
const fs = require('fs');
const path = require('path');
const electron = require("electron");
const getJSON = require('bent')('json');
const {DateTime, Duration} = require("luxon");
const RPCClient = require('discord-rpc').Client;
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
    static uuid(){return require('crypto').randomUUID()}
    static get renderer(){ return electron.ipcRenderer}
    static get chroma(){ return require('chroma-js')}
    static async getAppName(){ 
        return await this.renderer.invoke('get-name');
    }
    static async getAppVersion(){ 
        return await this.renderer.invoke('get-version');
    }
    static async openExternal(path, options) {
        return electron.shell.openExternal(path, options);
    }
    static async login(clientId, callback){
        try {
            if (rpc) rpc.destroy();
            rpc = new RPCClient({transport: 'ipc'});
            if (callback) rpc.once('ready', callback);
            await rpc.login({clientId});
            console.log('should be logged in!');
        } catch (error) {
            console.error('login error:', error);
            callback(error);
        }
    }
    static async logout(){
        if (rpc) rpc.destroy();
        rpc = null;
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
        return await this.raceTimeout(rpc.setActivity(activity));
    }
    static async getAppPath(key='app') {
        return await this.renderer.invoke('get-path', key);
    }
    static async openFileDialog() {
        return await this.renderer.invoke('openFileDialog');
    }
    static async saveFileForCSS(css_string) {
        const filename = await this.renderer.invoke('saveFileDialog', ['css']);
        if (filename.canceled) return;
        this.trySaveFile(filename.filePath, css_string);
    }
    static async openChildWindow() {
        return await this.renderer.invoke('open-child-window', ...arguments);
    }
    static async reloadChildWindow() {
        return await this.renderer.invoke('reload-child-window');
    }
    static sendReadyEvent(windowname) {
        this.renderer.invoke('window-fully-rendered', windowname);
    }
    static performApplicationUpdate() {
        this.renderer.invoke('install-update');
    }
    static async trySaveFile(filepath, data) {
        try {
            return await fs.promises.writeFile(filepath, data, 'utf8');
        } catch (error) {
            console.error(error)
            return error.message;
        }
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
        let url;
        try{url = new URL(string);
        } catch { return false };
        return url.protocol.startsWith('http');
        // return /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g.test(String(string));
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
        const regexp = new RegExp(regstr, "gi");
        return str.replace(regexp, matched => objekt[matched]);
    }
    static _durationTemplate(duration_ms) {
        let forced = false;
        const base_dur = Duration.fromMillis(duration_ms);
        const shift_args = ['years', 'days', 'hours', 'minutes'];
        const duration = base_dur.shiftTo(...shift_args).toObject();
        return [duration, shift_args.filter(type => {
            if (duration[type] > 0) forced = true;
            return forced || type === 'minutes';
        }).join(', ')];
    }
    static logicalDuration(duration_ms) {
        const [duration, template] = this._durationTemplate(duration_ms);
        const y = parseInt(duration.years);
        const d = parseInt(duration.days);
        const h = parseInt(duration.hours);
        const m = parseInt(duration.minutes);
        if (m < 1) return "less than a minute";
        const formatted = this.format(template, {
            years: `${y} year${y > 1 ? 's' : ''}`,
            days: `${d} day${d > 1 ? 's' : ''}`,
            hours: `${h} hour${h > 1 ? 's' : ''}`,
            minutes: `${m} minute${m > 1 ? 's' : ''}`,
            // seconds: `${parseInt(duration.seconds)}s`,
        });
        return formatted.split(',').slice(-2).join(',');;
    };
    static shortDuration(duration_ms) {
        const [duration, template] = this._durationTemplate(duration_ms);
        return this.format(template, {
            years: `${parseInt(duration.years)}y`,
            days: `${parseInt(duration.days)}d`,
            hours: `${parseInt(duration.hours)}h`,
            minutes: `${parseInt(duration.minutes)}m`,
            // seconds: `${parseInt(duration.seconds)}s`,
        });
    };
    // debounce some callback to only run every delay ms
    static debounce(callbaque, delay = 1000) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                callbaque(...args);
            }, delay);
        }
    }
    // throttle some callback to only run every delay ms
    static throttle(callbaque, delay = 1000) {
        let waiting = false;
        let waiting_args;
        const timeout = () => {
            if (waiting_args === null) {
                waiting = false;
            } else {
                callbaque(...waiting_args);
                waiting_args = null;
                setTimeout(timeout, delay);
            }
        }
        return (...args) => {
            if (waiting) {
                waiting_args = args;
                return;
            }
            waiting = true;
            callbaque(...args);
            setTimeout(timeout, delay);
        }
    }
    // race some promise against a timeout.
    static raceTimeout(promise, timeout = 5000) {
        return Promise.race([promise, new Promise((_, reject) => {
            setTimeout(() => reject("timeout"), timeout);
        })]);
    }
}

/**
* ■ exports:
* allows the classes defined above to be accessed
* from within the applications renderer javascript.
*/
window.dekita_rpc = drpc;
window.app_config = config;
