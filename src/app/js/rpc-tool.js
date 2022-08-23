/**
* module: RPCTool
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: Class for handling rpc
*/
import DB from "./db.js";
import RPCGUI from "./rpc-gui.js";
import {popNotification} from "./sysnote.js";
import { DEFAULT_IMAGE_TEXTS,DEFAULT_APPLICATIONS } from "./constants.js";

import {
    getElement,
    getModal,
    getElementsByClass,
    getValue, 
    setValue,
} from "./helpers.js";
import {
    // stop_activity_modal,
    // add_application_modal,
    // active_appname_label,
    // activity_list_group,
    // applications_btn_container,

    inputs,
    checkboxes,
    selectors,
    buttons, 
    areas, 
    modals, 
    labels,
    activity_preview,
} from "./elements.js";



/**
* ■ Main RPCTool class:
*/
export default class RPCTool {
    static async initialize() {
        this._is_running = false;
        this._running_since = null;
        this._unsaved_changes = false;
        this._loop_handle = null;
        this._active_id = 0;
        this._attempted_activity = null;
        await RPCGUI.refreshApplicationList();
        await RPCGUI.setInputsFromActivity();
        await RPCGUI.validateAppData();
        await RPCGUI.setupDekcheckBoxes();
        await RPCGUI.setupTooltips();
        // await RPCGUI.updatePreview();
        this.flagSaved();
        if (await app_config.get('auto-play')) {
            this.beginLoop();
        }
    }
    static get unsaved() {
        return this._unsaved_changes;
    }
    static flagUnsaved() {
        this._unsaved_changes = true;
        RPCGUI.updateDisabledElements();
    }
    static flagSaved() {
        this._unsaved_changes = false;
        RPCGUI.updateDisabledElements();
        RPCGUI.clearAnger();
    }
    static get running() {
        return this._is_running;
    }
    static flagStarted() {
        this._running_since = new Date();
        this._is_running = true;
    }
    static get runningMS() {
        return (new Date() - this._running_since);
    }
    static flagStopped() {
        this._is_running = false;
    }
    static get activeID() {
        return this._active_id;
    }
    static setActiveID(id) {
        if (this._active_id === id) return false;
        this._active_id = id;
        return true;
    }
    // attempted id is set when try to change profile
    // but unsaved changes/profile is already running
    static get attemptedID() {
        return this._attempted_activity;
    }
    static setAttemptedID(id) {
        this._attempted_activity = id;
    }
    static setupInitialApplications() {
        for (const application of DEFAULT_APPLICATIONS) {
            DB.createApplication(application);    
        }
    }
    // static createNewActivity() {
    //     return DB.createNewEntry();
    // }
    // checks valid config and throws errors if wrong
    static async validateConfiguration() {
        await RPCGUI.clearAnger();
        const messages =[];
        const activity = DB.activity;
        if (!dekita_rpc.seemsFlakey(DB.application.id)) {
            messages.push(`"${DB.application.id}" does not seem like a valid Discord Application ID!`);
            RPCGUI.makeAngry(inputs.app_id);
        }
        if (isNaN(activity.rpc_freq) || parseInt(activity.rpc_freq) < 15) {
            messages.push(`RPC Update frequency must be a number greater than 15!`);
            RPCGUI.makeAngry(inputs.rpc_freq);
        }
        if (!!activity.api_url && activity.api_url !=='API URL' && !dekita_rpc.isValidURL(activity.api_url)) {
            messages.push(`"${activity.api_url}" does not seem like a valid URL!`);
            RPCGUI.makeAngry(inputs.api_url);
        }
        if (!!activity.api_url && (isNaN(activity.api_freq) || parseInt(activity.api_freq) < 60)) {
            messages.push(`RPC Update frequency must be a number greater than 60!`);
            RPCGUI.makeAngry(inputs.api_freq);
        }
        if (activity.buttons[0].enabled) {
            if (!activity.buttons[0].label.trim().length) {
                messages.push(`Button 1 text cannot be empty when enabled!`);
                RPCGUI.makeAngry(inputs.btn1_text);
            }
            if (!dekita_rpc.isValidURL(activity.buttons[0].url)) {
                messages.push(`Button 1 link must be a valid URL when enabled!`);
                RPCGUI.makeAngry(inputs.btn1_url);
            }
        }
        if (activity.buttons[1].enabled) {
            if (!activity.buttons[1].label.trim().length) {
                messages.push(`Button 2 text cannot be empty when enabled!`);
                RPCGUI.makeAngry(inputs.btn2_text);
            }
            if (!dekita_rpc.isValidURL(activity.buttons[1].url)) {
                messages.push(`Button 2 link must be a valid URL when enabled!`);
                RPCGUI.makeAngry(inputs.btn2_url);
            }
        }
        for (const message of messages) {
            RPCGUI.showAlert(message);
        }
        return !messages.length;
    }

    // update current activity data from inputs  
    static async updateActivity() {
        const activity = DB.activity;
        activity.app_id = DB.application.id;
        activity.rpc_freq = inputs.rpc_freq;
        activity.api_url = inputs.api_url;
        activity.api_freq = inputs.api_freq;
        activity.details = inputs.details;
        activity.state = inputs.state;
        if (selectors.image1.value !== 'none') {
            activity.images[0].key = selectors.image1.value;
        } else {
            activity.images[0].key = null;
        }
        activity.images[0].text = inputs.img1_text || DEFAULT_IMAGE_TEXTS.image1;
        activity.images[0].enabled = checkboxes.image1.enabled;
        if (selectors.image2.value !== 'none') {
            activity.images[1].key = selectors.image2.value;
        } else {
            activity.images[1].key = null;
        }
        activity.images[1].text = inputs.img2_text || DEFAULT_IMAGE_TEXTS.image2;
        activity.images[1].enabled = checkboxes.image2.enabled;
        activity.buttons[0].url = inputs.btn1_url;
        activity.buttons[0].label = inputs.btn1_text;
        activity.buttons[0].enabled = checkboxes.button1.enabled;
        activity.buttons[1].url = inputs.btn2_url;
        activity.buttons[1].label = inputs.btn2_text;
        activity.buttons[1].enabled = checkboxes.button2.enabled;
        activity.timestamp = checkboxes.timestamp.enabled;
        console.log('updated:', DB.activity)
    }

    static async beginLoop() {
        this.flagStopped();
        const validated = await this.validateConfiguration();
        if (!validated) return;
        await RPCGUI.updateLoginButton(true);
        RPCGUI.showAlert('Logging in... please wait!', 'warning');
        const app_id = DB.application.id;
        console.log('logging in as app_id:',app_id);
        dekita_rpc.login(app_id, async (error, client) => {
            if (error || !client) {
                await RPCGUI.updateLoginButton();
                return RPCGUI.showAlert(error.message || 'No Client Available!');
            }
            app_events.emit('logged-in', client);
            this.flagStarted();
            RPCGUI.updateDisabledElements();
            this.updateLoop();
        });
    }
    static async getReplacers(db_activity) {
        const return_stats = await this.updateAPI(db_activity);
        await this.addDefaultReplacers(db_activity,return_stats);
        return return_stats;
    }
    static async updateAPI(db_activity) {
        const return_stats = {};
        if (!!db_activity.api_url) {
            const refresh_delay = parseInt(db_activity.api_freq) * 1000;
            const stats = await dekita_rpc.updateStats(db_activity.api_url, refresh_delay);
            for (const key in stats) {
                if (!Object.hasOwnProperty.call(stats, key)) continue;
                return_stats[`{${key}}`] = stats[key];
            }
        } 
        console.log('api return stats:', return_stats);
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
        return_stats['{rpc-support}'] = "https://discord.gg/7dCZ3Q4eU3";
    }
    static async updateLoop(){
        const activity = {type:0};
        const db_activity = DB.activity;
        const return_stats = await this.getReplacers(db_activity);
        activity.instance = db_activity.instance;
        if (!!db_activity.details) activity.details = dekita_rpc.format(db_activity.details, return_stats);
        if (!!db_activity.state) activity.state = dekita_rpc.format(db_activity.state, return_stats);
        if (!!db_activity.buttons[0].label && !!db_activity.buttons[0].url && db_activity.buttons[0].enabled){
            const {label, url} = db_activity.buttons[0];
            activity.buttons = activity.buttons || [];
            activity.buttons.push({label, url});
        }
        if (!!db_activity.buttons[1].label && !!db_activity.buttons[1].url && db_activity.buttons[1].enabled){
            const {label, url} = db_activity.buttons[1];
            activity.buttons = activity.buttons || [];
            activity.buttons.push({label, url});
        }
        if (!!db_activity.images[0].key && db_activity.images[0].enabled) {
            activity.largeImageKey = db_activity.images[0].key;
            if (!!db_activity.images[0].text) activity.largeImageText = db_activity.images[0].text;
        }
        if (!!db_activity.images[1].key && db_activity.images[1].enabled) {
            activity.smallImageKey = db_activity.images[1].key;
            if (!!db_activity.images[1].text) activity.smallImageText = db_activity.images[1].text;
        }
        if (db_activity.timestamp) {
            activity.startTimestamp = this._running_since;
            // const end = new Date(this._running_since);
            // end.setMinutes(end.getMinutes() + 5);
            // activity.endTimestamp = end;
        }
        try {
            if (!navigator.onLine) throw new Error("offline");
            await dekita_rpc.updateActivity(activity);
            const timeout = () => this.updateLoop();
            this._loop_handle = setTimeout(timeout, 15 * 1000);
            RPCGUI.showAlert(`Activity Updated!`, 'success', true);
        } catch (error) {
            let message;
            switch (error) {
                case 'timeout': message = `RPC Disconnected because of ${error}!`; break;
                case 'offline': message = `Internet connection was lost!`; break;
                default: message = `RPC Error: ${error}!`; break;
            }
            popNotification('Oh Noes!', message);
            RPCGUI.cookBread('danger', message);
            this.stopLoop(true);
        }
    }
    static async stopLoop(forced) {
        if (!forced && !this._is_running) return;
        if (this._loop_handle) clearTimeout(this._loop_handle);
        await dekita_rpc.logout();
        this.flagStopped();
        RPCGUI.updateDisabledElements();
        await RPCGUI.showAlert(`Stopped Activity`, 'warning');
    }
}
