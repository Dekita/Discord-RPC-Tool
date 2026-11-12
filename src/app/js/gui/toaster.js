

import { areas } from "../elements.js";

// most toasts shown at once, older toasts are removed first
const MAX_TOASTS = 3;

const TOAST_ICONS = {
    success: 'fa-check',
    info: 'fa-info',
    warning: 'fa-exclamation',
    danger: 'fa-times',
};

export default class RPCGUI_Toaster {

    // keep_open is kept for older callers, toasts always close themselves
    static cookBread(type, toast_content, keep_open=false) {
        const container = areas.toast_container;
        // the same message replaces its older toast instead of stacking up
        for (const toast of [...container.children]) {
            if (toast.dataset.message === toast_content) this.burnBread(toast, true);
        }
        while (container.children.length >= MAX_TOASTS) {
            this.burnBread(container.firstElementChild, true);
        }
        const duration = ['danger', 'warning'].includes(type) ? 8000 : 5000;
        const area = document.createElement('div');
        area.setAttribute('aria-live', 'assertive');
        area.setAttribute('role', 'alert');
        area.classList.add('dek-toast', `toast-${type}`);
        area.dataset.message = toast_content;
        area.style.setProperty('--toast-duration', `${duration}ms`);
        const icon = document.createElement('span');
        icon.classList.add('dek-toast-icon');
        icon.innerHTML = `<i class="fas fa-fw ${TOAST_ICONS[type] || TOAST_ICONS.info}"></i>`;
        const body = document.createElement('div');
        body.classList.add('dek-toast-body');
        body.textContent = toast_content;
        const close_button = document.createElement('button');
        close_button.setAttribute('aria-label', 'Close');
        close_button.classList.add('btn-close', 'btn-close-white');
        close_button.addEventListener('click', () => this.burnBread(area));
        const progress = document.createElement('div');
        progress.classList.add('dek-toast-progress');
        area.append(icon, body, close_button, progress);
        container.append(area);
        // next frame, so the slide in transition runs
        requestAnimationFrame(() => area.classList.add('show'));
        area._timeout = setTimeout(() => this.burnBread(area), duration);
    }

    static burnBread(area, instant=false) {
        if (!area || area.classList.contains('hiding')) return;
        clearTimeout(area._timeout);
        if (instant) return area.remove();
        area.classList.add('hiding');
        area.addEventListener('transitionend', () => area.remove(), {once: true});
        setTimeout(() => area.remove(), 400); // in case no transition runs
    }

}
