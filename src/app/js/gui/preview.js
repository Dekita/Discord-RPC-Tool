


import { labels, activity_preview } from "../elements.js";
import DB from "../db.js";

export default class RPCGUI_ActivityPreview {

    static async refresh() {
        const activity = DB.activity;
        const temp_stats = {'{p}':'??', '{players}':'??', '{s}':'??', '{servers}':'??'};
        activity_preview.details.innerText = dekita_rpc.format(activity.details, temp_stats);
        activity_preview.state.innerText = dekita_rpc.format(activity.state, temp_stats);
        
        activity_preview.button1.classList.add('d-none');
        activity_preview.button1.classList.remove('disabled')
        const url1valid = dekita_rpc.isValidURL(activity.buttons[0].url);
        activity_preview.button1.href = url1valid ? activity.buttons[0].url : null;
        activity_preview.button1.innerHTML = activity.buttons[0].label;
        if (!url1valid) {
            activity_preview.button1.classList.add('disabled');
        }
        if (activity.buttons[0].enabled && !!activity.buttons[0].label) {
            activity_preview.button1.classList.remove('d-none');
        }
        
        activity_preview.button2.classList.add('d-none');
        activity_preview.button2.classList.remove('disabled');
        const url2valid = dekita_rpc.isValidURL(activity.buttons[1].url);
        activity_preview.button2.href = url2valid ? activity.buttons[1].url : null;
        activity_preview.button2.innerHTML = activity.buttons[1].label;
        if (!url2valid) {
            activity_preview.button2.classList.add('disabled');
        }
        if (activity.buttons[1].enabled && !!activity.buttons[1].label) {
            activity_preview.button2.classList.remove('d-none');
        }
        
        activity_preview.textrow.classList.remove('ps-0');
        activity_preview.container.classList.add('d-none');
        activity_preview.container.classList.remove('fix-w');
        if (activity.images[0].enabled || activity.images[1].enabled) {
            activity_preview.container.classList.remove('d-none');
            activity_preview.textrow.classList.add('ps-0');
        }
        if (activity.images[0].enabled) {
            activity_preview.image1.src = DB.application.assets?.[activity.images[0].key];
            activity_preview.image1.classList.remove('d-none');
            activity_preview.image1.classList.remove('img-48');
        } else {
            activity_preview.image1.classList.add('d-none');
        }
        if (activity.images[1].enabled) {
            if (!activity.images[0].enabled) {
                activity_preview.image1.src = DB.application.assets?.[activity.images[1].key];
                activity_preview.image1.classList.remove('d-none');
                activity_preview.image1.classList.add('img-48');
                activity_preview.image2.classList.add('d-none');
                activity_preview.container.classList.add('fix-w');
            } else {
                activity_preview.image2.src = DB.application.assets?.[activity.images[1].key];
                activity_preview.image2.classList.remove('d-none');
            }
        } else {
            activity_preview.image2.classList.add('d-none');
        }
        
        const app_name = DB.application.name || "App Name";
        activity_preview.name.innerText = app_name;
        labels.active_activity_name = activity.name;
        labels.active_app_name = app_name;
    }
}