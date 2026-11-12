/**
* module: RPCApplication
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: Class for application objects
*/
import RPCActivity from "./rpc-activity.js";

const text = value => typeof value === 'string' ? value : "";
const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);

/**
* ■ RPCApplication class is a basic application object:
*/
export default class RPCApplication {
    constructor(options={}) {
        const id = options.app_id;
        this.id = ['string', 'number'].includes(typeof id) ? String(id) : "Discord Application ID";
        this.icon = text(options.icon) || "img/rpc-icon.png";
        // asset name => image url, null until fetched from discord
        this.assets = isObject(options.assets) ? options.assets : null;
        this.name = text(options.name);
        this.description = text(options.description);
        this.summary = text(options.summary);
        const activities = Array.isArray(options.activities) ? options.activities : [];
        this.activities = activities.filter(isObject).map(o => new RPCActivity(o));
        // the app always needs an activity to edit
        if (!this.activities.length) this.activities.push(new RPCActivity({name: 'new-activity'}));
    }
}
