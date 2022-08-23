
/**
* module: RPCActivity
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: Class for activity objects
*/
import { 
    DEFAULT_IMAGE_TEXTS, 
    DEFAULT_BUTTON_DATA,
} from "./constants.js";

/**
* ■ RPCActivity class is a basic activity object:
*/
export default class RPCActivity {
    constructor(options={}) {
        this.name = options.name ?? "no-name";
        this.api_url = options.api_url ?? "API URL";
        this.api_freq = options.api_freq ?? 300;
        this.details = options.details ?? "Discord RPC Tool";
        this.state = options.state ?? "By DekitaRPG";
        this.images = [
            {   key: options.images?.[0]?.key ??  "large-image", 
                text:options.images?.[0]?.text ?? DEFAULT_IMAGE_TEXTS.image1, 
                enabled: options.images?.[0]?.enabled ?? false,
            },
            {   key: options.images?.[1]?.key ?? "small-image", 
                text:options.images?.[1]?.text ?? DEFAULT_IMAGE_TEXTS.image2, 
                enabled: options.images?.[1]?.enabled ?? false,
            },
        ];
        this.buttons = [
            {
                url: options.buttons?.[0]?.url ?? DEFAULT_BUTTON_DATA.btn1.url, 
                label: options.buttons?.[0]?.label ?? DEFAULT_BUTTON_DATA.btn1.label, 
                enabled: options.buttons?.[0]?.enabled ?? true,
            },
            {
                url: options.buttons?.[1]?.url ?? DEFAULT_BUTTON_DATA.btn2.url, 
                label: options.buttons?.[1]?.label ?? DEFAULT_BUTTON_DATA.btn2.label, 
                enabled: options.buttons?.[1]?.enabled ?? true,
            },
        ];
        this.timestamp = options.timestamp ?? false;
        this.instance = options.instance ?? false;
    }
}
