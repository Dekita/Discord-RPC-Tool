

import { areas } from "../elements.js";
import DB from "../db.js";

function capitalize([char1, ...rest]) {
    return char1.toUpperCase() + rest.join("");
}

export default class RPCGUI_Toaster {

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
        areas.toast_container.append(area);
        const bs_toast = new bootstrap.Toast(area, {autohide: false});
        area.addEventListener('hidden.bs.toast',()=>{
            bs_toast.dispose();
            areas.toast_container.removeChild(area);
        });
        bs_toast.show();
        // const delay = is_update ? (activity.rpc_freq+1)*1000 : 5000;
        setTimeout(()=>bs_toast.hide(), 10_000);
    }

}