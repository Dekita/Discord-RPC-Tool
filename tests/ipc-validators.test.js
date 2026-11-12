/**
* Tests for the ipc input checks in src/dek/ipc-validators.js
* and the shared checks in src/shared/validate.js
* run with: yarn test
*/
const {test} = require('node:test');
const assert = require('node:assert');
const path = require('path');
const {pathToFileURL} = require('url');
const validators = require('../src/dek/ipc-validators');
const validate = require('../src/shared/validate');

const SOURCE_DIR = path.join(__dirname, '../src');

test('isEditableConfig allows known keys with the right type only', () => {
    const defaults = {'auto-boot': false, 'gui-theme': 'slate-dark', 'uuid': 'abc'};
    assert.strictEqual(validators.isEditableConfig(defaults, 'auto-boot', true), true);
    assert.strictEqual(validators.isEditableConfig(defaults, 'auto-boot', 'yes'), false);
    assert.strictEqual(validators.isEditableConfig(defaults, 'gui-theme', 'forest-day'), true);
    assert.strictEqual(validators.isEditableConfig(defaults, 'uuid', 'def'), false);
    assert.strictEqual(validators.isEditableConfig(defaults, 'toString', 'x'), false);
    assert.strictEqual(validators.isEditableConfig(defaults, 'unknown', 'x'), false);
});

test('resolveAppFile only allows markdown files inside the app folder', () => {
    assert.strictEqual(validators.resolveAppFile(SOURCE_DIR, '../readme.md'), path.resolve(SOURCE_DIR, '../readme.md'));
    assert.strictEqual(validators.resolveAppFile(SOURCE_DIR, '../package.json'), null);
    assert.strictEqual(validators.resolveAppFile(SOURCE_DIR, '../../outside.md'), null);
    assert.strictEqual(validators.resolveAppFile(SOURCE_DIR, '../node_modules/x/readme.md'), null);
});

test('isOwnPage only allows the windows own page', () => {
    const page = path.join(SOURCE_DIR, 'main-window.ejs');
    const url = pathToFileURL(page).href;
    assert.strictEqual(validators.isOwnPage(url, page), true);
    assert.strictEqual(validators.isOwnPage(`${url}#themes`, page), true);
    assert.strictEqual(validators.isOwnPage(pathToFileURL(path.join(SOURCE_DIR, 'other.html')).href, page), false);
    assert.strictEqual(validators.isOwnPage('https://example.com', page), false);
});

test('isSavedApiURL only matches stats urls of saved activities', () => {
    const applications = [{activities: [{api_url: 'https://example.com/stats'}, {api_url: ''}]}];
    assert.strictEqual(validators.isSavedApiURL(applications, 'https://example.com/stats'), true);
    assert.strictEqual(validators.isSavedApiURL(applications, 'http://192.168.0.1/admin'), false);
    assert.strictEqual(validators.isSavedApiURL(null, 'https://example.com/stats'), false);
});

test('cleanImportedApplication keeps the application and drops urls', () => {
    const data = {
        id: '965114674750292058', name: 'App', description: 5,
        icon: 'https://tracker.example.com/pixel.png',
        assets: {logo: 'https://tracker.example.com/logo.png'},
        activities: [{name: 'one'}, null, 'two', [3]],
    };
    assert.deepStrictEqual(validators.cleanImportedApplication(data), {
        id: '965114674750292058', name: 'App', description: '', summary: '',
        activities: [{name: 'one'}],
    });
});

test('cleanImportedApplication rejects files that are not applications', () => {
    assert.strictEqual(validators.cleanImportedApplication(null), null);
    assert.strictEqual(validators.cleanImportedApplication([]), null);
    assert.strictEqual(validators.cleanImportedApplication({id: 'abc', activities: []}), null);
    assert.strictEqual(validators.cleanImportedApplication({id: '965114674750292058'}), null);
});

test('shared checks: urls, snowflakes and theme variables', () => {
    assert.strictEqual(validate.isHttpURL('https://dekitarpg.com'), true);
    assert.strictEqual(validate.isHttpURL('http://localhost/stats'), true);
    assert.strictEqual(validate.isHttpURL('file:///C:/x'), false);
    assert.strictEqual(validate.isHttpURL('javascript:alert(1)'), false);
    assert.strictEqual(validate.isHttpURL('API URL'), false);
    assert.strictEqual(validate.isSnowflake('965114674750292058'), true);
    assert.strictEqual(validate.isSnowflake(965114674750292058n), true);
    assert.strictEqual(validate.isSnowflake('12ab'), false);
    assert.deepStrictEqual(validate.parseThemeVariables(':root {--dek-body-color: #111; --dek-text-color:white;}'), {
        'body-color': '#111', 'text-color': 'white',
    });
});

test('buildActivityPayload keeps the type and builds what discord expects', () => {
    const {buildActivityPayload} = validators;
    const payload = buildActivityPayload({
        type: 2, details: 'a', state: 'b', startTimestamp: new Date(1700000000000),
        largeImageKey: 'big', largeImageText: 'hover',
        buttons: [{label: 'x', url: 'https://example.com'}],
    });
    assert.strictEqual(payload.type, 2);
    assert.deepStrictEqual(payload.timestamps, {start: 1700000000000});
    assert.strictEqual(payload.assets.large_image, 'big');
    assert.strictEqual(payload.assets.small_image, undefined);
    assert.strictEqual(payload.instance, false);
    // streaming and custom status cannot be set by rpc apps
    assert.strictEqual(buildActivityPayload({type: 1}).type, 0);
    assert.strictEqual(buildActivityPayload({}).assets, undefined);
    assert.throws(() => buildActivityPayload(null));
});
