/**
* module: DB
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: Handles database related tasks
*/

import RPCApplication from "./rpc-application.js";
import RPCActivity from "./rpc-activity.js";

// key used when the data was stored in localStorage (before v1.0.0)
const LEGACY_STORAGE_KEY = `dekita-rpc-data`;

// after swapping slots a and b, returns where the item at index is now
function swappedIndex(index, a, b) {
    if (index === a) return b;
    if (index === b) return a;
    return index;
}

/**
* ■ System Database:
* data is stored in a json file by the main process.
* every change is saved straight away (autosave).
*/
export default class DB {

    // returns the problem reported by the main process if the saved file
    // was broken (see dek/app-data.js), or null
    static async load() {
        const {applications, problem} = await dekita_rpc.getAppData();
        let data = applications;
        if (!Array.isArray(data)) data = this.loadLegacyData();
        this._data = data.map(options => new RPCApplication({app_id: options.id, ...options}));
        this._active_index = {app:0, activity:0};
        if (this._data.length) this.save();
        return problem;
    }
    // reads data saved by older versions in localStorage.
    // the localStorage copy is left in place as a backup.
    static loadLegacyData() {
        try {
            const db = localStorage.getItem(LEGACY_STORAGE_KEY);
            const data = db ? JSON.parse(db) : [];
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error(error);
            return [];
        }
    }
    static save() {
        if (!this._data) return;
        dekita_rpc.setAppData(this._data).catch(error => console.error(error));
    }


    static createApplication(options) {
        this._data.push(new RPCApplication(options));
        this.save();
        return this._data.length - 1;
    }

    static deleteApplication(id = this._active_index.app) {
        if (!this._data[id]) return false;
        this._data.splice(id, 1);
        this._active_index.app = Math.max(Math.min(this._active_index.app, this._data.length - 1), 0);
        this._active_index.activity = 0;
        this.save();
        return true;
    }

    // swaps two applications. the selected application stays selected,
    // wherever it moved to, so the editor still matches it.
    static switchApplicationIndex(oldId, newId){
        if (oldId === newId || !this._data[oldId] || !this._data[newId]) return false;
        [this._data[oldId], this._data[newId]] = [this._data[newId], this._data[oldId]];
        this._active_index.app = swappedIndex(this._active_index.app, oldId, newId);
        this.save();
        return true;
    }

    static get application() {
        return this._data[this._active_index.app] ?? null;
    }

    static entries() {
        return this._data.entries();
    }
    static get length() {
        return this._data.length;
    }

    static get appID(){
        return this._active_index.app
    }
    static setAppID(id) {
        if (this._active_index.app === id) return false;
        this._active_index.app = id;
        this.setActivityID(0);
        return true;
    }



    static createActivity(options) {
        this.application.activities.push(new RPCActivity(options));
        this.save();
        return this.application.activities.length - 1;
    }
    // copies the activity at id, placing the copy directly after it.
    // the selected activity stays selected (it may move down one slot)
    static duplicateActivity(id = this._active_index.activity) {
        const activities = this.application?.activities;
        if (!activities?.[id]) return null;
        const copy = structuredClone(activities[id]);
        copy.name = `${copy.name}-copy`;
        activities.splice(id + 1, 0, new RPCActivity(copy));
        if (this._active_index.activity > id) this._active_index.activity++;
        this.save();
        return id + 1;
    }
    static deleteActivityID(id = this._active_index.activity) {
        const activities = this.application?.activities;
        if (!activities?.[id]) return false;
        activities.splice(id, 1);
        if (this._active_index.activity > id) this._active_index.activity--;
        this._active_index.activity = Math.max(Math.min(this._active_index.activity, activities.length - 1), 0);
        this.save();
        return true;
    }

    // swaps two activities. the selected activity stays selected,
    // wherever it moved to, so the editor still matches it.
    static switchActivityIndex(oldId, newId) {
        const array = this.application.activities;
        if (oldId === newId || !array[oldId] || !array[newId]) return false;
        [array[oldId], array[newId]] = [array[newId], array[oldId]];
        this._active_index.activity = swappedIndex(this._active_index.activity, oldId, newId);
        this.save();
        return true;
    }


    static get activity() {
        if (!this.application) return null;
        return this.getActivityByID();
    }

    static activities() {
        return (this.application?.activities || []).entries();
    }

    static getActivityByID(id = this._active_index.activity) {
        return this.application.activities[id];
    }

    static get activityID() {
        return this._active_index.activity;
    }
    static setActivityID(id) {
        if (this._active_index.activity === id) return false;
        this._active_index.activity = id;
        return true;
    }

}
