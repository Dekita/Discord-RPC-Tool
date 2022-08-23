/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* 
* API class handles interactions with my own api to keep 
* track of user counts, and the version being used. 
* 
*/
const bent = require('bent');
const Dekache = require('./dekache');
const ApiCache = new Dekache({name: "api-cache", mins: 5});
const DekAPI = bent('https://dekitarpg.com/', 'POST', 'json', 200);

module.exports = class API {
    // get user counts from the given post data object.
    // this function is called from the main.js file. 
    static async getUserCount(post_data) {
        // check the cache for data, if doesnt exist, create.
        return await ApiCache.get('user-count', async() => { 
            // get data from the api using the given post_data
            const result = await DekAPI('rpc-ping', post_data);
            // if api ping was successful, return the counter
            return result.success ? result.counter || 0 : null;
        });
    }
}