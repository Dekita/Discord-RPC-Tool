/**
* Tests for the application/activity index handling in src/app/js/db.js
* and the type checks in rpc-activity.js / rpc-application.js
* run with: yarn test
*/
const {test, before, beforeEach} = require('node:test');
const assert = require('node:assert');
const path = require('path');
const {pathToFileURL} = require('url');

const importApp = file => import(pathToFileURL(path.join(__dirname, '../src/app/js', file)).href);

let DB, RPCActivity, RPCApplication;
let saved = 0;

before(async () => {
    // stand in for the preload bridge, see src/app/js/bridge.js
    globalThis.dekita_rpc = {
        getAppData: async () => ({applications: null, problem: null}),
        setAppData: async () => {saved++},
    };
    globalThis.localStorage = {getItem: () => null};
    DB = (await importApp('db.js')).default;
    RPCActivity = (await importApp('rpc-activity.js')).default;
    RPCApplication = (await importApp('rpc-application.js')).default;
});

beforeEach(async () => {
    await DB.load();
    DB.createApplication({app_id: '1', activities: [{name: 'a'}, {name: 'b'}, {name: 'c'}]});
    DB.createApplication({app_id: '2', activities: [{name: 'x'}]});
    saved = 0;
});

const names = () => DB.application.activities.map(activity => activity.name);

test('dragging other activities keeps the selected activity selected', () => {
    DB.setActivityID(0); // a
    DB.switchActivityIndex(2, 1); // swap c and b
    assert.deepStrictEqual(names(), ['a', 'c', 'b']);
    assert.strictEqual(DB.activity.name, 'a');
});

test('dragging the selected activity follows it to its new slot', () => {
    DB.setActivityID(0); // a
    DB.switchActivityIndex(0, 2);
    assert.deepStrictEqual(names(), ['c', 'b', 'a']);
    assert.strictEqual(DB.activity.name, 'a');
    DB.switchActivityIndex(1, 2); // drop b onto the selected a
    assert.strictEqual(DB.activity.name, 'a');
    assert.strictEqual(saved, 2);
});

test('dragging applications keeps the selected application selected', () => {
    DB.setAppID(0);
    DB.switchApplicationIndex(0, 1);
    assert.strictEqual(DB.application.id, '1');
    assert.strictEqual(DB.appID, 1);
    DB.switchApplicationIndex(5, 0); // a slot that does not exist
    assert.strictEqual(DB.application.id, '1');
});

test('duplicating an activity above the selected one keeps it selected', () => {
    DB.setActivityID(2); // c
    const index = DB.duplicateActivity(0);
    assert.strictEqual(index, 1);
    assert.deepStrictEqual(names(), ['a', 'a-copy', 'b', 'c']);
    assert.strictEqual(DB.activity.name, 'c');
});

test('duplicating makes an independent copy', () => {
    DB.duplicateActivity(0);
    DB.getActivityByID(1).images[0].key = 'changed';
    assert.notStrictEqual(DB.getActivityByID(0).images[0].key, 'changed');
});

test('deleting an activity above the selected one keeps it selected', () => {
    DB.setActivityID(2); // c
    DB.deleteActivityID(0);
    assert.deepStrictEqual(names(), ['b', 'c']);
    assert.strictEqual(DB.activity.name, 'c');
    DB.deleteActivityID(); // deletes the selected c
    assert.strictEqual(DB.activity.name, 'b');
});

test('activities with values of the wrong type use the defaults', () => {
    const activity = new RPCActivity({details: 5, buttons: 'x', images: [null, {key: 3}], rpc_freq: 'abc', api_freq: '90'});
    assert.strictEqual(activity.details, 'Discord RPC Tool');
    assert.strictEqual(activity.buttons.length, 2);
    assert.strictEqual(activity.images[0].key, 'large-image');
    assert.strictEqual(activity.images[1].key, 'small-image');
    assert.strictEqual(activity.rpc_freq, 15);
    assert.strictEqual(activity.api_freq, '90');
    assert.strictEqual(activity.type, 0);
    assert.strictEqual(new RPCActivity({type: 3}).type, 3);
    assert.strictEqual(new RPCActivity({type: 1}).type, 0);
    assert.strictEqual(new RPCActivity({images: [{key: null}]}).images[0].key, null);
});

test('applications drop broken activities and always have one', () => {
    const application = new RPCApplication({app_id: '1', activities: [null, 'x', 5]});
    assert.strictEqual(application.activities.length, 1);
    assert.strictEqual(application.assets, null);
    assert.strictEqual(new RPCApplication({app_id: '1', assets: 'x'}).assets, null);
});
