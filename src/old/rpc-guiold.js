/**
* module: RPCGUI
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: Class for gui updates etc
*/
import DB from "./db.js";
import RPCTool from './rpc-tool.js';
import {
    getElement,
    getModal,
    getElementsByClass,
    getValue, 
    setValue,
} from "./helpers.js";

import {
    alert_notification_area,
    save_activity_btn,
    launch_activity_btn,
    delete_activity_btn,
    stop_activity_modal,
    app_preview_details,
    app_preview_state,
    app_preview_image_large,
    app_preview_image_small,
    app_preview_btn1,
    app_preview_btn2,
    toast_container,
    add_application_modal,
    confirm_add_application_btn,
    active_appname_label,
    app_preview_name,
    activity_list_group,
} from "./elements.js";



const checkBoxEnabled = id => RPCGUI.dekcheckboxes[id].enabled;
const setCheckboxEnabled = async(id, enabled=false) => {
    await RPCGUI.dekcheckboxes[id].setActive(enabled ? 0 : null);
}
const STOP_MESSAGES = {
    running: "The running activity will be stopped when switching!",
    unsaved: "If you switch activity these changes will be lost!",
}
const API_URL = {
    assets: `https://discord.com/api/oauth2/applications/APP_ID/assets`,
    asset: `https://cdn.discordapp.com/app-assets/APP_ID/ASSET_ID.png`,
    icon: `https://cdn.discordapp.com/app-icons/APP_ID/ICON_ID.png`,
    rpc: `https://discord.com/api/oauth2/applications/APP_ID/rpc`,
}
function capitalize([char1, ...rest]) {
    return char1.toUpperCase() + rest.join("");
}

/**
* ■ RPCGUI class handles all gui modifications/updates:
*/
export default class RPCGUI {
    static async setupDekcheckBoxes() {
        if (this.dekcheckboxes) return;
        this.dekcheckboxes = {};
        const activity_boxes = [
            'app-rpc-timestamp-enabled',
            'app-rpc-img1-enabled',
            'app-rpc-img2-enabled',
            'app-rpc-btn1-enabled',
            'app-rpc-btn2-enabled',
        ];
        for (const id of activity_boxes) {
            this.dekcheckboxes[id] = new DekCheckBox(id, value => {
                this.updateCheckboxText(id, value[0] === '0');
                this.updatePreview();
                RPCTool.flagUnsaved();
            });
        };
        const app_configs = [
            'auto-boot',
            'auto-play',
            'auto-tiny',
            'tiny-tray',
        ];
        for (const id of app_configs) {
            this.dekcheckboxes[id] = new DekCheckBox(`appopts-${id}`, async value => {
                await app_config.set(id, value[0] === '0');
            });
            const enabled = await app_config.get(id);
            this.dekcheckboxes[id].setActive(enabled ? 0 : null);
        }
    }
    static async updateCheckboxText(id, enabled) {
        let element = getElement(`${id}-text`);
        element = element.getElementsByTagName('span')[0];
        if (!element) return; // only edit enable/disable checkbox texts
        element.innerHTML = enabled ? 'Enabled' : 'Disabled';
        if (id === 'app-rpc-timestamp-enabled') {
            element.innerHTML += ' Timestamps';
        }
    }
    static async setupAppOpts(id) {
        const box = this.dekcheckboxes[`appopts-${id}`];
        const enabled = await app_config.get(id);
        if (box) box.setActive(enabled ? 0 : null);
    } 
    static async setupTooltips() {
        const query = '[data-bs-toggle="tooltip"]';
        const tooltips = [].slice.call(document.querySelectorAll(query));
        this._ttips = tooltips.map(e => new bootstrap.Tooltip(e, {
            trigger: 'hover focus', 
            placement: 'bottom', 
            container: 'body', 
            html: true,
            delay: 50,
        }));
    }
    static async closeAllTooltips() {
        this._ttips.forEach(tip => tip.hide())
    }
    static async validateAppData(forced=false) {
        const app_id = getValue('app-id');
        const activity = DB.activity;
        if (activity.discord_details !== null || forced) {
            await this.refreshAppDetails(app_id, activity);
            await this.refreshAppAssets(app_id, activity);
        }
        await this.refreshAppAssetSelectors(activity);
        RPCTool.flagSaved();        
    }
    static async refreshAppDetails(app_id, activity) {
        const details = await this.fetchAppDetails();
        if (!details.error) {
            const {name, icon, description, summary} = details;
            const argz = {APP_ID: app_id, ICON_ID: icon};
            activity.discord_details = {
                name, description, summary,
                icon: dekita_rpc.format(API_URL.icon, argz)
            };
        } else {
            activity.discord_details = null;
        }
    }
    static async refreshAppAssets(app_id, activity) {
        activity.discord_assets = null;
        const assets = await this.fetchAppAssets();
        if (!assets.error) {
            activity.discord_assets = {};
            for (const asset of assets) {
                const argz = {APP_ID: app_id, ASSET_ID: asset.id};
                const data = dekita_rpc.format(API_URL.asset, argz);
                activity.discord_assets[asset.name] = data;
            }
            console.log('assets:', activity.discord_assets);
        } else {
            console.log('asset error:', assets);
        }
    }
    static async refreshAppAssetSelectors(activity) {
        const img1 = "";//getValue('app-img1-key');
        const img2 = "";//getValue('app-img2-key');
        DekSelect.cache['image-select-one'].setOptions(['none']);
        DekSelect.cache['image-select-two'].setOptions(['none']);
        if (activity?.discord_assets === null) return;
        const asset_names = Object.keys(activity.discord_assets);
        const assets = asset_names.sort((a, b) => a.localeCompare(b));
        DekSelect.cache['image-select-one'].setOptions(assets, assets.indexOf(img1));
        DekSelect.cache['image-select-two'].setOptions(assets, assets.indexOf(img2));
    }
    static async fetchAppDetails() {
        const APP_ID = getValue('app-id');
        const argz = [API_URL.rpc, {APP_ID}];
        return await this.fetchJSON(...argz);
    }
    static async fetchAppAssets() {
        const APP_ID = getValue('app-id');
        const argz = [API_URL.assets, {APP_ID}];
        return await this.fetchJSON(...argz);
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
    static _checkResponseOK(response) {
        return response && response.ok && response.status === 200;
    }
    static async updateDisabledElements() {
        await this.updateSaveButton();
        await this.updateLoginButton();
        await this.updateDeleteButton();
    }
    static async updateSaveButton(){
        save_activity_btn.removeAttribute('disabled');
        if (!RPCTool.unsaved) save_activity_btn.setAttribute('disabled', true);
    }
    static async updateLoginButton(launching=false) {
        launch_activity_btn.removeAttribute('disabled');
        if (launching || RPCTool.unsaved) launch_activity_btn.setAttribute('disabled', true);
        if (launching){ 
            launch_activity_btn.classList.add('btn-warning');
            launch_activity_btn.classList.remove('btn-success');
            launch_activity_btn.classList.remove('btn-danger');
            launch_activity_btn.innerHTML = `<i class="fas fa-spinner fa-pulse me-2"></i><span>Connecting</span>`;
        } else if (RPCTool.running) {
            launch_activity_btn.classList.add('btn-danger');
            launch_activity_btn.classList.remove('btn-success');
            launch_activity_btn.classList.remove('btn-warning');
            launch_activity_btn.innerHTML = `<i class="fas fa-stop me-2"></i><span>Stop</span>`;
        } else {
            launch_activity_btn.classList.add('btn-success');
            launch_activity_btn.classList.remove('btn-danger');
            launch_activity_btn.classList.remove('btn-warning');
            launch_activity_btn.innerHTML = `<i class="fas fa-play me-2"></i><span>Launch</span>`;
        }
    }
    static async updateDeleteButton(){
        delete_activity_btn.removeAttribute('disabled');
        if (RPCTool.running) delete_activity_btn.setAttribute('disabled', true);
    }
    static async refreshActivityList() {
        const btn_container = getElement('button-container');
        btn_container.innerHTML = "";
        for (const [index, activity] of DB.entries()) {
            const activity_btn = this.createProfileButton(activity);
            activity_btn.addEventListener('click', event => {
                if (RPCTool.unsaved || RPCTool.running) {
                    const title = getElement('stop-activity-title');
                    const message = getElement('stop-activity-message');
                    if (RPCTool.running) {
                        title.innerText = "Caution: Activity Running!";
                        message.innerText = STOP_MESSAGES.running;
                    } else {
                        title.innerText = "Caution: Unsaved Changes!";
                        message.innerText = STOP_MESSAGES.unsaved;
                    }
                    RPCTool.setAttemptedID(index);
                    return stop_activity_modal.show();
                }
                if (RPCTool.setActiveID(index)) {
                    this.clearAlerts();
                    this.setInputsFromActivity();
                    this.validateAppData();
                    this.updatePreview();
                    RPCTool.flagSaved();
                    this.refreshActivityListActive();
                };
            });
            activity_btn.addEventListener('dragstart', async event => {
                event.dataTransfer.setData('dek-drag-id', event.target.id);
            });
            activity_btn.addEventListener('dragover', async event => {
                event.preventDefault();
            });
            activity_btn.addEventListener('dragenter', async event => {
                event.target.classList.add('drag-border')
                event.preventDefault();
            });
            activity_btn.addEventListener('dragleave', async event => {
                event.target.classList.remove('drag-border')
                event.preventDefault();
            });
            activity_btn.addEventListener('drop', async event => {
                const getElementIndex = element => {
                    return [...element.parentNode.children].indexOf(element);
                }
                const dragged_id = event.dataTransfer.getData('dek-drag-id')
                const dragged_element = getElement(dragged_id);
                const btn = event.target.closest('.btn')
                const old_index = getElementIndex(dragged_element);
                const new_index = getElementIndex(btn);
                DB.switchIndex(old_index, new_index);
                RPCTool.setActiveID(new_index);
                this.setInputsFromActivity();
                this.updatePreview();
                this.refreshActivityList();
            });
            if (index === RPCTool.activeID){
                activity_btn.classList.add('active');
            } 
            btn_container.append(activity_btn);
        }
        const add_new_btn = this.createProfileButton({
            html: '<i class="fas fa-plus fa-fw"></i>',
        });
        add_new_btn.addEventListener('click', event => {
            return add_application_modal.show();
        });
        btn_container.append(add_new_btn);
    }








    
    static async refreshActivityListActive(){
        const btn_container = getElement('button-container');
        const buttons = [...btn_container.getElementsByTagName("BUTTON")];
        for (const [index, button] of buttons.entries()) {
            button.classList.remove('active');
            if (index === RPCTool.activeID){
                button.classList.add('active');
            } 
        }
    }
    static createProfileButton(options) {
        const btn = document.createElement('button');
        btn.id = dekita_rpc.uuid();
        btn.setAttribute('draggable', true);
        btn.classList.add('btn', 'btn-lg', 'btn-bg', 'fw-bold', 'mt-3', 'p-0', 'btn-58');
        if (options.image) {
            const image = document.createElement('img');
            image.setAttribute('draggable', false);
            image.src = options.image;
            image.classList.add('img-fluid', 'rounded-circle');
            // image.style.maxHeight = '64px';
            btn.append(image);
        } else {
            btn.innerHTML = options.html;
        }
        return btn;
    }
    static async setInputsFromActivity() {
        const activity = DB.activity;
        active_appname_label.innerText = activity?.discord_details?.name || "App Name";

        // setValue('app-image', activity.image);
        setValue('app-rpc-frequency', activity.rpc_freq);
        setValue('app-id', activity.app_id);
        setValue('app-api-url', activity.api_url);
        setValue('app-api-frequency', activity.api_freq);
        setValue('app-api-url', activity.api_url);
        setValue('app-details', activity.details);
        setValue('app-state', activity.state);
        // setValue('app-img1-key', activity.images[0].key);
        setValue('app-img1-text', activity.images[0].text);
        setCheckboxEnabled('app-rpc-img1-enabled', activity.images[0].enabled);
        // setValue('app-img2-key', activity.images[1].key);
        setValue('app-img2-text', activity.images[1].text);
        setCheckboxEnabled('app-rpc-img2-enabled', activity.images[1].enabled);
        setValue('app-btn1-url', activity.buttons[0].url);
        setValue('app-btn1-text', activity.buttons[0].label);
        setCheckboxEnabled('app-rpc-btn1-enabled', activity.buttons[0].enabled);
        setValue('app-btn2-url', activity.buttons[1].url);
        setValue('app-btn2-text', activity.buttons[1].label);
        setCheckboxEnabled('app-rpc-btn2-enabled', activity.buttons[1].enabled);
        setCheckboxEnabled('app-rpc-timestamp-enabled', activity.timestamp);
        this.refreshAppAssetSelectors(activity);
    }
    static async showAlert(message, type='danger', clear_div=false) {
        const wrapper = document.createElement('div');
        const dismissable = !clear_div ? 'alert-dismissible' : '';
        const close_btn = '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
        wrapper.innerHTML = `<div class="mb-1 alert alert-${type} ${dismissable}" role="alert">${message} ${!!dismissable ? close_btn : ''}</div>`;
        if (clear_div) await this.clearAlerts();
        // alert_notification_area.append(wrapper);
        this.cookBread(type, message, !clear_div);
    }
    static async clearAlerts() {
        alert_notification_area.innerHTML = "";
    }
    static async updatePreview() {
        const activity = DB.activity;
        const temp_stats = {'{p}':'??', '{players}':'??', '{s}':'??', '{servers}':'??'};
        app_preview_details.innerText = dekita_rpc.format(activity.details, temp_stats);
        app_preview_state.innerText = dekita_rpc.format(activity.state, temp_stats);
        app_preview_btn1.classList.add('d-none');
        const url1valid = dekita_rpc.isValidURL(activity.buttons[0].url);
        app_preview_btn1.href = url1valid ? activity.buttons[0].url : null;
        app_preview_btn1.innerHTML = activity.buttons[0].label;
        app_preview_btn1.classList.remove('disabled')
        if (!url1valid) app_preview_btn1.classList.add('disabled');
        if (activity.buttons[0].enabled) app_preview_btn1.classList.remove('d-none');
        app_preview_btn2.classList.add('d-none')
        const url2valid = dekita_rpc.isValidURL(activity.buttons[1].url);
        app_preview_btn2.href = url2valid ? activity.buttons[1].url : null;
        app_preview_btn2.innerHTML = activity.buttons[1].label;
        app_preview_btn2.classList.remove('disabled')
        if (!url2valid) app_preview_btn2.classList.add('disabled');
        if (activity.buttons[1].enabled) app_preview_btn2.classList.remove('d-none');
        const container = getElement('preview-image-container');
        const textrow = getElement('preview-image-textrow');
        textrow.classList.remove('ps-0');
        container.classList.add('d-none');
        container.classList.remove('fix-w');
        if (activity.images[0].enabled || activity.images[1].enabled) {
            container.classList.remove('d-none');
            textrow.classList.add('ps-0');
        }
        if (activity.images[0].enabled) {
            app_preview_image_large.src = activity.discord_assets?.[activity.images[0].key];
            app_preview_image_large.classList.remove('d-none');
            app_preview_image_large.classList.remove('img-48');
        } else {
            app_preview_image_large.classList.add('d-none');
        }
        if (activity.images[1].enabled) {
            if (!activity.images[0].enabled) {
                app_preview_image_large.src = activity.discord_assets?.[activity.images[1].key];
                app_preview_image_large.classList.remove('d-none');
                app_preview_image_large.classList.add('img-48');
                app_preview_image_small.classList.add('d-none');
                container.classList.add('fix-w');
            } else {
                app_preview_image_small.src = activity.discord_assets?.[activity.images[1].key];
                app_preview_image_small.classList.remove('d-none');
            }
        } else {
            app_preview_image_small.classList.add('d-none');
        }
        activity_preview.name.innerText = activity?.discord_details?.name || "App Name";
    }
    static async makeAngry(element_or_id) {
        if (!element_or_id.id) {
            element_or_id = getElement(element_or_id)
        }
        element_or_id.classList.add('angry');
    }
    static async clearAnger() {
        for (const element of [].slice.call(getElementsByClass('angry'))) {
            element.classList.remove('angry');
        }
    }
    static setIconFromAppData(activity = DB.activity) {
        if (!activity?.discord_details?.icon) {
            return this.showAlert("No application icon found!");
        };
        setValue('app-image', activity.discord_details.icon);
    }
    static setDetailsFromAppData(activity = DB.activity) {
        if (!activity?.discord_details?.description) {
            return this.showAlert("No application description found!");
        };
        setValue('app-details', activity.discord_details.description);
    }
    static setStateFromAppData(activity = DB.activity) {
        if (!activity?.discord_details?.summary) {
            return this.showAlert("No application summary found!");
        };
        setValue('app-state', activity.discord_details.summary);
    }

    static cookBread(type, toast_content, keep_open=false) {
        const activity = DB.activity;
        const is_update = toast_content === 'Activity Updated!';
        const area = document.createElement('div');
        area.setAttribute('aria-live', 'assertive');
        area.setAttribute('aria-automatic', 'true');
        area.setAttribute('role', 'alert');
        area.classList.add('toast');
        const head = document.createElement('div');
        head.classList.add('toast-header', `bg-${type}`);
        const head_img = document.createElement('i');
        switch (type) {
            case 'success': head_img.classList.add('fas', 'fa-fw', 'fa-check-double'); break;
            case 'warning': head_img.classList.add('fas', 'fa-fw', 'fa-radiation'); break;
            case 'danger': head_img.classList.add('fas', 'fa-fw', 'fa-biohazard'); break;
            default: head_img.classList.add('fas', 'fa-fw', 'fa-info-circle'); break;
        }
        const head_title = document.createElement('strong');
        head_title.classList.add('me-auto', 'ps-1');
        head_title.innerText = capitalize(type);
        const head_time = document.createElement('strong');
        head_time.classList.add('toast-time');
        head_time.innerText = (new Date()).toLocaleTimeString();
        head.append(head_img, head_title, head_time);
        // if (keep_open) {
            const close_button = document.createElement('button');
            close_button.setAttribute('data-bs-dismiss', 'toast');
            close_button.setAttribute('aria-label', 'Close');
            close_button.classList.add('btn-close');
            head.append(close_button);
        // }
        const body = document.createElement('div');
        body.classList.add('toast-body');
        body.innerHTML = toast_content;
        area.append(head, body);
        toast_container.append(area);
        const bs_toast = new bootstrap.Toast(area, {autohide: false});
        area.addEventListener('hidden.bs.toast',()=>{
            bs_toast.dispose();
            toast_container.removeChild(area);
        });
        bs_toast.show();
        const delay = is_update ? (activity.rpc_freq+1)*1000 : 5000;
        setTimeout(()=>bs_toast.hide(), delay);
    }

    static async updateUserCounters() {
        const element = getElement("user-counter-display");
        element.innerText = await dekita_rpc.getUserCounter();
    }
}