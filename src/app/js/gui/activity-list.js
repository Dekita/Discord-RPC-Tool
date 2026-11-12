
import { areas } from "../elements.js";
import DraggableList from "./draggable-list.js";
import DB from "../db.js";

// @private class
export default class RPCGUI_ActivityList extends DraggableList {
    static get dragclass(){return '.list-group-item'}
    static get new_button_html(){return '<i class="fas fa-plus fa-fw"></i><span class="ms-1">New activity</span>'}
    static get active_index(){return DB.activityID}
    static get container(){return areas.activity_list_group}
    static get entries() {return DB.activities()}
    static async onAfterRefresh() {
        app_events.emit('refreshed-activity-list', this);
    }
    static async onItemClicked(item, index, event) {
        if (event.target.nodeName === 'I') return;
        app_events.emit('clicked-activity-list-item', item, index)
    }
    static async onItemDragged(oldID, newID) {
        app_events.emit('dragged-activity-list-item', oldID, newID)
        DB.switchActivityIndex(oldID, newID);
        this.refresh();
    }
    static async onNewItemClicked(event) {
        app_events.emit('clicked-new-activity', event);
    }
    /**
    <li class="list-group-item trans-bg hover-dark">
        <div class="d-flex">
            <div class="text-start w-100">
                <i class="fas fa-fw fa-hashtag"></i>
                <span>Activity1</span>
            </div>
            <div class="text-end">
                <i class="fas fa-fw fa-cog"></i>
            </div>
        </div>
    </li>
    */
    static createButton(options, index) {
        const btn = document.createElement('li');
        btn.classList.add('list-group-item', 'trans-bg', 'hover-dark');
        if (options.html) {
            btn.innerHTML = options.html;
            return btn;
        }
        btn.id = dekita_rpc.uuid();
        btn.setAttribute('draggable', true);
        const div = document.createElement('div');
        div.classList.add('d-flex');
        btn.append(div);
        const label_div = document.createElement('div');
        label_div.classList.add('text-start', 'w-100');
        const hashtag = document.createElement('i');
        hashtag.classList.add('fas', 'fa-fw', 'fa-hashtag');
        const label = document.createElement('span');
        label.innerText = options.name || '???';
        // only visible on the active item while the activity is live
        const live_dot = document.createElement('span');
        live_dot.classList.add('live-dot');
        label_div.append(hashtag, label, live_dot)
        const cog_div = document.createElement('div');
        cog_div.classList.add('text-end');
        const cog = document.createElement('i');
        cog.classList.add('fas', 'fa-fw', 'fa-cog');
        cog_div.append(cog);
        cog.addEventListener('click', event => {
            event.stopPropagation();
            app_events.emit('clicked-activity-menu', index, cog);
        });
        div.append(label_div, cog_div);
        return btn;
    }
}