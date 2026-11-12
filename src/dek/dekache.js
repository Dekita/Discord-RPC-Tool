/**
* Dekache: Written by dekitarpg@gmail.com
*/
const log = require('./logger')(__filename);
const EventEmitter = require('events');

/**
* An object containing key value pairs where the key is a string identifier,
* and the value is an object with the properties detailed below:
* @typedef Dekache~options
* @property {string} [name=] - An identifyer for this cache.
* @property {number} [mins=1] - Number of minutes to cache each item for
* @property {number} [freq=1000] - The frequenzy to check cache items for deletion (ms)
* @property {boolean} [log=true] - Should cache updates be logged?
*/

/**
* ```
* const mycache = new Dekache({name:'you got any cache?', mins: 2})
* await mycache.get('some-identifier', async() => { return 1 });
* ```
* `mycache.get('some-identifier', ()=>{})` calls will now return 1 until
* the number of mins (2) has been reached.
* @class
*/
class Dekache extends EventEmitter {
    static get default_options() {
        return {
            name: 'unnamed-cache', // the cache name for easy identifications
            mins: 1, // duration before data is removed from the cache
            freq: 1000, // frequency at which the cache items are checked for removal.
            log: true, // should cache updates be logged?
        }
    }
    constructor() {
        super(); // become event emitter
        this.initialize(...arguments);
    }
    /**
    * @property {object} data - stores key value pairs for cache items
    */
    get data(){ return this._data }
    /**
    * Called automatically when created
    * @param {Dekache~options} options - a cache options object.
    */
    initialize(options={}) {
        // setup general config options
        const cache_options = {...Dekache.default_options, ...options};
        this._name = cache_options.name;
        this._mins = cache_options.mins;
        this._freq = cache_options.freq;
        this._log  = cache_options.log;
        this._hand = null;
        this._data = {};
        // callbacks still running, so calls made meanwhile share one result
        this._pending = {};
        if (!cache_options.no_start) this.start();
    }
    /**
    * Starts the cache loop. Can be later stopped called {@link Dekache#stop}
    * @returns {boolean} Based on if started. False if already started.
    */
    start() {
        if (this._hand) return false;
        this._hand = setInterval(() => this.clear(), this._freq);
        // the cache loop alone should not keep the process running
        this._hand.unref?.();
        return true;
    }
    /**
    * Stops the cache loop. Can later be restarted calling {@link Dekache#start}
    * @returns {boolean} Based on if stopped. False if already stopped.
    */
    stop() {
        if (!this._hand) return false;
        clearInterval(this._hand);
        this._hand = null;
        return true;
    }
    /**
    * Delete the given key from the cache
    * @param {object} data_key - the identifier for the cache item to delte.
    * @returns {boolean} Based on if any item was deleted from cache. False if not.
    */
    delete(data_key) {
        const cache_name = JSON.stringify(data_key);
        if (!this._data[cache_name]) return false;
        delete this._data[cache_name];
        return true;
    }
    /**
    * Iterates over each cache item and clears any that have overstayed the duration.
    * @param {boolean} [forced=false] - Should all cache items be forced out regardless of duration?
    */
    clear(forced=false) {
        const cache2clear = Object.keys(this._data).filter(key => {
            return forced || this._data[key].checkTimeDiff(this._mins);
        });
        if (this._log && cache2clear.length) {
            const total = Object.keys(this._data).length;
            log.info(`clearing ${cache2clear.length}/${total} items from ${this._name}`);
        }
        for (const key of cache2clear) {
            this.emit('clear-item', key, this._data[key]);
            delete this._data[key];
        }
        this.emit('clear', this._data);
    }
    /**
    * Get the data, or uses callback function to populate cache and then returns data.
    * If the callback throws, nothing is cached and the error is passed on.
    * @param {object} data_id - the identifier for the cache item to get.
    * @param {function} new_data_callback - an asyncronous callback that should be called if no data is currently in the cache.
    * @returns {promise} Based on the data returned from the first time that
    * this function was called and the callbacks return data.
    */
    async get(data_id, new_data_callback) {
        const cache_name = JSON.stringify(data_id);
        if (this._data[cache_name]) return this._data[cache_name].data;
        if (!new_data_callback) return undefined;
        if (!this._pending[cache_name]) {
            this._pending[cache_name] = (async () => {
                try {
                    const new_data = await new_data_callback();
                    this._data[cache_name] = new DekacheItem(new_data);
                    return new_data;
                } finally {
                    delete this._pending[cache_name];
                }
            })();
        }
        return await this._pending[cache_name];
    }
}

/**
* Used within the Dekache class. See {@link DekacheItem#initialize}
* @class DekacheItem
*/
class DekacheItem {
    constructor() {this.initialize(...arguments)}
    /**
    * The data that this cache item is storing.
    * @type {object}
    * @read_only
    */
    get data() {return this._data}
    /**
    * The Date.now() when this item was created.
    * @type {number}
    * @read_only
    */
    get time() {return this._time}
    /**
    * Called automatically when created
    * @param {object} cache_data - The data to hold
    */
    initialize(cache_data) {
        this._data = cache_data;
        this._time = Date.now();
    }
    /**
    * Checks if this item was created longer than `mins` ago.
    * @param {number} mins - the number of minutes to check against (integer).
    * @returns {boolean} Based on if item was created longer than `mins` ago.
    */
    checkTimeDiff(mins) {
        return (Date.now() - this._time) >= (1000 * 60 * mins);
    }
}

module.exports = Dekache;
