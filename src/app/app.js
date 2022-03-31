/**
* system: Discord RPCTool
* author: dekitarpg@gmail.com
*/

/**
* ■ Helper functions:
*/
const getElement = id => document.getElementById(id);
const getModal = id => new bootstrap.Modal(getElement(id), {});
const getElementsByClass = n => document.getElementsByClassName(n);
const checkBoxEnabled = id => RPCGUI.dekcheckboxes[id].enabled;
const getValue = id => getElement(id)?.value || '';
const setValue = (id, v, e=getElement(id)) => e.value = v;
async function setCheckboxEnabled(id, enabled=false) {
    await RPCGUI.dekcheckboxes[id].setActive(enabled ? 0 : null);
}

/**
* ■ Page Elements:
*/
const alert_notification_area = getElement('alert-area');
const confirm_change_activity = getElement('confirm-change-activity');
const save_activity_btn = getElement('save-activity');
const launch_activity_btn = getElement('launch-activity');
const dev_portal_btn = getElement('developer-portal');
const app_image = getElement('app-image');
const delete_activity_btn = getElement('delete-activity');
const confirm_delete_activity_btn = getElement('confirm-delete-activity');
const stop_activity_modal = getModal('stop-activity-modal');
const delete_activity_modal = getModal('delete-activity-modal');
const app_settings_btn = getElement('app-settings-btn');
const settings_modal = getModal('settings-modal');
const app_info_btn = getElement('app-info-btn');
const app_preview_details = getElement('app-preview-details');
const app_preview_state = getElement('app-preview-state');
const app_preview_image_large = getElement('app-preview-image');
const app_preview_image_small = getElement('app-preview-image-sm');
const app_preview_btn1 = getElement('preview-btn1');
const app_preview_btn2 = getElement('preview-btn2');
const STOP_MESSAGES = {
    running: "The running activity will be stopped when switching!",
    unsaved: "If you switch activity these changes will be lost!",
}
const DEFAULT_IMAGE_TEXTS = {
    image1: "Created by Discord RPC Tool",
    image2: "Get it today at dekitarpg.com/rpc",
}

const API_URL = {
    assets: `https://discord.com/api/oauth2/applications/APP_ID/assets`,
    asset: `https://cdn.discordapp.com/app-assets/APP_ID/ASSET_ID.png`,
    icon: `https://cdn.discordapp.com/app-icons/APP_ID/ICON_ID.png`,
    rpc: `https://discord.com/api/oauth2/applications/APP_ID/rpc`,
}

/**
* ■ System Database:
*/
class DB {
    static loadOrInit() {
        const db = localStorage.getItem(`dekita-rpc-data`);
        this._data = db ? JSON.parse(db) : [];
    }
    static save() {
        const data = JSON.stringify(this._data);
        localStorage.setItem(`dekita-rpc-data`, data);
        RPCTool.flagSaved();
    }
    static getActivityData(property) {
        if (!property) return this._data[RPCTool.activeID];
        return this._data[RPCTool.activeID][property];
    }
    static deleteActivityID(id) {
        if (!this._data[id]) return false;
        this._data.splice(id, 1);
        this.save();
        return true;
    }
    static push() {
        this._data.push(...arguments);
        this.save();
    }
    static entries() {
        return this._data.entries();
    }
    static get length() {
        return this._data.length;
    }
}

/**
* ■ Main RPCTool class:
*/
class RPCTool {
    static async initialize() {
        this._is_running = false;
        this._running_since = null;
        this._unsaved_changes = false;
        this._loop_handle = null;
        this._active_id = 0;
        this._attempted_activity = null;
        await RPCGUI.refreshActivityList();
        await RPCGUI.setupDekcheckBoxes();
        await RPCGUI.setupTooltips();
        await RPCGUI.setInputsFromActivity();
        await RPCGUI.setupChangeListeners();
        await RPCGUI.updatePreview();
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
    static createNewActivity() {
        return DB.push(new RPCActivity());
    }
    // checks valid config and throws errors if wrong
    static async validateConfiguration() {
        await RPCGUI.clearAnger();
        await RPCGUI.clearAlerts();
        const messages =[];
        const activity = DB.getActivityData();
        if (!dekita_rpc.seemsFlakey(activity.app_id)) {
            messages.push(`"${activity.app_id}" does not seem like a valid Discord Application ID!`);
            RPCGUI.makeAngry('app-id');
        }
        if (isNaN(activity.rpc_freq) || parseInt(activity.rpc_freq) < 15) {
            messages.push(`RPC Update frequency must be a number greater than 15!`);
            RPCGUI.makeAngry('app-rpc-frequency');
        }
        if (!!activity.api_url && activity.api_url !=='API URL' && !dekita_rpc.isValidURL(activity.api_url)) {
            messages.push(`"${activity.api_url}" does not seem like a valid URL!`);
            RPCGUI.makeAngry('app-api-url');
        }
        if (!!activity.api_url && (isNaN(activity.api_freq) || parseInt(activity.api_freq) < 60)) {
            messages.push(`RPC Update frequency must be a number greater than 60!`);
            RPCGUI.makeAngry('app-api-frequency');
        }
        for (const [index, button] of activity.buttons.entries()) {
            console.log(button)
            if (!button.enabled) continue;
            if (!button.label.trim().length) {
                messages.push(`Button ${index+1} text cannot be empty when enabled!`);
                RPCGUI.makeAngry(`app-btn${index+1}-text`);
            }
            if (!dekita_rpc.isValidURL(button.url)) {
                messages.push(`Button ${index+1} link must be a valid URL when enabled!`);
                RPCGUI.makeAngry(`app-btn${index+1}-url`);
            }
        }
        for (const message of messages) {
            RPCGUI.showAlert(message);
        }
        return !messages.length;
    }
    static async updateActivity() {
        const activity = DB.getActivityData();
        const app_image = getValue('app-image');
        const rpc_frequency = parseInt(getValue('app-rpc-frequency'));
        const app_id = getValue('app-id');
        const api_url = getValue('app-api-url');
        const api_frequency = parseInt(getValue('app-api-frequency'));
        const details = getValue('app-details');
        const state = getValue('app-state');
        const img1_key = getValue('app-img1-key');
        const img1_text = getValue('app-img1-text');
        const img1_enabled = checkBoxEnabled('app-rpc-img1-enabled');
        const img2_key = getValue('app-img2-key');
        const img2_text = getValue('app-img2-text');
        const img2_enabled = checkBoxEnabled('app-rpc-img2-enabled');
        const btn1_text = getValue('app-btn1-text');
        const btn1_url = getValue('app-btn1-url');
        const btn1_enabled = checkBoxEnabled('app-rpc-btn1-enabled');
        const btn2_text = getValue('app-btn2-text');
        const btn2_url = getValue('app-btn2-url');
        const btn2_enabled = checkBoxEnabled('app-rpc-btn2-enabled');
        activity.timestamp = checkBoxEnabled('app-rpc-timestamp-enabled');
        activity.image = app_image;
        activity.rpc_freq = rpc_frequency;
        activity.app_id = app_id;
        activity.api_url = api_url;
        activity.api_freq = api_frequency;
        activity.details = details;
        activity.state = state;
        activity.images[0].enabled = img1_enabled;
        activity.images[0].key = img1_key;
        activity.images[0].text = img1_text || DEFAULT_IMAGE_TEXTS.image1;
        activity.images[1].enabled = img2_enabled;
        activity.images[1].key = img2_key;
        activity.images[1].text = img2_text || DEFAULT_IMAGE_TEXTS.image2;
        activity.buttons[0].enabled = btn1_enabled;
        activity.buttons[0].url = btn1_url;
        activity.buttons[0].label = btn1_text;
        activity.buttons[1].enabled = btn2_enabled;
        activity.buttons[1].url = btn2_url;
        activity.buttons[1].label = btn2_text;
    }
    static async beginLoop() {
        this.flagStopped();
        const validated = await this.validateConfiguration();
        if (!validated) return;
        await RPCGUI.updateLoginButton(true);
        RPCGUI.showAlert('Logging in... please wait!', 'warning');
        const app_id = DB.getActivityData('app_id');
        console.log('logging in as app_id:',app_id);
        dekita_rpc.login(app_id, async (error) => {
            if (error) {
                await RPCGUI.clearAlerts();
                await RPCGUI.updateLoginButton();
                return RPCGUI.showAlert(error.message);
            }
            this.flagStarted();
            RPCGUI.updateDisabledElements();
            this.updateLoop();
        });
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
        return return_stats;
    }
    static async updateLoop(){
        const activity = {type:3};
        const db_activity = DB.getActivityData();
        const return_stats = await this.updateAPI(db_activity);
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
        }
        const timeout = () => this.updateLoop();
        const freq = db_activity.rpc_freq * 1000;
        await dekita_rpc.updateActivity(activity);
        this._loop_handle = setTimeout(timeout, freq);
        const thistime = (new Date()).toLocaleString();
        RPCGUI.showAlert(`Last RPC Update: ${thistime}`, 'success', true);
    }
    static async stopLoop() {
        if (!this._is_running) return;
        if (this._loop_handle) clearTimeout(this._loop_handle);
        await dekita_rpc.logout();
        this.flagStopped();
        RPCGUI.updateDisabledElements();
        await RPCGUI.clearAlerts();
        await RPCGUI.showAlert(`Stopped Activity`, 'warning');
    }
}

/**
* ■ RPCGUI class handles all gui modifications/updates:
*/
class RPCGUI {
    static async setupDekcheckBoxes() {
        if (this.dekcheckboxes) return;
        this.dekcheckboxes = {};
        const activity_boxes = [
            'app-rpc-timestamp-enabled',
            'app-rpc-img1-enabled',
            'app-rpc-img2-enabled',
            'app-rpc-btn1-enabled',
            'app-rpc-btn2-enabled',
        ]
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

        // theme stuff:
        const ENABLED_THEMES = [
            'darkcord1','darkcord2',
            'lightcord1','lightcord2',
            // 'dark1','dark2','dark3',
            // 'light1','light2','light3'
        ];
        const ENABLED_COLORS = [
            'default', 'pastel'
        ];
        const theme = await app_config.get('gui-theme');
        const color = await app_config.get('gui-color');
        // remove all classes before setting
        document.body.classList.remove(...ENABLED_THEMES.filter(e => e !== theme));
        document.body.classList.remove(...ENABLED_COLORS.filter(e => e !== color));

        (new DekCheckBox('appopts-theme', async value => {
            await updateTheme(ENABLED_THEMES[!ENABLED_THEMES[value] ? 0 : value]);
        })).setActive(ENABLED_THEMES.indexOf(theme));
        (new DekCheckBox('appopts-color', async value => {
            await updateThemeColors(ENABLED_COLORS[!ENABLED_COLORS[value] ? 0 : value]);
        })).setActive(ENABLED_COLORS.indexOf(color));
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
        const options = {placement: 'bottom', trigger: 'hover focus'};
        const tooltips = [].slice.call(document.querySelectorAll(query));
        tooltips.map(e => new bootstrap.Tooltip(e, options));
    }
    static async setupChangeListeners() {
        [   'app-image',
            'app-rpc-frequency', 
            'app-id',
            'app-api-url', 
            'app-api-frequency',
            'app-details', 
            'app-state',
            'app-img1-key', 
            'app-img1-text',
            'app-img2-key', 
            'app-img2-text',
            'app-btn1-text', 
            'app-btn1-url',
            'app-btn2-text', 
            'app-btn2-url',
        ].forEach(id => {
            const element = getElement(id);
            element.addEventListener('input', async ()=>{
                RPCTool.flagUnsaved();
                this.updatePreview();
            });
        });
        DekSelect.cache['image-select-one'].addEventListener('change', event => {
            setValue('app-img1-key', event.target.value);
            RPCTool.flagUnsaved();
        });
        DekSelect.cache['image-select-two'].addEventListener('change', event => {
            setValue('app-img2-key', event.target.value);
            RPCTool.flagUnsaved();
        });
        const app_id = getElement('app-id');
        app_id.addEventListener('change', async ()=>{
            // fetch app informations: 
            this.validateAppData();
        });
        this.validateAppData();
    }
    static async validateAppData(forced=false) {
        const app_id = getValue('app-id');
        const activity = DB.getActivityData();
        if (activity.discord_details !== null && !forced) {
            await this.refreshAppDetails(app_id, activity);
            await this.refreshAppAssets(app_id, activity);
        }
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
            console.log('details:', details);
            console.log('activity.discord_details:', activity.discord_details);
        } else {
            activity.discord_details = null;
            console.log('details:',details);
        }
    }
    static async refreshAppAssets(app_id, activity) {
        const assets = await this.fetchAppAssets();
        if (!assets.error) {
            const asset_names = assets.map(e => e.name);
            const img_1_id = asset_names.indexOf(getValue('app-img1-key'));
            const img_2_id = asset_names.indexOf(getValue('app-img2-key'));
            DekSelect.cache['image-select-one'].setOptions(asset_names, img_1_id);
            DekSelect.cache['image-select-two'].setOptions(asset_names, img_2_id);
            activity.discord_assets = {};
            for (const asset of assets) {
                const argz = {APP_ID: app_id, ASSET_ID: asset.id};
                const data = dekita_rpc.format(API_URL.asset, argz);
                activity.discord_assets[asset.name] = data;
            }
            console.log('activity.discord_assets:', activity.discord_assets);
        } else {
            activity.discord_assets = null;
            console.log('assets:', assets);
        }
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
                    RPCGUI.clearAlerts();
                    this.setInputsFromActivity();
                    this.updatePreview();
                    RPCTool.flagSaved();
                    this.refreshActivityListActive();
                };
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
            RPCTool.createNewActivity();
            RPCTool.setActiveID(DB.length-1);
            this.refreshActivityList();
            this.setInputsFromActivity();
            this.updatePreview();
            RPCTool.flagSaved();
        });
        btn_container.append(add_new_btn);
    }
    static async refreshActivityListActive(){
        const btn_container = getElement('button-container');
        const buttons = [].slice.call(btn_container.getElementsByTagName("BUTTON"));
        for (const [index, button] of buttons.entries()) {
            button.classList.remove('active');
            if (index === RPCTool.activeID){
                button.classList.add('active');
            } 
        }
    }
    static createProfileButton(options) {
        const btn = document.createElement('button');
        btn.classList.add('btn', 'btn-lg', 'btn-bg', 'fw-bold', 'mt-3', 'p-0');
        btn.style.height = '58px';
        btn.style.width = '58px';
        if (options.image) {
            const image = document.createElement('img');
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
        const activity = DB.getActivityData();
        setValue('app-image', activity.image);
        setValue('app-rpc-frequency', activity.rpc_freq);
        setValue('app-id', activity.app_id);
        setValue('app-api-url', activity.api_url);
        setValue('app-api-frequency', activity.api_freq);
        setValue('app-api-url', activity.api_url);
        setValue('app-details', activity.details);
        setValue('app-state', activity.state);
        setValue('app-img1-key', activity.images[0].key);
        setValue('app-img1-text', activity.images[0].text);
        setCheckboxEnabled('app-rpc-img1-enabled', activity.images[0].enabled);
        setValue('app-img2-key', activity.images[1].key);
        setValue('app-img2-text', activity.images[1].text);
        setCheckboxEnabled('app-rpc-img2-enabled', activity.images[1].enabled);
        setValue('app-btn1-url', activity.buttons[0].url);
        setValue('app-btn1-text', activity.buttons[0].label);
        setCheckboxEnabled('app-rpc-btn1-enabled', activity.buttons[0].enabled);
        setValue('app-btn2-url', activity.buttons[1].url);
        setValue('app-btn2-text', activity.buttons[1].label);
        setCheckboxEnabled('app-rpc-btn2-enabled', activity.buttons[1].enabled);
        setCheckboxEnabled('app-rpc-timestamp-enabled', activity.timestamp);
    }
    static async showAlert(message, type='danger', clear_div=false) {
        const wrapper = document.createElement('div');
        const dismissable = !clear_div ? 'alert-dismissible' : '';
        const close_btn = '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
        wrapper.innerHTML = `<div class="mb-1 alert alert-${type} ${dismissable}" role="alert">${message} ${!!dismissable ? close_btn : ''}</div>`;
        if (clear_div) await this.clearAlerts();
        alert_notification_area.append(wrapper);
    }
    static async clearAlerts() {
        alert_notification_area.innerHTML = "";
    }
    static async updatePreview() {
        const activity = DB.getActivityData();
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
            app_preview_image_large.src = activity.discord_assets[activity.images[0].key];
            app_preview_image_large.classList.remove('d-none');
            app_preview_image_large.classList.remove('img-48');
        } else {
            app_preview_image_large.classList.add('d-none');
        }
        if (activity.images[1].enabled) {
            if (!activity.images[0].enabled) {
                app_preview_image_large.src = activity.discord_assets[activity.images[1].key];
                app_preview_image_large.classList.remove('d-none');
                app_preview_image_large.classList.add('img-48');
                app_preview_image_small.classList.add('d-none');
                container.classList.add('fix-w');
            } else {
                app_preview_image_small.src = activity.discord_assets[activity.images[1].key];
                app_preview_image_small.classList.remove('d-none');
            }
        } else {
            app_preview_image_small.classList.add('d-none');
        }
        getElement("app-preview-name").innerText = activity.discord_details.name;
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
}

/**
* ■ RPCActivity class is a basic activity object:
*/
class RPCActivity {
    constructor() {
        // rpc tool activity data:
        this.app_id = "Discord Application ID";
        this.image = "img/rpc-icon.png";
        this.rpc_freq = 60;
        this.api_url = "API URL";
        this.api_freq = 300;
        this.discord_details=null;
        this.discord_assets=null;
        // actual rpc activity: 
        this.details = "Discord RPC Tool";
        this.state = "By DekitaRPG";
        this.images = [
            {key: "large-image", text:DEFAULT_IMAGE_TEXTS.image1, enabled: false},
            {key: "small-image", text:DEFAULT_IMAGE_TEXTS.image2, enabled: false},
        ];
        this.buttons = [
            {url: "https://dekitarpg.com/rpc", label:"Website", enabled: true},
            {url: "https://discord.gg/Gyb8r9Ghuu", label:"Support", enabled: true},
        ];
        this.timestamp = false;
        this.instance = false;
    }
}

/**
* ■ Various Event Listeners:
*/
document.addEventListener('DOMContentLoaded', async event => {
    dekita_rpc.sendReadyEvent('main');
    dekita_rpc.renderer.on('no-internet', (event, arg) => {
        RPCGUI.showAlert("Internet connection was lost!", 'danger', true);
        RPCTool.stopLoop();
    });
    DB.loadOrInit();
    if (!DB.length) { // first time app is accessed: 
        RPCTool.createNewActivity();
        dekita_rpc.openChildWindow('help');
    }
    await RPCTool.initialize();
});
document.addEventListener('click', e => {
    let href;  const tag = e.target.tagName.toUpperCase();
    if (tag === 'A') href = e.target.getAttribute('href');
    if (['I','IMG'].includes(tag)) {
        href = e.target.parentElement.getAttribute('href');
    }
    if (!!href && !href.startsWith('#')) {
        dekita_rpc.openExternal(href);
        e.preventDefault();
    }
});
save_activity_btn.addEventListener('click', async (e)=>{
    await RPCGUI.clearAlerts();
    await RPCTool.updateActivity();
    await RPCGUI.refreshActivityList();
    await RPCGUI.updatePreview();
    DB.save();
    await RPCTool.validateConfiguration();
});
launch_activity_btn.addEventListener('click', (e)=>{
    RPCTool.running ? RPCTool.stopLoop() : RPCTool.beginLoop();
});
app_image.addEventListener('click', async event => {
    const dialog = await dekita_rpc.openFileDialog();
    if (!dialog.canceled) app_image.value = dialog.filePaths.shift();
});
dev_portal_btn.addEventListener('click', event => {
    dekita_rpc.openExternal("https://discord.com/developers/applications");
});
confirm_change_activity.addEventListener('click', async (e)=>{
    if (RPCTool.setActiveID(RPCTool.attemptedID)) {
        await RPCGUI.clearAlerts();
        RPCTool.setAttemptedID(null);
        RPCGUI.refreshActivityList();
        RPCGUI.setInputsFromActivity();
        RPCGUI.updatePreview();
        RPCTool.flagSaved();
        RPCTool.stopLoop();
    };
    stop_activity_modal.hide();
});
delete_activity_btn.addEventListener('click', event => {
    if (DB.length > 1) {
        delete_activity_modal.show();
    } else {
        RPCGUI.showAlert("Cannot delete your only activity!");
    }
});
confirm_delete_activity_btn.addEventListener('click', event => {
    RPCTool.stopLoop();
    DB.deleteActivityID(RPCTool.activeID);
    RPCTool.setActiveID(null);
    RPCGUI.refreshActivityList();
    delete_activity_modal.hide();
    if (RPCTool.setActiveID(0)) {
        RPCGUI.refreshActivityList();
        RPCGUI.setInputsFromActivity();
        RPCGUI.updatePreview();
        RPCTool.flagSaved();
    };
});
app_settings_btn.addEventListener('click', event => {
    settings_modal.show();
    app_settings_btn.blur();
});
app_info_btn.addEventListener('click', event => {
    dekita_rpc.openChildWindow('help');
    app_info_btn.blur();
});
