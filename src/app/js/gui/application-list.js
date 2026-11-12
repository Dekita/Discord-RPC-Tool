
import { areas, modals } from "../elements.js";
import DraggableList from "./draggable-list.js";
import DB from "../db.js";

// @private class
export default class RPCGUI_ApplicationsList extends DraggableList {
    static get dragclass(){return '.btn'}
    static get active_index(){return DB.appID}
    static get container(){return areas.applications_btn_container}
    static get entries() {return DB.entries()}
    static async onAfterRefresh() {
        app_events.emit('refreshed-app-list', this);
    }
    static async onItemClicked(item, index) {
        app_events.emit('clicked-app-list-item', item, index)
    }
    static async onItemDragged(oldID, newID) {
        app_events.emit('dragged-app-list-item', oldID, newID)
        DB.switchApplicationIndex(oldID, newID);
        this.refresh();
    }
    static async onNewItemClicked(event) {
        return modals.add_application.show();
    }
    static createButton(options, index) {
        const btn = super.createButton(options, index);
        // read on hover, names are filled in after the list is first drawn
        const getName = () => {
            if (options.html) return 'Add an application';
            return options.name || `Application ${options.id}`;
        };
        btn.addEventListener('mouseenter', () => showRailTooltip(btn, getName()));
        btn.addEventListener('mouseleave', hideRailTooltip);
        btn.addEventListener('mousedown', hideRailTooltip);
        return btn;
    }
}

// the rail scrolls (which clips its children), so app name tooltips
// are a single element on the body, positioned beside the hovered icon
let rail_tooltip = null;
function showRailTooltip(btn, name) {
    if (!rail_tooltip) {
        rail_tooltip = document.createElement('div');
        rail_tooltip.classList.add('rail-tooltip');
        document.body.append(rail_tooltip);
    }
    const rect = btn.getBoundingClientRect();
    rail_tooltip.textContent = name;
    rail_tooltip.style.left = `${rect.right + 10}px`;
    rail_tooltip.style.top = `${rect.top + rect.height / 2}px`;
    rail_tooltip.classList.add('show');
}
function hideRailTooltip() {
    rail_tooltip?.classList.remove('show');
}
