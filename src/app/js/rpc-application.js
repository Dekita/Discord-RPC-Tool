
/**
* module: RPCActivity
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: Class for activity objects
*/
import RPCActivity from "./rpc-activity.js";

/**
* ■ RPCActivity class is a basic activity object:
*/
export default class RPCApplication {
    constructor(options={}) {
        this.id = options.app_id ?? "Discord Application ID";
        this.icon = options.icon || "img/rpc-icon.png";
        this.assets = options.assets || null;
        this.name = options.name || "";
        this.description = options.description || "";
        this.summary = options.summary || "";
        const activities = options.activities || [];
        this.activities = activities.map(o => new RPCActivity(o));
    }
    addActivity(options={}) {
        this.activities.push(new RPCActivity(options));
    }
}
