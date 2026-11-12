/**
* module: validate
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* detail: checks shared by the main process and the renderer.
* loaded with require() in main, and as a classic script in the
* renderer, where it is available as window.dek_validate
*/
(function(root, factory) {"use strict";
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.dek_validate = factory();
})(this, function() {"use strict";

    const SNOWFLAKE_REGEX = /^[0-9]{14,19}$/;
    const THEME_VARIABLE_REGEX = /--dek-([a-z0-9-]+)\s*:\s*([^;]+);/g;

    // true if string is a http or https url
    function isHttpURL(string) {
        try {
            const {protocol} = new URL(string);
            return protocol === 'http:' || protocol === 'https:';
        } catch {
            return false;
        }
    }

    // true if value looks like a discord snowflake id
    function isSnowflake(value) {
        return SNOWFLAKE_REGEX.test(String(value));
    }

    // reads the --dek-* variables from some css as {name: value}
    function parseThemeVariables(css) {
        const variables = {};
        for (const match of String(css).matchAll(THEME_VARIABLE_REGEX)) {
            variables[match[1]] = match[2].trim();
        }
        return variables;
    }

    return {isHttpURL, isSnowflake, parseThemeVariables};
});
