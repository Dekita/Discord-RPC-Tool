/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*/

/**
* ■ Helper functions:
*/

const getElement = id => document.getElementById(id);
const getElementsByClass = n => document.getElementsByClassName(n);
const getValue = id => getElement(id)?.value || '';
const setValue = (id, v, e=getElement(id)) => e.value = v;
const queryAll = query => [...document.querySelectorAll(query)];

/**
* ■ Common Page Elements:
*/
const modal_export_theme = new bootstrap.Modal(getElement('modal-export-theme'));
const modal_card_modal = new bootstrap.Modal(getElement('modal-color-modal'));
const export_theme_btn = getElement('export-theme-btn');
const modal_card_btn = getElement('modal-card-btn');
const copy_theme_btn = getElement('copy-theme-btn');
const save_theme_btn = getElement('save-theme-btn');
const save_custom_theme_btn = getElement('save-custom-theme-btn');
const randomize_color_btn = getElement('randomize-color-btn');
const randomize_icon = getElement('randomize-icon');
const switch_bodytext_btn = getElement('switch-body-text-btn');

const switch_colors_btn = getElement('switch-colors-btn');
switch_colors_btn.classList.add('d-none');// for now...


const checkboxes ={
    enable_calc: new DekCheckBox('calculate-enabled', value => {
        console.log('calculation enabled:', value[0] === '0');
    }),
    enable_chroma: new DekCheckBox('calculate-chroma', value => {
        console.log('chroma enabled:', value[0] === '0');
    }),
};
const color_inputs = {
    'body': getElement('color-input-body'),
    'text': getElement('color-input-text'),
    'primary': getElement('color-input-primary'),
    'secondary': getElement('color-input-secondary'),
    'warning': getElement('color-input-warning'),
    'danger': getElement('color-input-danger'),
    'info': getElement('color-input-info'),
    'success': getElement('color-input-success'),
    'modal-body': getElement('modal-body-color'),
    'modal-border': getElement('modal-border-color'),
    'modal-text': getElement('modal-text-color'),
    'card-body': getElement('card-body-color'),
    'card-header': getElement('card-header-color'),
    'card-text': getElement('card-text-color'),
};
const color_tones = [
    'primary', 'secondary', 'info', 
    'success', 'warning', 'danger',
];


/**
* ■ CSS Related:
*/
const THEME_TEMPLATE = `
/*###################################
* 
* ■ Discord RPC Tool by DekitaRPG@gmail.com
* CSS generated by RPC Tool theme customizer
* 
*/\n:root {CSS_AREA\n}\n`;

// getting/setting css variables/properties from stylesheet
const STYLES_ELEMENT = document.documentElement;
// const STYLES_ELEMENT = getElement('theme-style-css');
//const STYLES_ELEMENT = document.body;

function getVariableFromCSS(propname) {
    const style = getComputedStyle(STYLES_ELEMENT);
    const value = style.getPropertyValue(propname);
    return value?.trim();
}
function setVariableToCSS(propname, value) {
    STYLES_ELEMENT.style.setProperty(propname, value);
}
async function createThemeCssString() {
    const gen_ver = await dekita_rpc.getAppVersion();
    const css_properties = STYLES_ELEMENT.style.cssText.split(';');
    const future_css = [`--dek-gen-version: ${gen_ver};`];
    for (const property of css_properties) {
        const trimmed = property.trim();
        if (!trimmed.startsWith('--dek-')) continue;
        const [prop, val] = trimmed.split(':');
        future_css.push(`${prop}: ${val};`)
    }
    const css_string = future_css.map(string =>`\n\t${string}`).join('');
    const theme_css = THEME_TEMPLATE.replace('CSS_AREA', css_string);
    return theme_css;
}
async function copyCssToClipboard() {
    const theme_css = await createThemeCssString();
    navigator.clipboard.writeText(theme_css);
    console.log('Copied To clipboard:');
    console.log(theme_css);
    return theme_css;
}
async function saveCssToFile() {
    dekita_rpc.saveFileForCSS(await copyCssToClipboard());
}
async function saveCssToCustom() {
    localStorage.setItem('dek-theme', await copyCssToClipboard());
}


/**
* ■ Colors:
*/
// convert rgb values to hcl or hsl array
function rgbToArray(r,g,b) {
    if (checkboxes.enable_chroma.enabled) {
        return dekita_rpc.chroma({r,g,b}).hcl();
    } 
    return dekita_rpc.chroma({r,g,b}).hsl();
}
// convert hexcode to hcl or hsl array
function hexToArray(hexcode) {
    if (checkboxes.enable_chroma.enabled) {
        return dekita_rpc.chroma(hexcode).hcl();
    } 
    return dekita_rpc.chroma(hexcode).hsl();
}
// convert hcl or hsl array to hexcode
function arrayToHex(array) {
    if (checkboxes.enable_chroma.enabled) {
        return dekita_rpc.chroma.hcl(...array);
    }
    return dekita_rpc.chroma.hsl(...array);
}
// return a cloned hsl or hcl array with altered lightness
function alterLightness(array, type, percentage=0.1) {
    array = [...array]; // dry clone array
    if (type == 'increase') array[2] += array[2]*percentage;
    else array[2] -= array[2]*percentage;
    array[2] = Math.min(Math.max(array[2], 0.0), 255);
    return array;
}
// return a cloned hsl or hcl array with altered hue
function alterHue(array, degrees=0) {
    array = [...array]; // dry clone array
    array[0] += degrees;
    while (array[0] > 360) array[0] -= 360;
    array[0] = Math.min(Math.max(array[0], 0), 360);
    return array;
}
// runs when a color tone is changed
function onColorToneChange(colorname, hexcode, i=false) {
    const array = hexToArray(hexcode);
    const darker = alterLightness(array, 'decrease', 0.25);
    const darkest = alterLightness(array, 'decrease', 0.5);
    const light = alterLightness(array, 'increase', 0.4);
    setVariableToCSS(`--dek-${colorname}-normal`, arrayToHex(array));
    setVariableToCSS(`--dek-${colorname}-darker`, arrayToHex(darker));
    setVariableToCSS(`--dek-${colorname}-darkest`, arrayToHex(darkest));
    setVariableToCSS(`--dek-${colorname}-light`, arrayToHex(light));
    if (!i && colorname === 'primary') performCalculatedUpdate(array);
    color_inputs[colorname].value = hexcode;
}
// runs when primary color goes through onColorchange()
// updates other colors based on primary color
function performCalculatedUpdate(array) {
    if (!checkboxes.enable_calc.enabled) return;
    onColorToneChange('secondary', arrayToHex(alterHue(array, 40)));
    onColorToneChange('info',      arrayToHex(alterHue(array, 320)));
    onColorToneChange('success',   arrayToHex(alterHue(array, 280)));
    onColorToneChange('warning',   arrayToHex(alterHue(array, 160)));
    onColorToneChange('danger',    arrayToHex(alterHue(array, 120)));
}
// runs when a main color property is changed
function onColorMainChange(property, hexcode) {
    setVariableToCSS(`--dek-${property}-color`, hexcode);
    color_inputs[property].value = hexcode;
}

// http://colormind.io/list/
// => ["ui","default","flower_photography","game_of_thrones","metroid_fusion","pokemon_crystal"]
async function _unsafeMindPoll() {
    const url = "http://colormind.io/api/";
    const options = {method: 'POST',body: JSON.stringify({model: "ui"})};
    const result = await dekita_rpc.raceTimeout(fetch(url, options));
    if (!result.ok || result.status !== 200) throw new Error("BAD FETCH REPLY!");
    return (await result.json())?.result;
}
async function getRandomizedColors() {
    try {return await _unsafeMindPoll()}
    catch (error) {console.error(error)};
    return [ // return x5 random values
        dekita_rpc.chroma.random().rgb(),
        dekita_rpc.chroma.random().rgb(),
        dekita_rpc.chroma.random().rgb(),
        dekita_rpc.chroma.random().rgb(),
        dekita_rpc.chroma.random().rgb(),
    ]
}

async function onRandomizeTheme() {
    randomize_icon.classList.remove('fa-retweet');
    randomize_icon.classList.add('fa-spinner', 'fa-pulse');
    randomize_color_btn.setAttribute('disabled', true);
    const colors = await getRandomizedColors();
    if (!colors) return; // should never happen, but just in case <3
    const light = rgbToArray(...colors[0]);
    const dark = rgbToArray(...colors[4]);
    const main_color = rgbToArray(...colors[2]);
    const light_accent = rgbToArray(...colors[1]);
    const dark_accent = rgbToArray(...colors[3]);
    const bodytext = Math.random() >= .5 ? [light, dark] : [dark, light];
    const body = bodytext.shift();
    const text = bodytext.shift();
    onColorMainChange('body', arrayToHex(body));
    onColorMainChange('text', arrayToHex(text));
    onColorMainChange('modal-body', arrayToHex(alterLightness(body, 'decrease', 0.25)));
    onColorMainChange('modal-text', arrayToHex(alterLightness(text, 'increase', 0.25)));
    onColorMainChange('modal-border', arrayToHex(alterLightness(body, 'increase', 0.25)));
    onColorMainChange('card-body', arrayToHex(alterLightness(body, 'decrease', 0.5)));
    onColorMainChange('card-text', arrayToHex(alterLightness(text, 'increase', 0.5)));
    onColorMainChange('card-header', arrayToHex(dark_accent));
    const logik = 'test2'; // still undecided on logik
    switch (logik) {
        case 'test':
        onColorToneChange('primary', arrayToHex(main_color));
        onColorToneChange('secondary', arrayToHex(alterHue(main_color, 40)));
        onColorToneChange('info', arrayToHex(alterHue(light_accent, 80)));
        onColorToneChange('success', arrayToHex(light_accent));
        onColorToneChange('warning', arrayToHex(alterHue(dark_accent, 120)));
        onColorToneChange('danger', arrayToHex(dark_accent));
        break;

        case 'test2':
        onColorToneChange('primary', arrayToHex(alterHue(main_color, 0)));
        onColorToneChange('secondary', arrayToHex(alterHue(main_color, 40)));
        onColorToneChange('info', arrayToHex(alterHue(light_accent, 0)));
        onColorToneChange('success', arrayToHex(alterHue(light_accent, 60)));
        onColorToneChange('warning', arrayToHex(alterHue(dark_accent, 0)));
        onColorToneChange('danger', arrayToHex(alterHue(dark_accent, 80)));
        break;

        default:
        onColorToneChange('primary', arrayToHex(main_color));
        onColorToneChange('secondary', arrayToHex(light_accent));
        onColorToneChange('info', arrayToHex(alterHue(light_accent, 80)));
        onColorToneChange('success', arrayToHex(alterHue(main_color, 120)));
        onColorToneChange('warning', arrayToHex(dark_accent));
        onColorToneChange('danger', arrayToHex(alterHue(dark_accent, 40)));
        break;
    }
    randomize_icon.classList.add('fa-retweet');
    randomize_icon.classList.remove('fa-spinner', 'fa-pulse');
    randomize_color_btn.removeAttribute('disabled');
}

/**
* ■ Various Event Listeners:
*/
randomize_color_btn.addEventListener('click', onRandomizeTheme);
export_theme_btn.addEventListener('click',()=>modal_export_theme.show());
modal_card_btn.addEventListener('click',()=>modal_card_modal.show());

copy_theme_btn.addEventListener('click', copyCssToClipboard);
save_theme_btn.addEventListener('click', saveCssToFile);
save_custom_theme_btn.addEventListener('click', saveCssToCustom);
switch_bodytext_btn.addEventListener('click', async()=>{
    // const body = getVariableFromCSS('--dek-body-color');
    // const text = getVariableFromCSS('--dek-text-color');
    const body = color_inputs.body.value;
    const text = color_inputs.text.value;
    onColorMainChange('body', text);
    onColorMainChange('text', body);
});
for (const color of Object.keys(color_inputs)) {
    color_inputs[color].addEventListener('input', ()=>{
        if (color_tones.includes(color)) {
            onColorToneChange(color, color_inputs[color].value);
        } else {
            onColorMainChange(color, color_inputs[color].value);
        }
    });
}
document.addEventListener('DOMContentLoaded', async (event) => {
    const theme = await app_config.get('gui-theme');
    if (theme === 'custom') loadCustomthemeFromStorage();

    // initialize color inputs to current theme colors:
    for (const color of Object.keys(color_inputs)) {
        let css_value = '';
        if (color_tones.includes(color)){
            css_value = getVariableFromCSS(`--dek-${color}-normal`);
        } else {
            css_value = getVariableFromCSS(`--dek-${color}-color`);
        }
        color_inputs[color].value = css_value.trim();
    }
    // setup tooltips:
    const options = {delay: 0, trigger: 'hover', container: 'body', html: true};
    const tooltips = queryAll('[data-bs-toggle="tooltip"]');
    tooltips_list = tooltips.map(e => new bootstrap.Tooltip(e, options));
    // app/child window wont show until ready event is received:  
    dekita_rpc.sendReadyEvent('child');
});
