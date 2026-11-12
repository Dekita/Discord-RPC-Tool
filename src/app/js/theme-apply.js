/**
* module: theme-apply
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: applies the selected theme to a window. used by every
* window, so it only touches the theme stylesheet and css variables.
*/

// key the custom theme css is saved under, see themes.js
export const CUSTOM_THEME_KEY = 'dek-theme';
// the custom theme is applied on top of this theme
const BASE_THEME = 'slate-dark';

// applies the css variables of the saved custom theme.
// returns false if no custom theme has been saved
export function applyCustomThemeVariables() {
    const theme_css = localStorage.getItem(CUSTOM_THEME_KEY);
    if (!theme_css) return false;
    const css_area = theme_css.slice(theme_css.indexOf('{') + 1, theme_css.lastIndexOf('}'));
    for (const property of css_area.split(';')) {
        const [prop, ...rest] = property.split(':');
        if (!prop?.trim().startsWith('--dek-')) continue;
        document.documentElement.style.setProperty(prop.trim(), rest.join(':').trim());
    }
    return true;
}

// switches the window to the given theme
export function applyThemeStyles(theme) {
    const root = document.documentElement;
    if (root.style.cssText) root.style.cssText = '';
    const theme_file = `themes/${theme === 'custom' ? BASE_THEME : theme}.css`;
    document.getElementById('theme-style-css').setAttribute('href', theme_file);
    if (theme === 'custom') applyCustomThemeVariables();
}
