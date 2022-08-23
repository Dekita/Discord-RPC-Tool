
import { labels, areas, modals } from "../elements.js";
import DraggableList from "./draggable-list.js";
import RPCTool from "../rpc-tool.js";
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
}
