
/**
* module: DB
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: Handles database related tasks
*/

import RPCApplication from "./rpc-application.js";
import RPCActivity from "./rpc-activity.js";
import RPCTool from "./rpc-tool.js";

/**
* ■ System Database:
*/
export default class DB {

    static loadOrInit() {
        const db = localStorage.getItem(`dekita-rpc-data`);
        this._data = db ? JSON.parse(db) : [];
        this._active_index = {app:0, activity:0};
    }
    static save() {
        const data = JSON.stringify(this._data);
        localStorage.setItem(`dekita-rpc-data`, data);
        // RPCTool.flagSaved();
    }


    static createApplication(options) {
        this._data.push(new RPCApplication(options));
        console.log('data:', this._data)
        this.save();
    }

    static deleteApplication(id) {
        if (!this._data[id]) return false;
        this._data.splice(id, 1);
        return true;
    }

    static switchApplicationIndex(oldId, newId){
        [this._data[oldId], this._data[newId]] = [this._data[newId], this._data[oldId]];
        this.setAppID(newId);
    }

    static get application() {
        return this._data[this._active_index.app]
    }

    static entries() {
        if (!this._data) this.loadOrInit();
        return this._data.entries();
    }
    static get length() {
        if (!this._data) this.loadOrInit();
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
        console.log('data:', this._data)
    }
    static deleteActivityID(id) {
        if (!this.application.activities[id]) return false;
        this.application.activities.splice(id, 1);
        // this.save();
        return true;
    }

    static switchActivityIndex(oldId, newId) {
        const array = this.application.activities;
        [array[oldId], array[newId]] = [array[newId], array[oldId]];
        this.setActivityID(newId);
    }


    static get activity() {
        if (!this.application) return null;
        return this.getActivityByID();
    }

    static activities() {
        // if (!this.application?.activities) return [];
        return this.application.activities.entries();
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


    // static push() {
    //     if (!this._data) this.loadOrInit();
    //     this._data.push(...arguments);
    //     this.save();
    // }

}