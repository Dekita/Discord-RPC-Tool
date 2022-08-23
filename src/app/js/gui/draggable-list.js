/**
* module: RPCGUI
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: Class for gui updates etc
*/
import {
    getElement,
    getElementIndex,
} from "../helpers.js";

export default class DraggableList {
    constructor(){this.initialize(...arguments)}
    initialize() {this.refresh()}
    
    // the class to search for when dragging
    static get dragclass(){return '.btn'}
    get active_index(){return null}
    get container(){return null}
    get entries(){return null}

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
            html: '<i class="fas fa-plus fa-fw"></i>',
        });
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
        btn.addEventListener('dragstart', async event => {
            event.dataTransfer.setData('dek-drag-id', event.target.id);
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
            const dragged_id = event.dataTransfer.getData('dek-drag-id')
            const dragged_element = getElement(dragged_id);
            const btn = event.target.closest(this.dragclass);
            const old_index = getElementIndex(dragged_element);
            const new_index = getElementIndex(btn);
            await this.onItemDragged(old_index,new_index);
        });
        if (index === this.active_index){
            btn.classList.add('active');
        } 
    }

    // todo in child: switch id for component
    static async onAfterRefresh() {
        app_events.emit('refreshed-list', this);
    }
    static async onItemClicked(item, index, event) {
        app_events.emit('clicked-list-item', item, index)
    }
    static async onItemDragged(oldID, newID) {
        app_events.emit('dragged-list-item', item)
        this.refresh();
    }
    static async onNewItemClicked(event) {
        app_events.emit('clicked-new-list-item', event)
        return null;
    }
}

