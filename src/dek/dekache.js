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
* @property {string} [type=force] - the cache type, either 'force' or 'renew'.
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
			type: 'force', // should renew data, or 'force' refresh after mins?
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
		this._type = cache_options.type;
		this._mins = cache_options.mins; 
		this._freq = cache_options.freq;
		this._log  = cache_options.log;
		this._hand = null;
		this._data = {}; 
		if (!cache_options.no_start) this.start();
	}
	/**
 	* Starts the cache loop. Can be later stopped called {@link Dekache#stop} 
	* @returns {boolean} Based on if started. False if already started. 
	* @async 
	*/
	async start() {
		if (!this._hand) {
			const loop = () => {this.loop()};
			this._hand = setInterval(loop, this._freq);
			return true;
		}
		return false;
	}
	/**
	* Stops the cache loop. Can later be restarted calling {@link Dekache#start} 
	* @returns {boolean} Based on if stopped. False if already stopped. 
	* @async 
	*/
	async stop() {
		if (this._hand) {
			clearInterval(this._hand);
			this._hand = null;
			return true;
		}
		return false;
	}
	/**
	* The main cache loop function. Calls {@link Dekache#clear} . 
	* @async 
	*/
	async loop() {
		await this.clear();
	}
	/**
	* Delete the given key from the cache
	* @param {object} data_key - the identifier for the cache item to delte. 
	* @returns {boolean} Based on if any item was deleted from cache. False if not. 
	*/
	async delete(data_key) {
		const cache_name = `${this._type}_${JSON.stringify(data_key)}`;
		if (this._data[cache_name]) {
			this._data[cache_name] = null;
			delete this._data[cache_name];
			return true;
		}
		return false;
	}
	/**
	* Iterates over each cache item and clears any that have overstayed the duration. 
	* @param {boolean} [forced=false] - Should all cache items be forced out regardless of duration?
	*/
	async clear(forced=false) {
		const cache2clear = [];
		const cache_k = Object.keys(this._data);
		const cache_v = Object.values(this._data);
		for (let index = 0; index < cache_v.length; index++) {
			const item = cache_v[index];
			if (item.data) {
				if (forced || await item.checkTimeDiff(this._mins)) {
					cache2clear.push(cache_k[index]);
				}
			} else {
				cache2clear.push(cache_k[index]);
			}
		}
		if (this._log && cache2clear.length) {
			log.info(`clearing ${cache2clear.length}/${cache_v.length} items from ${this._name}`);
		}
		cache2clear.forEach(key => {
			this.emit('clear-item', key, this._data[key]);
			this._data[key] = null;
			delete this._data[key];
		});
		this.emit('clear', this._data);
	}
	/**
	* Get the data, or uses callback function to populate cache and then returns data.
	* @param {object} data_key - the identifier for the cache item to get. 
	* @param {function} callback - an asyncronous callback that should be called if no data is currently in the cache.
	* @returns {promise} Based on the data returned from the first time that
	* this function was called and the callbacks return data.
	* @promise
	*/
	get(data_id, new_data_callback) {
		const cache_name = `${this._type}_${JSON.stringify(data_id)}`;
		return new Promise(async (resolve, reject) => {
			if (this._data[cache_name]){
				if (this._type === "renew") {
					await this._data[cache_name].renew();
				}
			} else if (new_data_callback) {
				const new_data = await new_data_callback();
				this._data[cache_name] = new DekacheItem(new_data);
			}
			resolve(this._data[cache_name].data);
		});        
	}
	set(data_id, new_data) {
		const cache_name = `${this._type}_${JSON.stringify(data_id)}`;
		return new Promise(async (resolve, reject) => {
			this._data[cache_name] = new DekacheItem(new_data);
			resolve(this._data[cache_name].data);
		});        
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
	* The Date.now() this item was last renewed. 
	* @type {number} 
    * @read_only 
    */	
	get time() {return this._time}
    /**
	* The Date.now() when this item was initially created. 
	* @type {number} 
    * @read_only 
    */	
	get init() {return this._init}
	/**
 	* Called automatically when created
	* @param {object} cache_data - The data to hold
	*/
	initialize(cache_data) {
		this._data = cache_data;
		this._time = Date.now();
		this._init = Date.now();
	}
	/**
	* Checks if this item was created longer than `mins` ago. 
	* @param {number} mins - the number of minutes to check against (integer). 
	* @returns {boolean} Based on if item was renewed longer than `mins` ago.
	*/
	async checkTimeDiff(mins) {
		return (Date.now() - this._time) >= (1000 * 60 * mins);
	}
	/**
	* Flags the item for renewal. This will stop {@link DekacheItem#checkTimeDiff} from returning true. 
	* Which in turn, will stop the item from being cleared from the cache. 
	*/
	async renew() {this._time = Date.now()}
}

module.exports = Dekache;
