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
import { API_URLS } from "./constants.js";

import {
    queryAll,
    getElement,
    getElementIndex,
} from "./helpers.js";

import {
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
* ■ RPCGUI class handles all gui modifications/updates:
* @public_export 
*/
export default class RPCGUI {

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
        for (const id of ['auto-boot','auto-play','auto-tiny','tiny-tray']) {
            const box = checkboxes[id.replace('-', '_')];
            box.enabled = await app_config.get(id);
            box.addEventListener('click', async event=>{
                await app_config.set(id, event.target.enabled);
                setTimeout(async ()=>{
                    console.log(await app_config.get(id))
                }, 750);
            });
        }
    }

    // tooltips:
    static async setupTooltips() {
        const query = '[data-bs-toggle="tooltip"]';
        const tooltips = [].slice.call(document.querySelectorAll(query));
        this._ttips = tooltips.map(e => new bootstrap.Tooltip(e, {
            trigger: 'hover focus', 
            placement: 'bottom', 
            // boundary: document.body,
            // container: document.body, 
            html: true,
            delay: {show: 25, hide: 5},
        }));
    }
    static async closeAllTooltips() {
        this._ttips.forEach(tip => tip.hide())
    }


    static async setInputsFromActivity() {
        const activity = DB.activity;
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
        this.refreshAppAssetSelectors(activity);
    }

    static async refreshAppAssetSelectors(activity=DB.activity) {
        // selectors.image1.setOptions(['none']);
        // selectors.image2.setOptions(['none']);
        if (DB.application.assets === null) return;
        const img1 = activity.images[0].key, img2 = activity.images[1].key;
        const asset_names = Object.keys(DB.application.assets);
        const assets = asset_names.sort((a, b) => a.localeCompare(b));
        assets.unshift('none');
        selectors.image1.setOptions(assets, assets.indexOf(img1));
        selectors.image2.setOptions(assets, assets.indexOf(img2));
    }    

    static async validateAppData(forced=false) {
        const app_id = DB.application.id;
        const activity = DB.activity;
        if (DB.application.assets === null || forced) {
            await this.refreshAppDetails(app_id, activity);
            await this.refreshAppAssets(app_id, activity);
        }
        await this.refreshAppAssetSelectors(activity);
        RPCTool.flagSaved();
    }



    static async updateDisabledElements() {
        // await this.updateSaveButton();
        await this.updateLoginButton();
        await this.updateDeleteButton();
    }
    static async updateSaveButton(){
        buttons.save_activity.removeAttribute('disabled');
        if (!RPCTool.unsaved) buttons.save_activity.setAttribute('disabled', true);
    }
    static async updateLoginButton(launching=false) {
        // buttons.launch_activity.removeAttribute('disabled');
        // if (launching || RPCTool.unsaved) buttons.launch_activity.setAttribute('disabled', true);
        if (launching){ 
            buttons.launch_activity.classList.add('btn-warning');
            buttons.launch_activity.classList.remove('btn-success');
            buttons.launch_activity.classList.remove('btn-danger');
            buttons.launch_activity.innerHTML = `<i class="fas fa-spinner fa-pulse me-2"></i><span>Connecting</span>`;
        } else if (RPCTool.running) {
            buttons.launch_activity.classList.add('btn-danger');
            buttons.launch_activity.classList.remove('btn-success');
            buttons.launch_activity.classList.remove('btn-warning');
            buttons.launch_activity.innerHTML = `<i class="fas fa-stop me-2"></i><span>Stop</span>`;
        } else {
            buttons.launch_activity.classList.add('btn-success');
            buttons.launch_activity.classList.remove('btn-danger');
            buttons.launch_activity.classList.remove('btn-warning');
            buttons.launch_activity.innerHTML = `<i class="fas fa-play me-2"></i><span>Launch</span>`;
        }
    }
    static async updateDeleteButton(){
        buttons.delete_activity.removeAttribute('disabled');
        if (RPCTool.running) buttons.delete_activity.setAttribute('disabled', true);
    }


    static async makeAngry(element_or_id) {
        if (!element_or_id.id) {
            element_or_id = getElement(element_or_id)
        }
        element_or_id.classList.add('angry');
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
        labels.user_count = await dekita_rpc.getUserCounter();
    }


    // !move elsewhere:..

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
        DB.application.name = name;
        DB.application.description = description;
        DB.application.summary = summary;
        if (icon) {
            DB.application.icon = dekita_rpc.format(API_URLS.icon, argz);
        } else {
            DB.application.icon = "https://cdn.discordapp.com/embed/avatars/0.png";
        }
    }
    static async refreshAppAssets(app_id, activity) {
        const assets = await this.fetchAppAssets(app_id);
        if (assets.error) return console.error(assets.error);
        if (!this.refreshIsStillValid(app_id, activity)) return;
        DB.application.assets = {};
        for (const [index, asset] of assets.entries()) {
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
            console.log(error)
            return {error};
        }
    }


}