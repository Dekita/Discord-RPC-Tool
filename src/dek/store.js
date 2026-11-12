/**
* @file: data-store.js
* @author: dekitarpg@gmail.com
*/
(function datastore_wrapper(){"use strict";
    // use strict mode to enforce typing standards
    const path = require('path');
    const fs = require('fs');
    const stringify = require("json-stringify-pretty-compact");
    const logger = require('./logger')(__filename);
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
        * @param opts.filepath {String} folder for the file, defaults to the app data folder
        */
        constructor(opts){
            const folder = opts.filepath || require('electron').app.getPath('userData');
            this.path = path.join(folder, opts.filename + '.json');
            this._defaults = opts.defaults;
            // set when the file could not be read, see _readDataFile
            this.load_problem = null;
            this.data = this._readDataFile(this.path, opts.defaults);
            this._save_timeout_handle = null;
            this._on_set_callback = null;
        }
        get backup_path() {return `${this.path}.bak`}
        /**
        * {DataStore}.get(key)
        * @return 'key' property on the 'data' object
        */
        get(key){
            if (this.data[key] === undefined && this._defaults[key] !== undefined) {
                return this.set(key, this._defaults[key]);
            }
            return this.data[key];
        }
        /**
        * {DataStore}.set(key, value)
        * Sets 'key' property on the 'data' object to 'value'
        */
        set(key, val, cb){
            this.data[key] = val;
            this._setSaveDataTimer();
            this._on_set_callback = cb || null;
            return this.data[key];
        }
        /**
        * {DataStore}.delete(key)
        * deletes key from object.
        */
        delete(key){
            delete this.data[key];
            this._setSaveDataTimer();
        }
        /**
        * {DataStore}.save()
        * saves the data as it is now, eg: to keep the defaults of a new file
        */
        save(){
            this._setSaveDataTimer();
        }
        /**
        * {DataStore}.flush()
        * writes any pending changes to disk immediately
        */
        flush(){
            if (this._save_timeout_handle === null) return;
            clearTimeout(this._save_timeout_handle);
            this._saveDataFile();
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
        * writes the data to a temporary file first, then swaps it in, so a
        * crash or power cut while saving never leaves a half written file.
        * the previous file is kept as a .bak copy.
        * sync, so pending data is still written when the app is closing.
        */
        _saveDataFile(){
            this._save_timeout_handle = null;
            const temp_path = `${this.path}.tmp`;
            try {
                fs.mkdirSync(path.dirname(this.path), {recursive: true});
                const json = stringify(this.data, {maxLength: 108, indent: 4});
                fs.writeFileSync(temp_path, json);
                if (fs.existsSync(this.path) && !this.load_problem) {
                    fs.copyFileSync(this.path, this.backup_path);
                }
                fs.renameSync(temp_path, this.path);
                this.load_problem = null;
            } catch (error) {
                logger.error(`could not save ${this.path}: ${error.message}`);
                return;
            }
            if (this._on_set_callback) {
                this._on_set_callback();
            }
        }
        /**
        * {DataStore}._readDataFile(filePath, defaults)
        * @param filepath {String}
        * @param defaults {Object}
        * reads the desired data file. a missing file (first run) gives the
        * defaults. a broken file is moved aside, and the .bak copy is used.
        */
        _readDataFile(filePath, defaults){
            let error;
            try {
                return this._parseFile(filePath);
            } catch (read_error) {
                if (read_error.code === 'ENOENT') return structuredClone(defaults);
                error = read_error;
            }
            const moved_to = filePath.replace(/\.json$/, `.corrupt-${Date.now()}.json`);
            try { fs.renameSync(filePath, moved_to) } catch { /* keep going, the file is still unreadable */ }
            logger.error(`could not read ${filePath}: ${error.message}. moved it to ${moved_to}`);
            this.load_problem = {moved_to, restored_backup: false};
            try {
                const data = this._parseFile(this.backup_path);
                this.load_problem.restored_backup = true;
                return data;
            } catch {
                return structuredClone(defaults);
            }
        }
        // reads and parses a json file, which must hold an object
        _parseFile(filePath) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                throw new Error('file does not contain an object');
            }
            return data;
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
