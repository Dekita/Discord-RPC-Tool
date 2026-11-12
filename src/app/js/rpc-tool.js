/**
* module: RPCTool
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: Class for handling rpc
*/
import DB from "./db.js";
import RPCGUI from "./rpc-gui.js";
import {popNotification} from "./sysnote.js";
import { ACTIVITY_TYPES,DEFAULT_IMAGE_TEXTS,DEFAULT_APPLICATIONS } from "./constants.js";
import {
    inputs,
    checkboxes,
    selectors,
} from "./elements.js";

// smallest update frequencies allowed (seconds)
const MIN_RPC_FREQ = 15;
const MIN_API_FREQ = 60;

// true if value (a number, or text from an input) is a number >= min
const isFrequency = (value, min) => {
    const number = Number(value);
    return String(value).trim() !== '' && Number.isFinite(number) && number >= min;
};


/**
* ■ Main RPCTool class:
*/
export default class RPCTool {
    static async initialize() {
        this._is_running = false;
        this._connecting = false;
        this._running_since = null;
        this._loop_handle = null;
        this._retry_handle = null;
        this._resume_since = null;
        this._keep_alive = false;
        // counts loop starts and stops, so an update that finishes after
        // the loop was stopped or restarted does not schedule another
        this._loop_id = 0;
        // after a reload, discord may still show the activity sent before it
        await dekita_rpc.logout().catch(error => console.error(error));
        await RPCGUI.refreshApplicationList();
        RPCGUI.setInputsFromActivity();
        await RPCGUI.validateAppData();
        await RPCGUI.setupDekcheckBoxes();
        await RPCGUI.setupTooltips();
        RPCGUI.updateDisabledElements();
        dekita_rpc.onDisconnected(() => {
            this.onConnectionLost('Discord connection lost!');
        });
        if (await app_config.get('auto-play')) {
            // discord may not be open yet when booting, so keep retrying
            this.beginLoop(true);
        }
    }
    static get running() {
        return this._is_running;
    }
    static get connecting() {
        return this._connecting;
    }
    static get retrying() {
        return !!this._retry_handle;
    }
    // live, connecting, or waiting to retry
    static get active() {
        return this._is_running || this._connecting || this.retrying;
    }
    static flagStarted() {
        // keep original start time when reconnecting after a dropout
        this._running_since = this._resume_since || new Date();
        this._resume_since = null;
        this._is_running = true;
        this._announced_live = false;
    }
    static get runningMS() {
        if (!this._is_running) return 0;
        return (new Date() - this._running_since);
    }
    static flagStopped() {
        this._is_running = false;
    }
    static setupInitialApplications() {
        for (const application of DEFAULT_APPLICATIONS) {
            DB.createApplication(application);
        }
    }
    // checks valid config and shows an alert for each problem
    static async validateConfiguration() {
        await RPCGUI.clearAnger();
        const messages =[];
        const activity = DB.activity;
        if (!dekita_rpc.seemsFlakey(DB.application.id)) {
            messages.push(`"${DB.application.id}" does not seem like a valid Discord Application ID!`);
            RPCGUI.makeAngry('app-app-id');
        }
        if (!isFrequency(activity.rpc_freq, MIN_RPC_FREQ)) {
            messages.push(`RPC Update frequency must be a number of at least ${MIN_RPC_FREQ}!`);
            RPCGUI.makeAngry('app-rpc-freq');
        }
        if (!!activity.api_url && !dekita_rpc.isValidURL(activity.api_url)) {
            messages.push(`"${activity.api_url}" does not seem like a valid URL!`);
            RPCGUI.makeAngry('app-api-url');
        }
        if (!!activity.api_url && !isFrequency(activity.api_freq, MIN_API_FREQ)) {
            messages.push(`API Update frequency must be a number of at least ${MIN_API_FREQ}!`);
            RPCGUI.makeAngry('app-api-freq');
        }
        for (const [index, button] of activity.buttons.entries()) {
            if (!button.enabled) continue;
            if (!button.label.trim().length) {
                messages.push(`Button ${index + 1} text cannot be empty when enabled!`);
                RPCGUI.makeAngry(`app-btn${index + 1}-text`);
            }
            if (!dekita_rpc.isValidURL(button.url)) {
                messages.push(`Button ${index + 1} link must be a valid URL when enabled!`);
                RPCGUI.makeAngry(`app-btn${index + 1}-url`);
            }
        }
        for (const message of messages) {
            RPCGUI.showAlert(message);
        }
        return !messages.length;
    }

    // update current activity data from inputs
    static updateActivity() {
        const activity = DB.activity;
        activity.app_id = DB.application.id;
        activity.rpc_freq = inputs.rpc_freq;
        activity.api_url = inputs.api_url;
        activity.api_freq = inputs.api_freq;
        activity.details = inputs.details;
        activity.state = inputs.state;
        const images = [
            [selectors.image1, checkboxes.image1, inputs.img1_text, DEFAULT_IMAGE_TEXTS.image1],
            [selectors.image2, checkboxes.image2, inputs.img2_text, DEFAULT_IMAGE_TEXTS.image2],
        ];
        for (const [index, [selector, checkbox, text, default_text]] of images.entries()) {
            activity.images[index].key = selector.value !== 'none' ? selector.value : null;
            activity.images[index].text = text || default_text;
            activity.images[index].enabled = checkbox.enabled;
        }
        activity.buttons[0].url = inputs.btn1_url;
        activity.buttons[0].label = inputs.btn1_text;
        activity.buttons[0].enabled = checkboxes.button1.enabled;
        activity.buttons[1].url = inputs.btn2_url;
        activity.buttons[1].label = inputs.btn2_text;
        activity.buttons[1].enabled = checkboxes.button2.enabled;
        activity.timestamp = checkboxes.timestamp.enabled;
        activity.type = ACTIVITY_TYPES[selectors.type.value] ?? ACTIVITY_TYPES.Playing;
    }

    // retry: keep retrying every 15 seconds if login fails
    static async beginLoop(retry=false) {
        this.cancelRetry();
        this.flagStopped();
        const validated = await this.validateConfiguration();
        if (!validated) return;
        const loop_id = ++this._loop_id;
        this._connecting = true;
        await RPCGUI.updateLoginButton();
        RPCGUI.showAlert('Connecting to Discord...', 'info');
        // the main process only fetches stats urls it has saved
        DB.save();
        let client = null;
        try {
            client = await dekita_rpc.login(DB.application.id);
        } catch (error) {
            // stopped while connecting, stopLoop has already tidied up
            if (loop_id !== this._loop_id) return;
            this._connecting = false;
            await RPCGUI.updateLoginButton();
            if (retry) return this.scheduleRetry('Could not connect to Discord!');
            return RPCGUI.showAlert(error.message);
        }
        if (loop_id !== this._loop_id) return;
        this._connecting = false;
        // once running, reconnect automatically if discord drops out
        this._keep_alive = true;
        app_events.emit('logged-in', client);
        this.flagStarted();
        RPCGUI.updateDisabledElements();
        this.updateLoop(loop_id);
    }
    static async getReplacers(db_activity) {
        const return_stats = await this.updateAPI(db_activity);
        await this.addDefaultReplacers(db_activity,return_stats);
        return return_stats;
    }
    static async updateAPI(db_activity) {
        const return_stats = {};
        if (dekita_rpc.isValidURL(db_activity.api_url)) {
            const refresh_delay = parseInt(db_activity.api_freq) * 1000;
            const stats = await dekita_rpc.updateStats(db_activity.api_url, refresh_delay);
            for (const key of Object.keys(stats || {})) {
                return_stats[`{${key}}`] = stats[key];
            }
        }
        return return_stats;
    }
    static async addDefaultReplacers(db_activity, return_stats) {
        const date = new Date(), lang = [navigator.language, 'en'];
        const {timeZone} = Intl.DateTimeFormat().resolvedOptions();
        const datestringopts = {timeZone};
        const timestringopts = {hour: '2-digit', minute: '2-digit',timeZone};
        return_stats['{date-tz}'] = date.toLocaleDateString(lang, {...datestringopts, timeZoneName: 'short'});
        return_stats['{date}'] = date.toLocaleDateString(lang, datestringopts);
        return_stats['{time-tz}'] = date.toLocaleTimeString(lang, {...timestringopts, timeZoneName: 'short'});
        return_stats['{time}'] = date.toLocaleTimeString(lang, timestringopts);
        return_stats['{playtime-short}'] = dekita_rpc.shortDuration(this.runningMS);
        return_stats['{playtime}'] = dekita_rpc.logicalDuration(this.runningMS);
        return_stats['{minutes-float}'] = dekita_rpc.durationMinutes(this.runningMS);
        return_stats['{minutes}'] = Math.floor(return_stats['{minutes-float}']);
        return_stats['{region}'] = navigator.language;
        return_stats['{timezone}'] = timeZone;
        return_stats['{rpc-website}'] = "https://dekitarpg.com/rpc";
        return_stats['{rpc-support}'] = "https://discord.gg/WyTdramBkm";
    }
    // loop_id is the loop this update belongs to, see initialize
    static async updateLoop(loop_id = this._loop_id){
        if (!this._is_running || loop_id !== this._loop_id) return;
        const db_activity = DB.activity;
        const activity = {type: db_activity.type};
        const return_stats = await this.getReplacers(db_activity);
        // stopped, or another activity was picked, while fetching the stats
        if (loop_id !== this._loop_id) return;
        activity.instance = db_activity.instance;
        if (db_activity.details) activity.details = dekita_rpc.format(db_activity.details, return_stats);
        if (db_activity.state) activity.state = dekita_rpc.format(db_activity.state, return_stats);
        const buttons = db_activity.buttons.filter(button => button.enabled && !!button.label && !!button.url);
        if (buttons.length) activity.buttons = buttons.map(({label, url}) => ({label, url}));
        if (!!db_activity.images[0].key && db_activity.images[0].enabled) {
            activity.largeImageKey = db_activity.images[0].key;
            if (db_activity.images[0].text) activity.largeImageText = db_activity.images[0].text;
        }
        if (!!db_activity.images[1].key && db_activity.images[1].enabled) {
            activity.smallImageKey = db_activity.images[1].key;
            if (db_activity.images[1].text) activity.smallImageText = db_activity.images[1].text;
        }
        if (db_activity.timestamp) {
            activity.startTimestamp = this._running_since;
        }
        try {
            if (!navigator.onLine) throw new Error("offline");
            await dekita_rpc.updateActivity(activity);
            // stopped, or restarted by refreshNow, while sending
            if (loop_id !== this._loop_id) return;
            const freq = Math.max(parseInt(db_activity.rpc_freq) || MIN_RPC_FREQ, MIN_RPC_FREQ);
            this._loop_handle = setTimeout(() => this.updateLoop(loop_id), freq * 1000);
            // the live indicators show it is still running after that
            if (!this._announced_live) RPCGUI.showAlert(`You're live on Discord!`, 'success');
            this._announced_live = true;
        } catch (error) {
            if (loop_id !== this._loop_id) return;
            switch (error.message) {
                case 'timeout': return this.onConnectionLost(`RPC Disconnected because of timeout!`);
                case 'offline': return this.onConnectionLost(`Internet connection was lost!`);
            }
            if (error.message.includes('Not logged in')) {
                return this.onConnectionLost('Discord connection lost!');
            }
            // discord rejected the activity, retrying wont help
            const message = `RPC Error: ${error.message}!`;
            popNotification('Oh Noes!', message);
            RPCGUI.showAlert(message);
            this.stopLoop(true);
        }
    }
    // sends the activity now instead of waiting for the next update
    static refreshNow() {
        if (!this._is_running) return;
        if (this._loop_handle) clearTimeout(this._loop_handle);
        this._loop_handle = null;
        this.updateLoop(++this._loop_id);
    }
    // called when the connection drops while an activity is running
    static async onConnectionLost(message) {
        if (!this._is_running && !this._keep_alive) return;
        this._loop_id++;
        if (this._loop_handle) clearTimeout(this._loop_handle);
        this._loop_handle = null;
        if (this._is_running) this._resume_since = this._running_since;
        await dekita_rpc.logout();
        this.flagStopped();
        RPCGUI.updateDisabledElements();
        popNotification('Oh Noes!', message);
        this.scheduleRetry(message);
    }
    static scheduleRetry(reason, delay=15) {
        this.cancelRetry();
        RPCGUI.showAlert(`${reason} Retrying in ${delay} seconds...`, 'warning');
        this._retry_handle = setTimeout(() => {
            this._retry_handle = null;
            this.beginLoop(true);
        }, delay * 1000);
        RPCGUI.updateLoginButton();
    }
    static cancelRetry() {
        if (this._retry_handle) clearTimeout(this._retry_handle);
        this._retry_handle = null;
    }
    static async stopLoop(forced) {
        if (!forced && !this.active) return;
        this._loop_id++;
        this._connecting = false;
        this._keep_alive = false;
        this._resume_since = null;
        this.cancelRetry();
        if (this._loop_handle) clearTimeout(this._loop_handle);
        this._loop_handle = null;
        this.flagStopped();
        await dekita_rpc.logout();
        RPCGUI.updateDisabledElements();
        await RPCGUI.showAlert(`Activity stopped`, 'info');
    }
}
