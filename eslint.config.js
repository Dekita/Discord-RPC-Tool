/**
* ESLint config, run with: yarn lint
*/
const js = require('@eslint/js');
const globals = require('globals');

// globals the renderer gets from classic scripts, see src/main.ejs
const RENDERER_GLOBALS = {
    bootstrap: 'readonly',
    showdown: 'readonly',
    DekCheckBox: 'readonly',
    DekSelect: 'readonly',
    dek_validate: 'readonly',
    dekita_rpc: 'readonly',
    app_config: 'readonly',
    app_events: 'readonly',
};

const RULES = {
    'no-unused-vars': ['error', {args: 'none', caughtErrors: 'none'}],
    'no-async-promise-executor': 'error',
    'no-promise-executor-return': 'error',
    'prefer-const': ['error', {destructuring: 'all'}],
    'eqeqeq': ['error', 'smart'],
};

module.exports = [
    {
        // vendored libraries and build output are not linted
        ignores: ['build/**', '.claude/**', 'node_modules/**', 'src/libs/bootstrap-*', 'src/libs/showdown-*'],
    },
    js.configs.recommended,
    {
        // main process, preload, config and tests: commonjs on node
        files: ['src/main.js', 'src/config.js', 'src/preload.js', 'src/dek/**/*.js', 'src/shared/**/*.js', 'tests/**/*.js', 'eslint.config.js'],
        languageOptions: {
            sourceType: 'commonjs',
            ecmaVersion: 2024,
            globals: {...globals.node},
        },
        rules: RULES,
    },
    {
        // renderer modules
        files: ['src/app/**/*.js'],
        languageOptions: {
            sourceType: 'module',
            ecmaVersion: 2024,
            globals: {...globals.browser, ...RENDERER_GLOBALS},
        },
        rules: RULES,
    },
    {
        // renderer classic scripts, loaded before the modules
        files: ['src/app/js/bridge.js'],
        languageOptions: {
            sourceType: 'script',
            ecmaVersion: 2024,
            globals: {...globals.browser, ...RENDERER_GLOBALS},
        },
        rules: RULES,
    },
    {
        // defines the DekCheckBox and DekSelect globals
        files: ['src/libs/dek-style.js'],
        languageOptions: {
            sourceType: 'script',
            ecmaVersion: 2024,
            globals: {...globals.browser},
        },
        rules: {...RULES, 'no-unused-vars': ['error', {args: 'none', caughtErrors: 'none', varsIgnorePattern: '^Dek'}]},
    },
    {
        // the shared file also runs in the renderer
        files: ['src/shared/**/*.js'],
        languageOptions: {globals: {...globals.node, ...globals.browser}},
    },
];
