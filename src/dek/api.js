/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*
* API class handles interactions with my own api to keep
* track of user counts, and the version being used.
*
*/
const logger = require('./logger')(__filename);
const Dekache = require('./dekache');
const ApiCache = new Dekache({name: "api-cache", mins: 5});
const API_BASE = 'https://dekitarpg.com/';

// POST json to the api, returns the parsed json response
async function DekAPI(endpoint, post_data) {
    const response = await fetch(new URL(endpoint, API_BASE), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(post_data),
        signal: AbortSignal.timeout(10 * 1000),
    });
    if (response.status !== 200) throw new Error(`api error: ${response.status}`);
    return await response.json();
}

module.exports = class API {
    // get user counts from the given post data object.
    // this function is called from the main.js file.
    // returns null if the api could not be reached.
    static async getUserCount(post_data) {
        try {
            // check the cache for data, if doesnt exist, create.
            return await ApiCache.get('user-count', async() => {
                // get data from the api using the given post_data
                const result = await DekAPI('api/ping/rpc-tool', post_data);
                // if api ping was successful, return the counter
                return result.success ? result.counter || 0 : null;
            });
        } catch (error) {
            logger.warn(`could not get user count: ${error.message}`);
            return null;
        }
    }
}
