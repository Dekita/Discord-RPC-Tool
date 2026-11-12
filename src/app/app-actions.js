/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* 
* This file handles the actions for the app titlebar.
* since windows are shown frameless, with a custom titlebar, 
* its important to define how the cclose/maximize etc buttons work.
*/
import { getElement } from "./js/helpers.js";

// Static class to handle titlebar actions
class TitlebarActions {
    // get the elements for titlebar buttons
    static #action_buttons = {
        mini: getElement('btn-app-minimize'),
        maxi: getElement('btn-app-maximize'),
        exit: getElement('btn-app-exit'),
    };
    // icons used for maximize icon change
    static #icons = {
        norm: 'fa-window-maximize',
        maxi: 'fa-window-restore',
    };
    // helper function to register event listener to button
    static register(window_id, button_id, listener_id) {
        const button = this.#action_buttons[button_id];
        if (!button || !this[listener_id]) return null;
        const funk = e => this[listener_id](window_id, button);
        button.addEventListener('click', funk);
        return true;
    }
    static async onMinimize(window_id, button) {
        await dekita_rpc.minimize(window_id);
    }
    static async onMaximize(window_id, button) {
        const icon = button.querySelector('i');
        if (await dekita_rpc.maximize(window_id)) {
            icon.classList.replace(this.#icons.norm, this.#icons.maxi);
        } else {
            icon.classList.replace(this.#icons.maxi, this.#icons.norm);
        }
    }
    static async onExit(window_id, button) {
        await dekita_rpc.exit(window_id);
    }
}

// links open in the system browser, never inside the app window
function onClickDocument(event) {
    const link = event.target.closest('a[href]');
    const href = link?.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(href)) dekita_rpc.openExternal(href);
}

// function sets event listeners for titlebar buttons and links and
// then triggers the ready event for the given window id. 
export default function(window_id) {
    document.addEventListener('click', onClickDocument);
    // windows draws no frame border while maximized, see app.css
    const syncMaximized = () => {
        const maximized = outerWidth >= screen.availWidth && outerHeight >= screen.availHeight;
        document.body.classList.toggle('window-maximized', maximized);
    };
    window.addEventListener('resize', syncMaximized);
    syncMaximized();
    TitlebarActions.register(window_id, 'mini', 'onMinimize');
    TitlebarActions.register(window_id, 'maxi', 'onMaximize');
    TitlebarActions.register(window_id, 'exit', 'onExit');
    dekita_rpc.sendReadyEvent(window_id);
};
