/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*/

import setup_app_action_listeners from "./app-actions.js";
import RPCTool from "./js/rpc-tool.js";
import RPCGUI from "./js/rpc-gui.js";
import DB from "./js/db.js";
import "./js/sysnote.js";
import "./js/themes.js";

import {
    getElement,
    getModal,
    getElementsByClass,
    getValue, 
    setValue,
    queryAll,
} from "./js/helpers.js";

import {
    inputs,
    checkboxes,
    buttons, 
    areas, 
    modals, 
    labels,
    selectors,
    activity_preview,
    loggedin,
} from "./js/elements.js";


/**
* has_first_rendered
* dont overwrite activity when booting or else 
* activity data gets ovverwritten with html template
*/
let has_first_rendered = false;

/**
* expecting_datachange
* used to determine when its safe to save data
* after input elements are changed
*/
let expecting_datachange = false;


const onUpdateChanges = dekita_rpc.throttle(async event => {
    const can_update = !expecting_datachange && has_first_rendered;
    if (can_update) await RPCTool.updateActivity();
    // await RPCGUI.validateAppData();
    await RPCGUI.updatePreview();
    
    // await RPCTool.flagUnsaved();
}, 250);


async function onChangeTheme(event) {
    const theme = event.target.value;
    await app_config.set('gui-theme', theme);
    if (theme === 'custom') return loadCustomthemeFromStorage();
    if (document.documentElement.style.cssText) {
        document.documentElement.style.cssText = '';
    }
    const theme_file = `themes/${event.target.value}.css`;
    areas.head_css_link.setAttribute('href', theme_file);
    // link.setAttribute('loading', 'lazy');
}

async function onConfirmAddApplication() {
    console.log('creating new');

    DB.createApplication({
        app_id: inputs.app_id,
        // name: 
    });

    RPCTool.setActiveID(DB.length-1);
    RPCGUI.refreshActivityList();
    RPCGUI.setInputsFromActivity();
    RPCGUI.updatePreview();
    RPCTool.flagSaved();
}



    
async function onUpdateElements() {
    await RPCGUI.updatePreview();
    requestAnimationFrame(onUpdateElements);
}

async function onClickDocument(e) {
    let href;  const tag = e.target.tagName.toUpperCase();
    if (tag === 'A') href = e.target.getAttribute('href');
    if (['I','IMG'].includes(tag)) {
        href = e.target.parentElement?.getAttribute('href');
    }
    if (!!href && !href.startsWith('#')) {
        dekita_rpc.openExternal(href);
        e.preventDefault();
    }
}

async function onSaveActivityData(event) {
    // await RPCGUI.clearAlerts();
    await RPCTool.updateActivity();
    await RPCGUI.refreshActivityList();
    await RPCGUI.updatePreview();
    DB.save();
    await RPCTool.validateConfiguration();
}

async function onConfirmChangeActivity(event) {
    if (RPCTool.setActiveID(RPCTool.attemptedID)) {
        // await RPCGUI.clearAlerts();
        RPCTool.setAttemptedID(null);
        RPCGUI.refreshActivityList();
        RPCGUI.setInputsFromActivity();
        RPCGUI.validateAppData();
        RPCGUI.updatePreview();
        RPCTool.flagSaved();
        RPCTool.stopLoop();
    };
    modals.stop_activity.hide();
}

async function onAttemptDeleteActivity(event) {
    if (DB.length > 1) {
        modals.delete_activity.show();
    } else {
        RPCGUI.showAlert("Cannot delete your only activity!");
    }
}
async function onConfirmDeleteActivity(event) {
    RPCTool.stopLoop();
    DB.deleteActivityID(DB.activityID);
    // RPCTool.setActiveID(null);
    RPCGUI.refreshActivityList();
    modals.delete_activity.hide();
    // if (RPCTool.setActiveID(0)) {
    //     RPCGUI.refreshActivityList();
    //     RPCGUI.setInputsFromActivity();
    //     RPCGUI.updatePreview();
    //     RPCTool.flagSaved();
    // };    
}

async function onAfterLoadedDOM() {

    DB.loadOrInit();
    if (!DB.length) { // first time app is accessed: 
        RPCTool.setupInitialApplications();
        // dekita_rpc.openChildWindow('help');
    }
    await RPCTool.initialize();
    await RPCGUI.updateUserCounters();
    setInterval(()=>RPCGUI.updateUserCounters(), 1000 * 60);
    // onUpdateElements();
}



function toggleAppConfig(type='toggle') {
    const thisklass = buttons.current_app_config.classList;
    const thatklass = areas.current_app_config_dropdown.classList;
    switch (type) {
        case "toggle": {
            if (thatklass.contains('d-none')) {
                thisklass.replace('fa-angle-double-down', 'fa-times');
                thatklass.replace('d-none', 'd-block');
            } else {
                thisklass.replace('fa-times', 'fa-angle-double-down');
                thatklass.replace('d-block', 'd-none');
            }
            break;
        }
        case "show": {
            thisklass.replace('fa-angle-double-down', 'fa-times');
            thatklass.replace('d-none', 'd-block');
            break;
        }
        case "hide": {
            thisklass.replace('fa-times', 'fa-angle-double-down');
            thatklass.replace('d-block', 'd-none');
            break;
        }
    }
}

/**
* ■ wrapper around other event listeners:
*/
document.addEventListener('DOMContentLoaded', async()=>{


    document.addEventListener('click', onClickDocument);

    for (const input of queryAll('input')) {
        if (!input.id.startsWith('app-')) continue;
        ['input','change','paste'].forEach(event => {
            input.addEventListener(event,e=>onUpdateChanges(e));
        });
    }

    checkboxes.timestamp.addEventListener('click',e=>onUpdateChanges(e));
    checkboxes.image1.addEventListener('click',e=>onUpdateChanges(e));
    checkboxes.image2.addEventListener('click',e=>onUpdateChanges(e));
    checkboxes.button2.addEventListener('click',e=>onUpdateChanges(e));
    checkboxes.button2.addEventListener('click',e=>onUpdateChanges(e));

    selectors.image1.addEventListener('change',e=>onUpdateChanges(e));
    selectors.image2.addEventListener('change',e=>onUpdateChanges(e));
    selectors.theme.addEventListener('change',e=>onChangeTheme(e));
    const theme = await app_config.get('gui-theme');
    if (theme === 'custom') loadCustomthemeFromStorage();
    selectors.theme.setToValue(theme);


    buttons.confirm_add_application.addEventListener('click',onConfirmAddApplication);
    

    function openDevPortal(app_id="") {
        dekita_rpc.openExternal(`https://discord.com/developers/applications/${app_id}`);
    }

    for (const dev_portal_btn of buttons.dev_portal_btns) {
        dev_portal_btn.addEventListener('click', e=>openDevPortal());
    }    
    buttons.save_activity.addEventListener('click',onSaveActivityData);
    buttons.launch_activity.addEventListener('click', (e)=>{
        RPCTool.running ? RPCTool.stopLoop() : RPCTool.beginLoop();
    });


    // app_image.addEventListener('click', async event => {
    //     const dialog = await dekita_rpc.openFileDialog();
    //     if (!dialog.canceled) app_image.value = dialog.filePaths.shift();
    // });

    buttons.app_settings.addEventListener('click', event => {
        modals.settings.show();
        buttons.app_settings.blur();
    });
    for (const app_info_btn of buttons.app_info_btns) {
        app_info_btn.addEventListener('click', event => {
            // dekita_rpc.openChildWindow('test');
            dekita_rpc.openChildWindow('help');
            app_info_btn.blur();
        });
    }



    // force_refresh_data_btn.addEventListener('click', async event => {
    //     force_refresh_data_btn.setAttribute('disabled', true);
    //     const icon = force_refresh_data_btn.querySelector('i');
    //     icon.classList.remove('fa-retweet');
    //     icon.classList.add('fa-spinner','fa-spin');
    //     await RPCGUI.validateAppData(true);
    //     icon.classList.add('fa-retweet');
    //     icon.classList.remove('fa-spinner','fa-spin');
    //     force_refresh_data_btn.removeAttribute('disabled');
    // });
    // force_app_icon_btn.addEventListener('click', event => {
    //     RPCGUI.setIconFromAppData();
    //     force_app_icon_btn.blur();
    // });
    buttons.force_app_details.addEventListener('click', event => {
        buttons.force_app_details.blur();
        RPCGUI.setDetailsFromAppData();
    });
    buttons.force_app_state.addEventListener('click', event => {
        buttons.force_app_state.blur();
        RPCGUI.setStateFromAppData();
    });
    buttons.sync_app_data.addEventListener('click', async event => {
        const icon = buttons.sync_app_data.querySelector('i');
        icon.classList.add('fa-spin', 'disable');
        await RPCGUI.validateAppData(true);
        icon.classList.remove('fa-spin');
        // toggleAppConfig('hide');
    });

    buttons.app_dev_portal.addEventListener('click', async event =>{
        openDevPortal(DB.application.id);
    });

    buttons.delete_application.addEventListener('click', async event =>{

    });


    
    // buttons.delete_activity.addEventListener('click', onAttemptDeleteActivity);
    buttons.confirm_delete_activity.addEventListener('click', onConfirmDeleteActivity);
    buttons.confirm_change_activity.addEventListener('click', onConfirmChangeActivity);

    buttons.export_activity.addEventListener('click', ()=>{
        console.log('todo: buttons.export_activity');
    });


    buttons.current_app_config.addEventListener('click', ()=>{
        toggleAppConfig('toggle');
    });

    modals.settings_element.addEventListener('hide.bs.modal', () => {
        RPCGUI.closeAllTooltips();
        console.log('closing all!')
    });




    app_events.on('clicked-app-list-item', async (item, index) => {
        // if (RPCTool.unsaved || RPCTool.running) {
        //     const title = labels.stop_activity_title;
        //     const message = labels.stop_activity_message;
        //     if (RPCTool.running) {
        //         title.innerText = "Caution: Activity Running!";
        //         message.innerText = "The running activity will be stopped when switching!";
        //     } else {
        //         title.innerText = "Caution: Unsaved Changes!";
        //         message.innerText = "If you switch activity these changes will be lost!";
        //     }
        //     RPCTool.setAttemptedID(index);
        //     return modals.stop_activity.show();
        // }
        expecting_datachange = true;
        if (DB.setAppID(index)) {
            // this.clearAlerts();
            await RPCGUI.refreshApplicationList();
            await RPCGUI.setInputsFromActivity();
            await RPCGUI.validateAppData();
            // RPCGUI.updatePreview();
            // RPCTool.flagSaved();
            expecting_datachange = false;
        };
    });

    app_events.on('clicked-activity-list-item', async (item, index) => {
        expecting_datachange = true;
        if (DB.setActivityID(index)) {
            await RPCGUI.refreshActivityList();
            await RPCGUI.setInputsFromActivity();
            await RPCGUI.refreshAppAssetSelectors();
            // RPCGUI.updatePreview();
            // RPCTool.flagSaved();
            expecting_datachange = false;
        };
    });


    app_events.on('clicked-edit-activity', (index) => {
        const activity = DB.getActivityByID(index);
        inputs.activity_name = activity.name;
        modals.edit_activity.show();
    });

    app_events.on('logged-in', async client => {
        const base_url = "https://cdn.discordapp.com/avatars/{id}/{avatar}.png";
        const avatar_url = dekita_rpc.format(base_url, {
            "{avatar}": client.user.avatar,
            "{id}": client.user.id,
        });
        loggedin.avatar = avatar_url;
        loggedin.username = client.user.username;
        loggedin.userdisc = client.user.discriminator;
        // console.log(client);
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




    // onAfterLoadedDOM();


    DB.loadOrInit();
    if (!DB.length) { // first time app is accessed: 
        RPCTool.setupInitialApplications();
        // dekita_rpc.openChildWindow('help');
    }
    await RPCTool.initialize();
    await RPCGUI.updateUserCounters();
    setInterval(()=>RPCGUI.updateUserCounters(), 1000 * 60);    
    setup_app_action_listeners('main');
    // dekita_rpc.sendReadyEvent('main');
    has_first_rendered = true;
    
    // todo: add the below listeners:
    // window.addEventListener('online', ()=> navigator.onLine);
    // window.addEventListener('offline', ()=> navigator.onLine);
});