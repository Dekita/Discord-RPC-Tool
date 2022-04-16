/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*/
import {
    getElement,
    getModal,
    getElementsByClass,
    getValue, 
    setValue,
} from "./components/js/helpers.js";
import RPCTool from "./components/js/rpc-tool.js";
import RPCGUI from "./components/js/rpc-gui.js";
import DB from "./components/js/db.js";
import "./components/js/sysnote.js";
import "./components/js/themes.js";

import {
    app_id,
    confirm_change_activity,
    save_activity_btn,
    launch_activity_btn,
    dev_portal_btn,
    app_image,
    delete_activity_btn,
    confirm_delete_activity_btn,
    stop_activity_modal,
    delete_activity_modal,
    app_settings_btn,
    settings_modal_element,
    settings_modal,
    app_info_btn,
    force_refresh_data_btn,
    force_app_icon_btn,
    force_app_details_btn,
    force_app_state_btn,
} from "./components/js/elements.js";

/**
* ■ Various Event Listeners:
*/
async function onDomLoaded() {
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
            RPCGUI.updatePreview();
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
    const link = getElement('theme-style-css');
    DekSelect.cache['appopts-theme-select'].addEventListener('change', async event => {
        const theme = event.target.value;
        await app_config.set('gui-theme', theme);
        if (theme === 'custom') return loadCustomthemeFromStorage();
        if (document.documentElement.style.cssText) {
            document.documentElement.style.cssText = '';
        }
        const theme_file = `themes/${event.target.value}.css`;
        link.setAttribute('href', theme_file);
        // link.setAttribute('loading', 'lazy');
    });
    const theme = await app_config.get('gui-theme');
    if (theme === 'custom') loadCustomthemeFromStorage();
    // const default_theme_path = link.getAttribute('href');
    // const theme = default_theme_path.match(/themes\/(.*).css/i)[1];
    // DekSelect.cache['appopts-theme-select'].setToID(2)

    const onAppIdChanged = dekita_rpc.debounce((event)=>RPCGUI.validateAppData(true), 250);
    ['change','paste'].forEach(e=>{app_id.addEventListener(e,()=>onAppIdChanged(e))});
}

document.addEventListener('click', e => {
    let href;  const tag = e.target.tagName.toUpperCase();
    if (tag === 'A') href = e.target.getAttribute('href');
    if (['I','IMG'].includes(tag)) {
        href = e.target.parentElement?.getAttribute('href');
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
        RPCGUI.validateAppData();
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
    // dekita_rpc.openChildWindow('test');
    app_info_btn.blur();
});
settings_modal_element.addEventListener('hide.bs.modal', () => {
    RPCGUI.closeAllTooltips();
    console.log('closing all!')
});
force_refresh_data_btn.addEventListener('click', async event => {
    force_refresh_data_btn.setAttribute('disabled', true);
    const icon = force_refresh_data_btn.querySelector('i');
    icon.classList.remove('fa-retweet');
    icon.classList.add('fa-spinner','fa-spin');
    await RPCGUI.validateAppData(true);
    icon.classList.add('fa-retweet');
    icon.classList.remove('fa-spinner','fa-spin');
    force_refresh_data_btn.removeAttribute('disabled');
});
force_app_icon_btn.addEventListener('click', event => {
    RPCGUI.setIconFromAppData();
    force_app_icon_btn.blur();
});
force_app_details_btn.addEventListener('click', event => {
    RPCGUI.setDetailsFromAppData();
    force_app_details_btn.blur();
});
force_app_state_btn.addEventListener('click', event => {
    RPCGUI.setStateFromAppData();
    force_app_state_btn.blur();
});

document.addEventListener('DOMContentLoaded', async event => {
    [...document.querySelectorAll('.toast')].forEach(toastEl => {
        (new bootstrap.Toast(toastEl, {})).show();
    });
    DB.loadOrInit();
    onDomLoaded();
    if (!DB.length) { // first time app is accessed: 
        RPCTool.createNewActivity();
        dekita_rpc.openChildWindow('help');
    }
    await RPCTool.initialize();
    dekita_rpc.sendReadyEvent('main');
});

dekita_rpc.renderer.on('updater', (event, type, info) => {
    switch (type) {
        case 'checking-for-updates':
            // RPCGUI.showAlert('Checking for latest updates...', 'success', true);
        break;
        case 'update-available':
            RPCGUI.showAlert('Update Found!', 'success', true);
        break;
        case 'update-not-available':
            // RPCGUI.showAlert('No Update Available!', 'warning', true);
        break;
        case 'download-progress':
            RPCGUI.showAlert('Downloading Update...', 'info', true);
        break;
        case 'update-downloaded':
            RPCGUI.showAlert('Restarting to apply update!', 'danger', true);
            setTimeout(()=>{ dekita_rpc.performApplicationUpdate() }, 2500);
        break;
        case 'before-quit-for-update':
            RPCGUI.showAlert('Quitting to apply update! Woah!!')
        break;
        case 'error':
            // RPCGUI.showAlert('Update Error!');
            console.error(info);
        break;
    }
});

// todo: add the below listeners:
// window.addEventListener('online', ()=> navigator.onLine);
// window.addEventListener('offline', ()=> navigator.onLine);

