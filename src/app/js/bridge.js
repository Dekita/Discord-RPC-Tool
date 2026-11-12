/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*
* Renderer side globals used throughout the app:
* - window.app_config: get/set app config settings
* - window.dekita_rpc: helpers + wrappers around the preload bridge
* - window.app_events: simple event emitter for gui events
*
* Loaded as a classic script before the app modules, so these
* globals exist by the time any module runs.
*/
(function() {"use strict";
    const bridge = window.dekita_bridge;
    const validate = window.dek_validate;
    let stats = {p:'??', s:'??', players:'??', servers:'??'};
    let last_stats = 0;
    let last_stats_url = null;

    /**
    * ■ app_events:
    * minimal node style event emitter
    */
    class AppEvents {
        #listeners = new Map();
        on(event, listener) {
            if (!this.#listeners.has(event)) this.#listeners.set(event, []);
            this.#listeners.get(event).push(listener);
            return this;
        }
        once(event, listener) {
            const wrapper = (...args) => {
                this.off(event, wrapper);
                listener(...args);
            };
            return this.on(event, wrapper);
        }
        off(event, listener) {
            const list = this.#listeners.get(event);
            if (list) this.#listeners.set(event, list.filter(l => l !== listener));
            return this;
        }
        emit(event, ...args) {
            const list = this.#listeners.get(event);
            if (!list || !list.length) return false;
            for (const listener of [...list]) listener(...args);
            return true;
        }
    }

    // calls a preload bridge function. ipc handlers throw an Error when
    // something fails, electron adds its own prefix to the message, which
    // is removed here so the message can be shown to the user as is.
    async function invoke(name, ...args) {
        try {
            return await bridge[name](...args);
        } catch (error) {
            const message = String(error.message);
            throw new Error(message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
        }
    }

    /**
    * ■ config module:
    * used to get/set app config settings
    */
    class config {
        static async get(key) {return await invoke('getConfig', key)}
        static async set(key, value) {return await invoke('setConfig', key, value)}
        // callback(key, value) runs when any window changes a setting
        static onChange(callback) {bridge.onConfigChanged(callback)}
    }

    // split milliseconds into whole years, days, hours, minutes
    function splitDuration(duration_ms) {
        let minutes = Math.max(duration_ms, 0) / 60000;
        const years = Math.floor(minutes / 525600); minutes -= years * 525600;
        const days = Math.floor(minutes / 1440); minutes -= days * 1440;
        const hours = Math.floor(minutes / 60); minutes -= hours * 60;
        return {years, days, hours, minutes: Math.floor(minutes)};
    }
    const DURATION_UNITS = ['years', 'days', 'hours', 'minutes'];

    /**
    * ■ drpc:
    * used to perform other 'lower level' functions
    * such as opening external urls, and rpc communications
    */
    class drpc {
        static uuid() {return crypto.randomUUID()}
        static async getAppName() {return await invoke('getAppName')}
        static async getAppVersion() {return await invoke('getAppVersion')}
        static async openExternal(url) {
            if (!this.isValidURL(url)) return false;
            return await invoke('openExternal', url);
        }
        // logs into discord rpc with the given client id.
        // returns {user}, throws if discord could not be reached
        static async login(clientId) {
            return await invoke('rpcLogin', clientId);
        }
        static async logout() {
            return await invoke('rpcLogout');
        }
        static async updateStats(url, cache_time = 1000 * 60 * 5) {
            try {
                const expired = Date.now() - last_stats > cache_time;
                if (!last_stats || expired || url !== last_stats_url) {
                    last_stats = Date.now();
                    last_stats_url = url;
                    stats = await invoke('fetchJSON', url);
                }
            } catch (error) {
                console.error(`Error Fetching stats: please check data url.`, error.message);
            }
            return stats;
        }
        static onDisconnected(callback) {
            bridge.onRpcDisconnected(callback);
        }
        // returns {applications, problem}, see dek/app-data.js
        static async getAppData() {
            return await invoke('getAppData');
        }
        static async setAppData(applications) {
            return await invoke('setAppData', applications);
        }
        static async exportAppData(application) {
            return await invoke('exportAppData', application);
        }
        static async importAppData() {
            return await invoke('importAppData');
        }
        static async updateActivity(activity) {
            return await this.raceTimeout(invoke('rpcSetActivity', activity));
        }
        static async saveFileForCSS(css_string) {
            return await invoke('saveCssFile', css_string);
        }
        static async openChildWindow(id) {
            return await invoke('openChildWindow', id);
        }
        static sendReadyEvent(windowname) {
            invoke('sendReadyEvent', windowname).catch(console.error);
        }
        static performApplicationUpdate() {
            invoke('installUpdate').catch(console.error);
        }
        static onUpdater(callback) {
            bridge.onUpdater(callback);
        }
        // returns the user count as compact text, or ?? if it is unknown
        static async getUserCounter() {
            const counter = await invoke('getUserCount');
            if (!this.isValidNumber(counter)) return '??';
            const {locale} = Intl.DateTimeFormat().resolvedOptions();
            return this.formatNumberCompact(counter, locale);
        }
        static async readAppFile(filename) {
            return await invoke('readAppFile', filename);
        }
        // checks if string is like a discord snowflake id
        static seemsFlakey(potential_flake) {
            return validate.isSnowflake(potential_flake);
        }
        // returns true if given object is a valid number
        static isValidNumber(value) {
            return typeof value === 'number' && !isNaN(value);
        }
        // returns true if given object is a valid string
        static isValidString(value) {
            return typeof value === 'string' && !!value;
        }
        // returns true if given string is a valid http(s) url
        static isValidURL(string) {
            return validate.isHttpURL(string);
        }
        // format string using object properties as replacers
        // eg: format("hi NAME!", {NAME: 'mr hankey'});
        static format(str, objekt) {
            str = String(str ?? '');
            const keys = Object.keys(objekt);
            if (!keys.length) return str;
            const escape = key => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regexp = new RegExp(keys.map(escape).join("|"), "g");
            return str.replace(regexp, matched => objekt[matched]);
        }
        // the units to show, from the largest non zero unit down to minutes
        static _durationUnits(duration) {
            const first = DURATION_UNITS.findIndex(unit => duration[unit] > 0);
            return DURATION_UNITS.slice(first === -1 ? DURATION_UNITS.length - 1 : first);
        }
        static durationMinutes(duration_ms) {
            return (duration_ms / 60000).toFixed(5);
        }
        // eg: "1 day, 1 hour" - the two largest units that are not zero
        static logicalDuration(duration_ms) {
            const duration = splitDuration(duration_ms);
            const names = {years: 'year', days: 'day', hours: 'hour', minutes: 'minute'};
            const units = this._durationUnits(duration);
            if (units.length === 1 && duration.minutes < 1) return "less than a minute";
            // zero units after the largest are skipped, eg: 1 day, 5 minutes
            const shown = [units[0], ...units.slice(1).filter(unit => duration[unit] > 0)];
            return shown.slice(0, 2).map(unit => {
                const value = duration[unit];
                return `${value} ${names[unit]}${value === 1 ? '' : 's'}`;
            }).join(', ');
        }
        // eg: "1d, 1h, 3m" - every unit from the largest non zero unit
        static shortDuration(duration_ms) {
            const duration = splitDuration(duration_ms);
            return this._durationUnits(duration).map(unit => {
                return `${duration[unit]}${unit[0]}`;
            }).join(', ');
        }
        // debounce some callback to only run every delay ms
        static debounce(callbaque, delay = 1000) {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => callbaque(...args), delay);
            }
        }
        // throttle some callback to only run every delay ms
        static throttle(callbaque, delay = 1000) {
            let waiting_args = null;
            let waiting = false;
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
        static formatNumber(number, region) {
            return new Intl.NumberFormat(region).format(number);
        }
        static formatNumberCompact(number, region) {
            return new Intl.NumberFormat(region, {notation:'compact'}).format(number);
        }
        // race some promise against a timeout.
        // rejects with an Error whose message is 'timeout'
        static raceTimeout(promise, timeout = 5000) {
            let handle;
            return Promise.race([promise, new Promise((_, reject) => {
                handle = setTimeout(() => reject(new Error('timeout')), timeout);
            })]).finally(() => clearTimeout(handle));
        }
        static async minimize(window_id) {
            return await invoke('appAction', window_id, 'minimize');
        }
        static async maximize(window_id) {
            return await invoke('appAction', window_id, 'maximize');
        }
        static async exit(window_id) {
            return await invoke('appAction', window_id, 'exit');
        }
    }

    window.dekita_rpc = drpc;
    window.app_config = config;
    window.app_events = new AppEvents();
})();
