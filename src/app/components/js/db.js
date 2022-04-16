
/**
* module: DB
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: Handles database related tasks
*/

import RPCActivity from "./rpc-activity.js";
import RPCTool from "./rpc-tool.js";

/**
* ■ System Database:
*/
export default class DB {
    static loadOrInit() {
        const db = localStorage.getItem(`dekita-rpc-data`);
        this._data = db ? JSON.parse(db) : [];
    }
    static save() {
        const data = JSON.stringify(this._data);
        localStorage.setItem(`dekita-rpc-data`, data);
        RPCTool.flagSaved();
    }
    static getActivityData(property) {
        if (!property) return this._data[RPCTool.activeID];
        return this._data[RPCTool.activeID][property];
    }
    static deleteActivityID(id) {
        if (!this._data[id]) return false;
        this._data.splice(id, 1);
        this.save();
        return true;
    }
    static switchIndex(oldId, newId) {
        [this._data[oldId], this._data[newId]] = [this._data[newId], this._data[oldId]];
    }
    static createNewEntry() {
        return this.push(new RPCActivity());
    }
    static push() {
        if (!this._data) this.loadOrInit();
        this._data.push(...arguments);
        this.save();
    }
    static entries() {
        if (!this._data) this.loadOrInit();
        return this._data.entries();
    }
    static get length() {
        if (!this._data) this.loadOrInit();
        return this._data.length;
    }
}