/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*
* Checks for values sent from the renderer through ipc.
* Kept free of electron so they can be tested with plain node.
*/
const path = require('path');
const {pathToFileURL} = require('url');
const {isSnowflake} = require('../shared/validate');

// most activities kept from an imported application
const MAX_IMPORT_ACTIVITIES = 200;

// renderer may only change keys defined in the data store defaults (except
// uuid), and only to a value of the same type as the default value
function isEditableConfig(defaults, key, value) {
    if (key === 'uuid' || !Object.hasOwn(defaults, key)) return false;
    return typeof value === typeof defaults[key];
}

// returns the full path of a markdown file inside source_dir, or null
function resolveAppFile(source_dir, filename) {
    const root = path.resolve(source_dir, '..');
    const file = path.resolve(source_dir, String(filename));
    if (!file.startsWith(root + path.sep)) return null;
    if (path.extname(file).toLowerCase() !== '.md') return null;
    if (file.includes(`${path.sep}node_modules${path.sep}`)) return null;
    return file;
}

// windows may only navigate to (reload) their own page
function isOwnPage(url, page) {
    const normalize = string => decodeURI(String(string).split(/[?#]/)[0]).toLowerCase();
    try {
        return normalize(url) === normalize(pathToFileURL(page).href);
    } catch {
        return false;
    }
}

// true if url is the stats url of one of the saved activities
function isSavedApiURL(applications, url) {
    return (applications || []).some(application => {
        return (application?.activities || []).some(activity => activity?.api_url === url);
    });
}

// checks an imported application file and keeps only the parts the app uses.
// the icon and image urls are dropped, they are fetched again from discord.
// returns null if it does not look like an exported application
function cleanImportedApplication(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    if (!isSnowflake(data.id) || !Array.isArray(data.activities)) return null;
    const text = value => typeof value === 'string' ? value : '';
    const activities = data.activities.filter(activity => {
        return !!activity && typeof activity === 'object' && !Array.isArray(activity);
    });
    return {
        id: String(data.id),
        name: text(data.name),
        description: text(data.description),
        summary: text(data.summary),
        activities: activities.slice(0, MAX_IMPORT_ACTIVITIES),
    };
}

// activity types discord accepts from rpc apps:
// playing, listening, watching, competing
const ACTIVITY_TYPES = [0, 2, 3, 5];

// builds the activity for discords SET_ACTIVITY command from the activity
// sent by the renderer. discord-rpc's own setActivity leaves out the type
function buildActivityPayload(args) {
    if (!args || typeof args !== 'object') throw new Error('activity must be an object');
    const payload = {
        type: ACTIVITY_TYPES.includes(args.type) ? args.type : 0,
        state: args.state,
        details: args.details,
        buttons: args.buttons,
        instance: !!args.instance,
    };
    if (args.startTimestamp) {
        const start = Math.round(new Date(args.startTimestamp).getTime());
        if (!Number.isFinite(start)) throw new Error('activity start time is not valid');
        payload.timestamps = {start};
    }
    if (args.largeImageKey || args.smallImageKey) {
        payload.assets = {
            large_image: args.largeImageKey,
            large_text: args.largeImageText,
            small_image: args.smallImageKey,
            small_text: args.smallImageText,
        };
    }
    return payload;
}

module.exports = {buildActivityPayload, isEditableConfig, resolveAppFile, isOwnPage, isSavedApiURL, cleanImportedApplication};
