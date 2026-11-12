/**
* module: RPCActivity
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: Class for activity objects
*/
import {
    ACTIVITY_TYPES,
    DEFAULT_IMAGE_TEXTS,
    DEFAULT_BUTTON_DATA,
} from "./constants.js";

// values of the wrong type (eg: from an edited or imported file) use the default
const text = (value, fallback) => typeof value === 'string' ? value : fallback;
const flag = (value, fallback) => typeof value === 'boolean' ? value : fallback;
// numbers are stored as typed in the inputs, so numeric strings are kept
const number = (value, fallback) => {
    if (typeof value === 'number' && isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && isFinite(value)) return value;
    return fallback;
};
const imageKey = (value, fallback) => value === null ? null : text(value, fallback);
const type = value => Object.values(ACTIVITY_TYPES).includes(value) ? value : ACTIVITY_TYPES.Playing;
const item = (list, index) => {
    const value = Array.isArray(list) ? list[index] : null;
    return value && typeof value === 'object' ? value : {};
};

/**
* ■ RPCActivity class is a basic activity object:
*/
export default class RPCActivity {
    constructor(options={}) {
        if (!options || typeof options !== 'object') options = {};
        const [image1, image2] = [item(options.images, 0), item(options.images, 1)];
        const [button1, button2] = [item(options.buttons, 0), item(options.buttons, 1)];
        this.name = text(options.name, "no-name");
        this.type = type(options.type);
        this.api_url = text(options.api_url, "");
        // older versions stored the placeholder text as the value
        if (this.api_url === "API URL") this.api_url = "";
        this.api_freq = number(options.api_freq, 300);
        this.rpc_freq = number(options.rpc_freq, 15);
        this.details = text(options.details, "Discord RPC Tool");
        this.state = text(options.state, "By DekitaRPG");
        this.images = [
            {   key: imageKey(image1.key, "large-image"),
                text: text(image1.text, DEFAULT_IMAGE_TEXTS.image1),
                enabled: flag(image1.enabled, false),
            },
            {   key: imageKey(image2.key, "small-image"),
                text: text(image2.text, DEFAULT_IMAGE_TEXTS.image2),
                enabled: flag(image2.enabled, false),
            },
        ];
        this.buttons = [
            {
                url: text(button1.url, DEFAULT_BUTTON_DATA.btn1.url),
                label: text(button1.label, DEFAULT_BUTTON_DATA.btn1.label),
                enabled: flag(button1.enabled, true),
            },
            {
                url: text(button2.url, DEFAULT_BUTTON_DATA.btn2.url),
                label: text(button2.label, DEFAULT_BUTTON_DATA.btn2.label),
                enabled: flag(button2.enabled, true),
            },
        ];
        this.timestamp = flag(options.timestamp, false);
        this.instance = flag(options.instance, false);
    }
}
