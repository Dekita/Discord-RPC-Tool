/**
* module: elements
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: Where all elements/ids are defined
*/
import { getElement,
    queryAll,getModal,
    getValue,setValue,
    getText,setText,
    getImage,setImage,
    getHTML,setHTML,
} from "./helpers.js";

const replacer = (prefix, prop) => `${prefix}-${prop.replace(/\_/g,'-')}`;

function registerInput(object, propname, label='app') {
    const element_id = replacer(label, propname);
    Object.defineProperty(object, propname, {
        set(v){return setValue(element_id,v)},
        get() {return getValue(element_id)},
    });
}
function registerLabel(object, propname, label='label') {
    const element_id = replacer(label, propname);
    Object.defineProperty(object, propname, {
        set(t){return setText(element_id,t)},
        get() {return getText(element_id)},
    });
}
function registerImage(object, propname, label='image') {
    const element_id = replacer(label, propname);
    Object.defineProperty(object, propname, {
        set(t){return setImage(element_id,t)},
        get() {return getImage(element_id)},
    });
}

/**
* inputs:
* defines all input areas. 
* each inputs propery has a get and set method
*/
export const  inputs = {};
registerInput(inputs, 'app_id');
registerInput(inputs, 'api_url');
registerInput(inputs, 'api_freq');
registerInput(inputs, 'rpc_freq');
registerInput(inputs, 'details');
registerInput(inputs, 'state');
registerInput(inputs, 'img1_text');
registerInput(inputs, 'img2_text');
registerInput(inputs, 'btn1_text');
registerInput(inputs, 'btn1_url');
registerInput(inputs, 'btn2_text');
registerInput(inputs, 'btn2_url');
registerInput(inputs, 'activity_name');
Object.freeze(inputs);

/**
* checkboxes:
* defines all 'dekcheckbox' areas
* see libs/dek-style.js for more info on dekcheckbox class
*/
export const checkboxes = {
    get timestamp(){return DekCheckBox.cache['app-rpc-timestamp-enabled']},
    get image1(){return DekCheckBox.cache['app-rpc-img1-enabled']},
    get image2(){return DekCheckBox.cache['app-rpc-img2-enabled']},
    get button1(){return DekCheckBox.cache['app-rpc-btn1-enabled']},
    get button2(){return DekCheckBox.cache['app-rpc-btn2-enabled']},
    get tiny_tray(){return DekCheckBox.cache['appopts-tiny-tray']},
    get auto_tiny(){return DekCheckBox.cache['appopts-auto-tiny']},
    get auto_play(){return DekCheckBox.cache['appopts-auto-play']},
    get auto_boot(){return DekCheckBox.cache['appopts-auto-boot']},
    get enable_calc(){return DekCheckBox.cache['calculate-enabled']},
    get enable_chroma(){return DekCheckBox.cache['calculate-chroma']},
}
Object.freeze(checkboxes);

/**
* selectors:
* defines all 'dekselect' areas
* see libs/dek-style.js for more info on dekselect class
*/
export const selectors = {
    get image1(){return DekSelect.cache['image-select-one']},
    get image2(){return DekSelect.cache['image-select-two']},
    get theme() {return DekSelect.cache['appopts-theme-select']},
}
Object.freeze(selectors);

/**
* buttons:
* defines all button elements that are expected to be clicked
*/
export const buttons = {
    dev_portal_btns: queryAll('.developer-portal-btn'),
    app_dev_portal: getElement('btn-app-dev-portal'),
    app_info_btns: queryAll('.app-info-btn'),

    delete_application: getElement('btn-delete-application'),
    export_activity: getElement('btn-export-application'),

    delete_activity: getElement('btn-delete-activity'),
    delete_activity: getElement('btn-export-activity'),
    
    force_refresh_data: getElement('force-refresh-data'),
    force_app_icon: getElement('force-app-icon'),
    force_app_details: getElement('force-app-details'),
    force_app_state: getElement('force-app-state'),
    confirm_change_activity: getElement('confirm-change-activity'),
    confirm_delete_activity: getElement('confirm-delete-activity'),
    app_settings: getElement('app-settings-btn'),
    save_activity: getElement('save-activity'),
    launch_activity: getElement('launch-activity'),
    current_app_config: getElement("current-app-config"),
    confirm_add_application: getElement('confirm-new-application-btn'),
    sync_app_data: getElement('btn-sync-app-data'),
}
Object.freeze(buttons);

/**
* areas:
* defines all ui areas/sections
*/
export const areas = {
    head_css_link: getElement('theme-style-css'),
    applications_btn_container: getElement('button-container'),
    current_app_config_dropdown: getElement("current-app-config-dropdown"),
    activity_list_group: getElement('activity-list-group'),
    alert_notification_area: getElement('alert-area'),
    toast_container: getElement('main-toast-container'),
    current_app_config_dropdown: getElement("current-app-config-dropdown"),
}
Object.freeze(areas);

/**
* modals:
* defines various bootstrap modal objects/elements
*/
export const modals = {
    delete_activity: getModal('delete-activity-modal'),
    stop_activity: getModal('stop-activity-modal'),
    add_application: getModal('new-application-modal'),
    settings: getModal('settings-modal'),
    settings_element: getElement('settings-modal'),

    edit_activity: getModal('edit-activity-modal'),
}
Object.freeze(modals);

/**
* labels:
* defines various labels used on the ui
* each labels propery has a get and set method
*/
export const labels = {}
registerLabel(labels, 'active_app_name');
registerLabel(labels, 'active_activity_name');
registerLabel(labels, 'user_count');
registerLabel(labels, 'stop_activity_message');
registerLabel(labels, 'stop_activity_title');
Object.freeze(labels);

/**
* activity_preview:
* defines elements used for the activity preview area
*/
export const activity_preview = {
    container: getElement('preview-image-container'),
    textrow: getElement('preview-image-textrow'),
    name: getElement("app-preview-name"),
    details: getElement('app-preview-details'),
    state: getElement('app-preview-state'),
    image1: getElement('app-preview-image'),
    image2: getElement('app-preview-image-sm'),
    button1: getElement('preview-btn1'),
    button2: getElement('preview-btn2'),
}
Object.freeze(activity_preview);

export const loggedin = {};
registerImage(loggedin, 'avatar', 'loggedin');
registerLabel(loggedin, 'username', 'loggedin');
registerLabel(loggedin, 'userdisc', 'loggedin');
Object.freeze(loggedin);
