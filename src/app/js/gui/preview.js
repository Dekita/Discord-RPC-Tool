


import { labels, activity_preview } from "../elements.js";
import DB from "../db.js";
import RPCTool from "../rpc-tool.js";
import { ACTIVITY_TYPE_LABELS } from "../constants.js";

// avoids loading 'undefined' as a relative url when asset is unknown
function setImageSource(image, src) {
    if (src) image.src = src;
    else image.removeAttribute('src');
}

export default class RPCGUI_ActivityPreview {

    static async refresh() {
        const activity = DB.activity;
        const temp_stats = {'{p}':'??', '{players}':'??', '{s}':'??', '{servers}':'??'};
        await RPCTool.addDefaultReplacers(activity, temp_stats);
        activity_preview.details.innerText = dekita_rpc.format(activity.details, temp_stats);
        activity_preview.state.innerText = dekita_rpc.format(activity.state, temp_stats);
        
        const preview_buttons = [activity_preview.button1, activity_preview.button2];
        for (const [index, element] of preview_buttons.entries()) {
            const {url, label, enabled} = activity.buttons[index];
            const url_valid = dekita_rpc.isValidURL(url);
            if (url_valid) element.href = url;
            else element.removeAttribute('href');
            element.textContent = label;
            element.classList.toggle('disabled', !url_valid);
            element.classList.toggle('d-none', !(enabled && !!label));
        }

        // with only the small image enabled, discord shows it in the large slot
        const [large, small] = activity.images;
        activity_preview.container.classList.toggle('d-none', !large.enabled && !small.enabled);
        if (large.enabled) {
            setImageSource(activity_preview.image1, DB.application.assets?.[large.key]);
            activity_preview.image1.classList.remove('d-none');
        } else if (small.enabled) {
            setImageSource(activity_preview.image1, DB.application.assets?.[small.key]);
            activity_preview.image1.classList.remove('d-none');
        } else {
            activity_preview.image1.classList.add('d-none');
        }
        if (large.enabled && small.enabled) {
            setImageSource(activity_preview.image2, DB.application.assets?.[small.key]);
            activity_preview.image2.classList.remove('d-none');
        } else {
            activity_preview.image2.classList.add('d-none');
        }
        activity_preview.details.classList.toggle('d-none', !activity_preview.details.innerText);
        activity_preview.state.classList.toggle('d-none', !activity_preview.state.innerText);
        activity_preview.elapsed.classList.toggle('d-none', !activity.timestamp);
        this.refreshElapsed();
        
        const app_name = DB.application.name || "App Name";
        activity_preview.name.innerText = app_name;
        const type_label = ACTIVITY_TYPE_LABELS[activity.type] || ACTIVITY_TYPE_LABELS[0];
        activity_preview.type_label.innerText = type_label.replace('APP', app_name.toUpperCase());
        labels.active_activity_name = activity.name;
        labels.active_app_name = app_name;
    }

    // the elapsed time line ticks every second while an activity is running
    // formatted like discord: 12:48, or 1:02:48 once past an hour
    static refreshElapsed() {
        const seconds = Math.floor(RPCTool.runningMS / 1000);
        const hours = Math.floor(seconds / 3600);
        const parts = [Math.floor((seconds % 3600) / 60), seconds % 60];
        let time = parts.map(part => String(part).padStart(2, '0')).join(':');
        if (hours) time = `${hours}:${time}`;
        activity_preview.elapsed_time.textContent = time;
        return time;
    }
}
