/**
* module: DraggableList
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: base class for the application and activity lists
*/
import {
    getElement,
    getElementIndex,
} from "../helpers.js";

// data type used for list items being dragged
const DRAG_TYPE = 'dek-drag-item';

// used as static classes, the lists are never created with new
export default class DraggableList {
    // the class to search for when dragging
    static get dragclass(){return '.btn'}
    // contents of the 'add new' button at the end of the list
    static get new_button_html(){return '<i class="fas fa-plus fa-fw"></i>'}
    static get active_index(){return null}
    static get container(){return null}
    static get entries(){return null}

    static async refresh() {
        if (!this.container || !this.entries) return;
        await this.createListButtons();
        await this.createNewButton();
        await this.onAfterRefresh();
    }
    static async createListButtons() {
        this.container.innerHTML = "";
        for (const [index, data] of this.entries) {
            const btn = this.createButton(data, index);
            this.setupButtonEvents(index, btn);
            this.container.append(btn);
        }
    }
    static async createNewButton() {
        // new application button
        const new_app_btn = this.createButton({
            html: this.new_button_html,
        });
        new_app_btn.classList.add('list-new-item');
        new_app_btn.addEventListener('click', async event => {
            return await this.onNewItemClicked(event)
        });
        this.container.append(new_app_btn);
    }
    static createButton(options, index) {
        const btn = document.createElement('button');
        btn.id = dekita_rpc.uuid();
        btn.setAttribute('draggable', true);
        btn.classList.add('btn', 'btn-lg', 'btn-bg', 'fw-bold', 'mt-3', 'p-0', 'btn-58');
        if (options.icon) {
            const image = document.createElement('img');
            image.setAttribute('draggable', false);
            // an outdated discord icon url gives a blank button, use the app logo instead
            image.addEventListener('error', () => {
                image.src = 'img/rpc-icon.png';
            }, {once: true});
            image.src = options.icon;
            image.classList.add('img-fluid', 'rounded-circle');
            // image.style.maxHeight = '64px';
            btn.append(image);
        } else {
            btn.innerHTML = options.html;
        }
        return btn;
    }
    static setupButtonEvents(index, btn) {
        btn.addEventListener('click', async event => {
            await this.onItemClicked(btn, index, event);
        });
        // the list name is sent with the id, so items can only be dropped
        // onto the list they came from
        btn.addEventListener('dragstart', event => {
            event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({list: this.name, id: btn.id}));
        });
        btn.addEventListener('dragover', async event => {
            event.preventDefault();
        });
        btn.addEventListener('dragenter', async event => {
            event.target.classList.add('drag-border')
            event.preventDefault();
        });
        btn.addEventListener('dragleave', async event => {
            event.target.classList.remove('drag-border')
            event.preventDefault();
        });
        btn.addEventListener('drop', async event => {
            event.preventDefault();
            btn.classList.remove('drag-border');
            const dragged = this.readDragData(event);
            const dragged_element = dragged && getElement(dragged.id);
            // files, text, or an item from the other list
            if (!dragged_element || dragged.list !== this.name) return;
            if (dragged_element.parentElement !== this.container) return;
            const old_index = getElementIndex(dragged_element);
            const new_index = getElementIndex(btn);
            if (old_index === new_index) return;
            await this.onItemDragged(old_index,new_index);
        });
        if (index === this.active_index){
            btn.classList.add('active');
        }
    }

    // returns {list, id} for a dragged list item, or null for anything else
    static readDragData(event) {
        try {
            const data = JSON.parse(event.dataTransfer.getData(DRAG_TYPE) || 'null');
            return typeof data?.id === 'string' ? data : null;
        } catch {
            return null;
        }
    }

    // replaced by each list:
    static async onAfterRefresh() {}
    static async onItemClicked(item, index, event) {}
    static async onItemDragged(oldID, newID) {}
    static async onNewItemClicked(event) {}
}

