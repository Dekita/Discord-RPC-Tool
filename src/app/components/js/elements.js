/**
* module: elements
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: Where all elements/ids are defined
*/

import {getElement,getModal} from "./helpers.js";

export const app_id = getElement('app-id');
export const confirm_change_activity = getElement('confirm-change-activity');
export const dev_portal_btn = getElement('developer-portal');
export const app_image = getElement('app-image');
export const confirm_delete_activity_btn = getElement('confirm-delete-activity');
export const delete_activity_modal = getModal('delete-activity-modal');
export const app_settings_btn = getElement('app-settings-btn');
export const settings_modal_element = getElement('settings-modal');
export const settings_modal = getModal('settings-modal');
export const app_info_btn = getElement('app-info-btn');
export const force_refresh_data_btn = getElement('force-refresh-data');
export const force_app_icon_btn = getElement('force-app-icon');
export const force_app_details_btn = getElement('force-app-details');
export const force_app_state_btn = getElement('force-app-state');
export const alert_notification_area = getElement('alert-area');
export const save_activity_btn = getElement('save-activity');
export const launch_activity_btn = getElement('launch-activity');
export const delete_activity_btn = getElement('delete-activity');
export const stop_activity_modal = getModal('stop-activity-modal');
export const app_preview_details = getElement('app-preview-details');
export const app_preview_state = getElement('app-preview-state');
export const app_preview_image_large = getElement('app-preview-image');
export const app_preview_image_small = getElement('app-preview-image-sm');
export const app_preview_btn1 = getElement('preview-btn1');
export const app_preview_btn2 = getElement('preview-btn2');
export const toast_container = getElement('main-toast-container');

export const activity_checkboxes = [
    'app-rpc-timestamp-enabled',
    'app-rpc-img1-enabled',
    'app-rpc-img2-enabled',
    'app-rpc-btn1-enabled',
    'app-rpc-btn2-enabled',
];
export const app_config_checkboxes = [
    'auto-boot',
    'auto-play',
    'auto-tiny',
    'tiny-tray',
];
