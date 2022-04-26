
/**
* module: RPCActivity
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: Class for activity objects
*/

const DEFAULT_IMAGE_TEXTS = {
    image1: "Download Discord RPC Tool to create your very own customized activities!",
    image2: "Download Discord RPC Tool today at dekitarpg.com/rpc",
}

/**
* ■ RPCActivity class is a basic activity object:
*/
export default class RPCActivity {
    constructor() {
        // rpc tool activity data:
        this.app_id = "Discord Application ID";
        this.image = "img/rpc-icon.png";
        this.rpc_freq = 60;
        this.api_url = "API URL";
        this.api_freq = 300;
        this.discord_details=null;
        this.discord_assets=null;
        // actual rpc activity: 
        this.details = "Discord RPC Tool";
        this.state = "By DekitaRPG";
        this.images = [
            {key: "large-image", text:DEFAULT_IMAGE_TEXTS.image1, enabled: false},
            {key: "small-image", text:DEFAULT_IMAGE_TEXTS.image2, enabled: false},
        ];
        this.buttons = [
            {url: "https://dekitarpg.com/rpc", label:"Website", enabled: true},
            {url: "https://discord.gg/7dCZ3Q4eU3", label:"Support", enabled: true},
        ];
        this.timestamp = false;
        this.instance = false;
    }
}
