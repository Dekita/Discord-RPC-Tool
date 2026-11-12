/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*/

import setup_app_action_listeners from "./app-actions.js";
import RPCTool from "./js/rpc-tool.js";
import RPCGUI from "./js/rpc-gui.js";
import DB from "./js/db.js";
import "./js/sysnote.js";
import { loadCustomthemeFromStorage, getCustomThemeColors } from "./js/themes.js";
import { applyThemeStyles } from "./js/theme-apply.js";

import {
    getElement,
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
    loggedin,
} from "./js/elements.js";


/**
* has_first_rendered
* dont overwrite activity when booting or else
* activity data gets ovverwritten with html template
*/
let has_first_rendered = false;


/**
* pending_delete
* what the delete confirmation modal is deleting: 'activity' or 'application'
*/
let pending_delete = null;

/**
* editing_activity_index
* index of the activity being renamed in the edit activity modal
*/
let editing_activity_index = null;

/**
* menu_activity_index
* index of the activity the activity context menu was opened for
*/
let menu_activity_index = null;

/**
* switching_activity_index
* activity picked while another was live, waiting on the switch modal
*/
let switching_activity_index = null;


// autosave: the activity is updated from the inputs straight away, so no
// edit is lost when switching activity. sending it to the main process
// and redrawing the preview are spread out while typing.
const saveSoon = dekita_rpc.debounce(() => DB.save(), 250);
const refreshPreviewSoon = dekita_rpc.throttle(() => RPCGUI.updatePreview(), 100);
function onUpdateChanges() {
    // changes made by the gui itself (eg: loading an activity) are not edits
    if (has_first_rendered && !RPCGUI.quiet) {
        RPCTool.updateActivity();
        saveSoon();
    }
    refreshPreviewSoon();
}


async function applyTheme(theme) {
    await app_config.set('gui-theme', theme);
    applyThemeStyles(theme);
    // also updates the color inputs of the customizer
    if (theme === 'custom') loadCustomthemeFromStorage();
    refreshThemeTiles(theme);
}

// marks the selected theme tile, and draws the saved custom themes tile
function refreshThemeTiles(selected) {
    for (const tile of areas.theme_tiles.querySelectorAll('[data-theme]')) {
        tile.classList.toggle('selected', tile.dataset.theme === selected);
    }
    const custom = getCustomThemeColors();
    const tile = areas.theme_tiles.querySelector('[data-theme="custom"]');
    tile.classList.toggle('empty', !custom);
    tile.querySelector('.theme-tile-name').textContent = custom ? 'my theme' : 'create your own';
    if (!custom) return;
    const swatch = tile.querySelector('.theme-tile-swatch');
    swatch.style.background = custom['body-color'];
    swatch.style.color = custom['text-color'];
    const dots = swatch.querySelectorAll('.theme-tile-dots i');
    ['primary', 'secondary', 'success'].forEach((tone, index) => {
        dots[index].style.background = custom[`${tone}-normal`];
    });
}

// closes settings first, so the drawer slides in over the app itself
function openThemeCustomizer() {
    if (!modals.settings_element.classList.contains('show')) return modals.themes.show();
    modals.settings_element.addEventListener('hidden.bs.modal', () => modals.themes.show(), {once: true});
    modals.settings.hide();
}

async function onConfirmAddApplication() {
    const app_id = inputs.app_id.trim();
    if (!dekita_rpc.seemsFlakey(app_id)) {
        RPCGUI.makeAngry('app-app-id');
        return RPCGUI.showAlert(`"${app_id}" does not seem like a valid Discord Application ID!`);
    }
    RPCGUI.clearAnger();
    const index = DB.createApplication({app_id, activities: [{name: 'new-activity'}]});
    modals.add_application.hide();
    inputs.app_id = '';
    await selectApplication(index);
}

// switches to the application at index and refreshes the gui
async function selectApplication(index) {
    // activities belong to the application, so stop when switching
    if (index !== DB.appID) await RPCTool.stopLoop();
    DB.setAppID(index);
    await RPCGUI.refreshApplicationList();
    RPCGUI.setInputsFromActivity();
    await RPCGUI.validateAppData();
    await RPCGUI.updatePreview();
}

// switches to the activity at index and refreshes the gui
async function selectActivity(index) {
    DB.setActivityID(index);
    await RPCGUI.refreshActivityList();
    RPCGUI.setInputsFromActivity();
    await RPCGUI.updatePreview();
}

// while live the new activity is only added to the list, the live
// activity stays selected until the user picks the new one
async function onCreateNewActivity() {
    const count = DB.application.activities.length + 1;
    const index = DB.createActivity({name: `activity-${count}`});
    if (RPCTool.active) await RPCGUI.refreshActivityList();
    else await selectActivity(index);
    app_events.emit('clicked-edit-activity', index);
}

function onRenameActivity(event) {
    const activity = DB.getActivityByID(editing_activity_index);
    if (!activity) return;
    activity.name = inputs.activity_name.trim() || 'no-name';
    DB.save();
    RPCGUI.refreshActivityList();
    RPCGUI.updatePreview();
}

async function onExportApplication() {
    toggleAppConfig('hide');
    if (await dekita_rpc.exportAppData(DB.application)) {
        RPCGUI.showAlert('Application data exported!', 'success');
    }
}

async function onImportApplication() {
    toggleAppConfig('hide');
    try {
        const application = await dekita_rpc.importAppData();
        if (!application) return; // cancelled
        const index = DB.createApplication({...application, app_id: application.id});
        await selectApplication(index);
        RPCGUI.showAlert('Application data imported!', 'success');
    } catch (error) {
        console.error(error);
        RPCGUI.showAlert(error.message);
    }
}

// picking another activity while live would change what discord shows,
// so ask first. the picked activity becomes the live one on confirm.
function onAttemptChangeActivity(index) {
    if (!RPCTool.active) return selectActivity(index);
    switching_activity_index = index;
    const live_name = DB.activity.name;
    const next_name = DB.getActivityByID(index).name;
    labels.stop_activity_message = `"${live_name}" is live on your profile right now. Switching to "${next_name}" will show it instead.`;
    buttons.cancel_change_activity.textContent = `Keep ${live_name}`;
    buttons.confirm_change_activity.textContent = `Switch to ${next_name}`;
    modals.stop_activity.show();
}

async function onConfirmChangeActivity(event) {
    modals.stop_activity.hide();
    if (switching_activity_index === null) return;
    await selectActivity(switching_activity_index);
    switching_activity_index = null;
    RPCTool.refreshNow();
}

function showActivityMenu(index, cog) {
    menu_activity_index = index;
    const menu = areas.activity_menu;
    const panel = menu.parentElement.getBoundingClientRect();
    const rect = cog.getBoundingClientRect();
    menu.style.top = `${rect.bottom - panel.top + 4}px`;
    menu.classList.remove('d-none');
}
function hideActivityMenu() {
    areas.activity_menu.classList.add('d-none');
}

async function onActivityMenuAction(action) {
    hideActivityMenu();
    const index = menu_activity_index;
    switch (action) {
        case 'rename': return app_events.emit('clicked-edit-activity', index);
        case 'duplicate': {
            const new_index = DB.duplicateActivity(index);
            if (new_index === null) return;
            // the live activity stays selected, see DB.duplicateActivity
            if (RPCTool.active) return RPCGUI.refreshActivityList();
            return selectActivity(new_index);
        }
        case 'delete': {
            if (RPCTool.active) return RPCGUI.showAlert('Stop the live activity before deleting one.', 'warning');
            if (index !== DB.activityID) await selectActivity(index);
            return onAttemptDeleteActivity();
        }
    }
}

function showDeleteModal(type) {
    pending_delete = type;
    const app_name = DB.application.name || 'this application';
    labels.delete_modal_title = `Delete ${type}?`;
    if (type === 'activity') {
        labels.delete_modal_message = `"${DB.activity.name}" will be removed from ${app_name}. This can't be undone.`;
    } else {
        const count = DB.application.activities.length;
        labels.delete_modal_message = `${app_name} and its ${count} ${count === 1 ? 'activity' : 'activities'} will be removed. This can't be undone.`;
    }
    modals.delete_activity.show();
}

async function onAttemptDeleteActivity(event) {
    if (DB.application.activities.length > 1) {
        showDeleteModal('activity');
    } else {
        RPCGUI.showAlert("Cannot delete your only activity!");
    }
}

async function onAttemptDeleteApplication(event) {
    toggleAppConfig('hide');
    if (DB.length > 1) {
        showDeleteModal('application');
    } else {
        RPCGUI.showAlert("Cannot delete your only application!");
    }
}

async function onConfirmDelete(event) {
    modals.delete_activity.hide();
    await RPCTool.stopLoop();
    if (pending_delete === 'application') {
        if (DB.deleteApplication()) await selectApplication(DB.appID);
    } else if (pending_delete === 'activity') {
        if (DB.deleteActivityID()) await selectActivity(DB.activityID);
    }
    pending_delete = null;
}

// shows or hides the application menu ('toggle', 'show' or 'hide')
function toggleAppConfig(type='toggle') {
    const dropdown = areas.current_app_config_dropdown.classList;
    const show = type === 'toggle' ? dropdown.contains('d-none') : type === 'show';
    dropdown.toggle('d-none', !show);
    dropdown.toggle('d-block', show);
    buttons.current_app_config.classList.toggle('fa-times', show);
    buttons.current_app_config.classList.toggle('fa-angle-double-down', !show);
}

/**
* ■ wrapper around other event listeners:
*/
document.addEventListener('DOMContentLoaded', async()=>{


    for (const input of queryAll('input')) {
        if (!input.id.startsWith('app-')) continue;
        ['input','change','paste'].forEach(event => {
            input.addEventListener(event,e=>onUpdateChanges(e));
        });
    }

    checkboxes.timestamp.addEventListener('click',e=>onUpdateChanges(e));
    checkboxes.image1.addEventListener('click',e=>onUpdateChanges(e));
    checkboxes.image2.addEventListener('click',e=>onUpdateChanges(e));
    checkboxes.button1.addEventListener('click',e=>onUpdateChanges(e));
    checkboxes.button2.addEventListener('click',e=>onUpdateChanges(e));

    selectors.image1.addEventListener('change',e=>onUpdateChanges(e));
    selectors.image2.addEventListener('change',e=>onUpdateChanges(e));
    selectors.type.addEventListener('change',e=>onUpdateChanges(e));
    const theme = await app_config.get('gui-theme');
    if (theme === 'custom') loadCustomthemeFromStorage();
    refreshThemeTiles(theme);
    for (const tile of areas.theme_tiles.querySelectorAll('[data-theme]')) {
        tile.addEventListener('click', () => {
            const no_custom_yet = tile.dataset.theme === 'custom' && !getCustomThemeColors();
            if (no_custom_yet) return openThemeCustomizer();
            applyTheme(tile.dataset.theme);
        });
    }
    buttons.app_themes.addEventListener('click', openThemeCustomizer);
    app_events.on('custom-theme-saved', () => applyTheme('custom'));

    // activity context menu (cog on each activity)
    app_events.on('clicked-activity-menu', showActivityMenu);
    for (const item of areas.activity_menu.querySelectorAll('[data-activity-action]')) {
        item.addEventListener('click', () => onActivityMenuAction(item.dataset.activityAction));
    }
    document.addEventListener('click', event => {
        if (!areas.activity_menu.contains(event.target)) hideActivityMenu();
    });

    // rename activity modal
    getElement('app-activity-name').addEventListener('input', onRenameActivity);
    getElement('app-activity-name').addEventListener('keydown', event => {
        if (event.key === 'Enter') modals.edit_activity.hide();
    });
    modals.edit_activity_element.addEventListener('shown.bs.modal', () => {
        getElement('app-activity-name').select();
    });


    buttons.confirm_add_application.addEventListener('click',onConfirmAddApplication);


    function openDevPortal(app_id="") {
        dekita_rpc.openExternal(`https://discord.com/developers/applications/${app_id}`);
    }

    for (const dev_portal_btn of buttons.dev_portal_btns) {
        dev_portal_btn.addEventListener('click', e=>openDevPortal());
    }
    // stops (or cancels connecting) when an activity is live or starting
    buttons.launch_activity.addEventListener('click', ()=>{
        RPCTool.active ? RPCTool.stopLoop() : RPCTool.beginLoop();
    });

    buttons.app_settings.addEventListener('click', event => {
        modals.settings.show();
        buttons.app_settings.blur();
    });
    for (const app_info_btn of buttons.app_info_btns) {
        app_info_btn.addEventListener('click', event => {
            dekita_rpc.openChildWindow('help');
            app_info_btn.blur();
        });
    }



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
    });

    buttons.app_dev_portal.addEventListener('click', async event =>{
        openDevPortal(DB.application.id);
    });

    buttons.delete_application.addEventListener('click', onAttemptDeleteApplication);
    buttons.export_application.addEventListener('click', onExportApplication);
    buttons.import_application.addEventListener('click', onImportApplication);

    buttons.delete_activity.addEventListener('click', onAttemptDeleteActivity);
    buttons.confirm_delete_activity.addEventListener('click', onConfirmDelete);
    buttons.confirm_change_activity.addEventListener('click', onConfirmChangeActivity);


    buttons.current_app_config.addEventListener('click', ()=>{
        toggleAppConfig('toggle');
    });

    modals.settings_element.addEventListener('hide.bs.modal', () => {
        RPCGUI.closeAllTooltips();
    });




    app_events.on('clicked-app-list-item', async (item, index) => {
        if (index !== DB.appID) await selectApplication(index);
    });

    app_events.on('clicked-activity-list-item', async (item, index) => {
        if (index !== DB.activityID) await onAttemptChangeActivity(index);
    });

    app_events.on('clicked-new-activity', onCreateNewActivity);

    app_events.on('clicked-edit-activity', (index) => {
        const activity = DB.getActivityByID(index);
        editing_activity_index = index;
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
        // discord no longer uses discriminators (#1234) for most users
        loggedin.username = client.user.global_name || client.user.username;
        loggedin.userdisc = `@${client.user.username}`;
    });


    let shown_download_toast = false;
    dekita_rpc.onUpdater((type, info) => {
        switch (type) {
            case 'update-available':
                RPCGUI.showAlert('Update Found!', 'success', true);
            break;
            case 'download-progress':
                if (shown_download_toast) break;
                shown_download_toast = true;
                RPCGUI.showAlert('Downloading Update...', 'info', true);
            break;
            case 'update-downloaded':
                // ask before restarting, otherwise installs when app closes
                modals.update.show();
            break;
            case 'error':
                console.error(info);
            break;
        }
    });
    buttons.restart_for_update.addEventListener('click', () => {
        dekita_rpc.performApplicationUpdate();
    });

    // welcome / getting started modal
    buttons.show_welcome.addEventListener('click', () => modals.welcome.show());
    for (const element of queryAll('[data-welcome]')) {
        element.addEventListener('click', event => {
            element.blur();
            switch (element.dataset.welcome) {
                case 'show': return modals.welcome.show();
                case 'dev-portal': return openDevPortal();
                case 'help': return dekita_rpc.openChildWindow('help');
            }
        });
    }

    const load_problem = await DB.load();
    if (!DB.length) { // first time app is accessed:
        RPCTool.setupInitialApplications();
    }
    await RPCTool.initialize();
    if (load_problem) {
        const restored = load_problem.restored_backup ? 'your last backup was loaded' : 'it could not be recovered';
        RPCGUI.showAlert(`Your saved applications file was damaged, ${restored}. The damaged file was kept as ${load_problem.moved_to}`, 'warning');
    }
    RPCGUI.fillMissingAppNames();
    await RPCGUI.updateUserCounters();
    setInterval(()=>RPCGUI.updateUserCounters(), 1000 * 60);
    setup_app_action_listeners('main');
    has_first_rendered = true;
    if (await app_config.get('show-welcome')) modals.welcome.show();
});