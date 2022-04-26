/**
* @file: data-store.js
* @author: dekitarpg@gmail.com
*/
(function datastore_wrapper(){"use strict";
    // use strict mode to enforce typing standards
    const electron = require('electron');
    const path = require('path');
    const fs = require('fs');
    const stringify = require("json-stringify-pretty-compact");
    /**
    * ■■■■■■■■■■■■■■■■■■■
    * ■ DataStore {Class}
    * ■■■■■■■■■■■■■■■■■■■
    */
    class DataStore {
        /**
        * new DataStore(opts) {DataStore}
        * @param opts {object}
        * @param opts.filename {String}
        * @param opts.defaults {Object}
        */
        constructor(opts){
            let userDataPath = (electron.app || electron.remote.app).getPath('userData');
            this.path = path.join(opts.filepath || userDataPath, opts.filename + '.json');
            this.data = this._readDataFile(this.path, opts.defaults);
            this._defaults = opts.defaults;
            this._save_timeout_handle = null;
            this._on_set_callback = null;
        }
        /**
        * {DataStore}.get(key)
        * @return 'key' property on the 'data' object
        */
        get(key){
            if (!this.data[key] && this._defaults[key]) {
                return this.set(key, this._defaults[key]);
            }
            return this.data[key];
        }
        /**
        * {DataStore}.set(key, value)
        * Sets 'key' property on the 'data' object to 'value'
        */
        set(key, val, cb){
            //console.log('setting:', key, val);
            this.data[key] = val;
            this._setSaveDataTimer();
            this._on_set_callback = cb || null;
            return this.data[key];
        }
        /**
        * {DataStore}.unique_push(key, value)
        * pushes key: val onto object if it doesnt exist.
        * if array ensures only 1 mathing element exists.
        */
        unique_push(key, val){
            var data = this.data[key];
            if (Array.isArray(data)){
                if (data.indexOf(val) == -1){
                    this.data[key].push(val);
                    this._setSaveDataTimer();
                }
            }
            return this.data[key];
        }
        push(key, val){
            var data = this.data[key];
            if (Array.isArray(data)){
                this.data[key].push(val);
                this._setSaveDataTimer();
            }
            return this.data[key];
        }
        /**
        * {DataStore}.delete(key, value)
        * deletes key from object.
        * if array ensures only deletes index with val.
        */
        delete(key, val){
            const data = this.data[key];
            if (Array.isArray(data)){
                const index = data.indexOf(val);
                if (index > -1){
                    this.data[key].splice(index, 1);
                    this._setSaveDataTimer();
                }
            } else {
                this.data[key] = undefined;
            }
            return this.data[key];
        }
        /**
        * {DataStore}._setSaveDataTimer()
        * sets the save data timeout function
        */
        _setSaveDataTimer(){
            if (this._save_timeout_handle !== null){
                clearTimeout(this._save_timeout_handle);
            }
            this._save_timeout_handle = setTimeout(()=>{
                this._saveDataFile();
            }, 1000);
        }
        /**
        * {DataStore}._saveDataFile()
        * writes the desired data file
        */
        _saveDataFile(){
            this._save_timeout_handle = null;
            // Wait, I thought using the node.js' synchronous APIs was bad form?
            // We're not writing a server so there's not nearly the same IO demand on the process
            // Also if we used an async API and our app was quit before the asynchronous write had a chance to complete,
            // we might lose that data. Note that in a real app, we would try/catch this.
            fs.writeFileSync(this.path, stringify(this.data, {maxLength: 108, indent: 4}));

            if (this._on_set_callback) {
                this._on_set_callback();
            }
        }
        /**
        * {DataStore}._readDataFile(filePath, defaults)
        * @param filepath {String}
        * @param defaults {Object}
        * reads the desired data file
        */
        _readDataFile(filePath, defaults){
            // We'll try/catch it in case the file doesn't exist yet, which will be the case on the first application run.
            // `fs.readFileSync` will return a JSON string which we then parse into a Javascript object
            try {
                return JSON.parse(fs.readFileSync(filePath));
            } catch(error) {
                // if there was some kind of error, return the passed in defaults instead.
                return defaults;
            }
        }
    }
    /**
    * Export the module
    */
    module.exports = DataStore;
})();
/**
* End module code
*/
