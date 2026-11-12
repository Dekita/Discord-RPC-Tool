/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*/
import setup_app_action_listeners from "./app-actions.js";
import { applyThemeStyles } from "./js/theme-apply.js";

document.addEventListener('DOMContentLoaded', async (event) => {
    const options = {delay: 150, trigger: 'hover', container: 'body'};
    const tooltips = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltips.forEach(e => new bootstrap.Tooltip(e, options));
    // use the selected theme, and follow it when changed in the main window
    applyThemeStyles(await app_config.get('gui-theme'));
    app_config.onChange((key, value) => {
        if (key === 'gui-theme') applyThemeStyles(value);
    });
    const mark_area = document.getElementById('mark-area');
    try {
        const converter = new showdown.Converter();
        converter.setFlavor('github');
        const markdown  = await dekita_rpc.readAppFile('../readme.md');
        // parse into a template first (its content is inert), so the
        // images are fixed before the browser tries to load them
        const template = document.createElement('template');
        template.innerHTML = converter.makeHtml(markdown);
        const holder = template.content;
        for (const link of holder.querySelectorAll('a')) {
            if (link.querySelectorAll('img').length) continue;
            link.classList.add('hover-dark','hover-secondary')
            if (link.id.startsWith('how-to-install')) {
                link.classList.add('d-none');
            }
        }
        // the readme links images from the repo root (src/img/..),
        // this page is inside the src folder already
        for (const image of holder.querySelectorAll('img')) {
            const src = image.getAttribute('src') || '';
            if (src.startsWith('src/')) image.setAttribute('src', src.slice(4));
        }
        mark_area.replaceChildren(...holder.childNodes);
    } catch (error) {
        console.error(error);
        mark_area.textContent = `Could not load the guide: ${error.message}`;
    }
    setup_app_action_listeners('help');
});
