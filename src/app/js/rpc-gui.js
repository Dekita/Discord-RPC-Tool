/**
* module: RPCGUI
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: Class for gui updates etc
*/
import DB from "./db.js";
import RPCTool from './rpc-tool.js';
import RPCGUI_ApplicationsList from "./gui/application-list.js";
import RPCGUI_ActivityList from './gui/activity-list.js';
import RPCGUI_ActivityPreview from './gui/preview.js';
import RPCGUI_Toaster from './gui/toaster.js';
import { API_URLS, ACTIVITY_TYPES } from "./constants.js";

import {
    queryAll,
    getElement,
} from "./helpers.js";

import {
    inputs,
    checkboxes,
    selectors,
    buttons, 
    areas, 
    labels,
    activity_preview,
} from "./elements.js";



/**
* LAUNCH_STATES
* how the launch button and status pills look for each connection state
*/
const LAUNCH_STATES = {
    ready: {
        klass: 'btn-success', pill: 'Ready',
        html: '<i class="fas fa-play me-2"></i><span>Launch activity</span>',
    },
    connecting: {
        klass: 'btn-warning', pill: 'Connecting',
        html: '<i class="fas fa-spinner fa-pulse me-2"></i><span>Connecting...</span>',
    },
    retrying: {
        klass: 'btn-warning', pill: 'Reconnecting',
        html: '<i class="fas fa-sync-alt fa-spin me-2"></i><span>Retrying...</span>',
    },
    live: {
        klass: 'btn-danger', pill: 'Live on Discord',
        html: '<i class="fas fa-stop me-2"></i><span>Stop</span><small class="launch-time"></small>',
    },
};

/**
* ■ RPCGUI class handles all gui modifications/updates:
* @public_export 
*/
export default class RPCGUI {

    // true while the gui itself is filling in the inputs. the switches and
    // dropdowns fire their change events then too, those must not autosave
    static get quiet() {return this._quiet > 0}
    static silently(callback) {
        this._quiet = (this._quiet || 0) + 1;
        try {
            return callback();
        } finally {
            this._quiet--;
        }
    }

    static async refreshApplicationList() {
        await RPCGUI_ApplicationsList.refresh();
        await RPCGUI_ActivityList.refresh();
        app_events.emit('gui-refresh-applications-list');
    }

    static async refreshActivityList() {
        await RPCGUI_ActivityList.refresh();
        app_events.emit('gui-refresh-activities-list');
    }


    static async setupDekcheckBoxes() {
        for (const id of ['auto-boot','auto-play','auto-tiny','tiny-tray','show-welcome']) {
            const box = checkboxes[id.replace('-', '_')];
            box.enabled = await app_config.get(id);
            box.addEventListener('click', async event=>{
                await app_config.set(id, event.target.enabled);
            });
        }
    }

    // tooltips:
    static async setupTooltips() {
        const query = '[data-bs-toggle="tooltip"]';
        const tooltips = [].slice.call(document.querySelectorAll(query));
        this._ttips = tooltips.map(e => new bootstrap.Tooltip(e, {
            trigger: 'hover focus', 
            // elements can ask for another side with data-bs-placement
            placement: e.dataset.bsPlacement || 'bottom', 
            // boundary: document.body,
            // container: document.body, 
            html: true,
            delay: {show: 25, hide: 5},
        }));
    }
    static async closeAllTooltips() {
        this._ttips.forEach(tip => tip.hide())
    }


    static setInputsFromActivity() {
        const activity = DB.activity;
        this.silently(() => {
            inputs.rpc_freq = activity.rpc_freq;
            inputs.api_url = activity.api_url;
            inputs.api_freq = activity.api_freq;
            inputs.details = activity.details;
            inputs.state = activity.state;
            inputs.img1_text = activity.images[0].text;
            inputs.img2_text = activity.images[1].text;
            inputs.btn1_text = activity.buttons[0].label;
            inputs.btn1_url = activity.buttons[0].url;
            inputs.btn2_text = activity.buttons[1].label;
            inputs.btn2_url = activity.buttons[1].url;
            checkboxes.image1.enabled = activity.images[0].enabled;
            checkboxes.image2.enabled = activity.images[1].enabled;
            checkboxes.button1.enabled = activity.buttons[0].enabled;
            checkboxes.button2.enabled = activity.buttons[1].enabled;
            checkboxes.timestamp.enabled = activity.timestamp;
            const type_names = Object.keys(ACTIVITY_TYPES);
            selectors.type.setToValue(type_names.find(name => ACTIVITY_TYPES[name] === activity.type) || type_names[0]);
            this.refreshAppAssetSelectors(activity);
        });
    }

    // pull activity text from the dev portal application details/summary
    static async setDetailsFromAppData() {
        inputs.details = DB.application.description || DB.application.name || '';
        getElement('app-details').dispatchEvent(new Event('input'));
    }
    static async setStateFromAppData() {
        inputs.state = DB.application.summary || '';
        getElement('app-state').dispatchEvent(new Event('input'));
    }

    // fills the image dropdowns with the applications art assets. until
    // they are fetched from discord, only the activities own saved images
    // are listed, so saving the activity keeps them as they are
    static refreshAppAssetSelectors(activity=DB.activity) {
        const assets = DB.application.assets;
        this.silently(() => {
            for (const [index, selector] of [selectors.image1, selectors.image2].entries()) {
                const key = activity.images[index].key;
                let names = assets ? Object.keys(assets).sort((a, b) => a.localeCompare(b)) : [];
                if (!assets && key) names = [key];
                names.unshift('none');
                selector.setOptions(names, Math.max(names.indexOf(key), 0), assets || {});
            }
        });
    }

    static async validateAppData(forced=false) {
        const app_id = DB.application.id;
        const activity = DB.activity;
        if (DB.application.assets === null || forced) {
            await this.refreshAppDetails(app_id, activity);
            await this.refreshAppAssets(app_id, activity);
        }
        if (this.refreshIsStillValid(app_id, activity)) this.refreshAppAssetSelectors(activity);
        await this.updatePreview();
        DB.save();
    }



    static async updateDisabledElements() {
        await this.updateLoginButton();
        await this.updateDeleteButton();
    }
    static async updateLoginButton(launching=false) {
        let state = 'ready';
        if (launching || RPCTool.connecting) state = 'connecting';
        else if (RPCTool.retrying) state = 'retrying';
        else if (RPCTool.running) state = 'live';
        const {klass, html, pill} = LAUNCH_STATES[state];
        buttons.launch_activity.classList.remove('btn-success', 'btn-warning', 'btn-danger');
        buttons.launch_activity.classList.add(klass);
        buttons.launch_activity.innerHTML = html;
        // body state drives the live dots on the app and activity lists
        document.body.dataset.rpcState = state;
        areas.status_pill.className = `status-pill ${state}`;
        areas.status_pill.querySelector('span').textContent = pill;
        activity_preview.live_badge.classList.toggle('d-none', state !== 'live');
        this.updateLiveTicker(state === 'live');
    }
    // keeps the 'live for' and preview elapsed times counting while live
    static updateLiveTicker(live) {
        clearInterval(this._live_ticker);
        if (!live) return RPCGUI_ActivityPreview.refreshElapsed();
        const tick = () => {
            const time = RPCGUI_ActivityPreview.refreshElapsed();
            const label = buttons.launch_activity.querySelector('.launch-time');
            if (label) label.textContent = `live for ${time}`;
        };
        this._live_ticker = setInterval(tick, 1000);
        tick();
    }
    static async updateDeleteButton(){
        // activity menu (and its delete button) is not always rendered
        if (!buttons.delete_activity) return;
        buttons.delete_activity.removeAttribute('disabled');
        if (RPCTool.running) buttons.delete_activity.setAttribute('disabled', true);
    }


    static async makeAngry(element_or_id) {
        if (!element_or_id.id) {
            element_or_id = getElement(element_or_id)
        }
        element_or_id?.classList.add('angry');
    }
    static async clearAnger() {
        for (const element of queryAll('.angry')) {
            element.classList.remove('angry');
        }
    }



    static async updatePreview() {
        await RPCGUI_ActivityPreview.refresh();
    }


    

    static async showAlert(message, type='danger', clear_div=false) {
        RPCGUI_Toaster.cookBread(type, message, !clear_div);
    }

    static async updateUserCounters() {
        try {
            labels.user_count = await dekita_rpc.getUserCounter();
        } catch (error) {
            console.error(error);
        }
    }


    // !move elsewhere:..

    // applications only fetch their details once selected, so fetch the
    // missing names up front for the app icon tooltips
    static async fillMissingAppNames() {
        let changed = false;
        for (const [, application] of DB.entries()) {
            if (application.name) continue;
            const details = await this.fetchAppDetails(application.id);
            if (details.error || !details.name) continue;
            application.name = details.name;
            changed = true;
        }
        if (changed) DB.save();
    }

    static refreshIsStillValid(app_id, activity) {
        if (app_id !== DB.application.id) return false; 
        if (activity !== DB.activity) return false; 
        return true;
    }

    static async refreshAppDetails(app_id, activity) {
        const details = await this.fetchAppDetails(app_id);
        if (details.error) return console.error(details.error);
        if (!this.refreshIsStillValid(app_id, activity)) return;
        const {name, icon, description, summary} = details;
        const argz = {APP_ID: app_id, ICON_ID: icon};
        const old_icon = DB.application.icon;
        DB.application.name = name;
        DB.application.description = description;
        DB.application.summary = summary;
        if (icon) {
            DB.application.icon = dekita_rpc.format(API_URLS.icon, argz);
        } else {
            DB.application.icon = "https://cdn.discordapp.com/embed/avatars/0.png";
        }
        // redraw the app icons now, or a new icon only shows up after
        // the next time an app is selected
        if (DB.application.icon !== old_icon) await RPCGUI_ApplicationsList.refresh();
    }
    static async refreshAppAssets(app_id, activity) {
        const assets = await this.fetchAppAssets(app_id);
        if (assets.error) return console.error(assets.error);
        if (!this.refreshIsStillValid(app_id, activity)) return;
        DB.application.assets = {};
        for (const asset of assets) {
            const argz = {APP_ID: app_id, ASSET_ID: asset.id};
            const data = dekita_rpc.format(API_URLS.asset, argz);
            DB.application.assets[asset.name] = data;
        }
    }
    static async fetchAppDetails(APP_ID) {
        return await this.fetchJSON(API_URLS.rpc, {APP_ID});
    }
    static async fetchAppAssets(APP_ID) {
        return await this.fetchJSON(API_URLS.assets, {APP_ID});
    }
    static async fetchJSON(url, obj) {
        try {
            const api = dekita_rpc.format(url, obj);
            const result = await fetch(api);
            if (!result.ok || result.status !== 200) {
                throw new Error("BAD FETCH REPLY!");
            }
            return await result.json();
        } catch (error) {
            console.error(error);
            return {error};
        }
    }


}