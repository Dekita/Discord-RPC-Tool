/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*
* Tests for the renderer helper functions in src/app/js/bridge.js
* run with: yarn test
*/
const {test} = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

// load bridge.js into a fake window, the same way the renderer does
function loadBridge(dekita_bridge = {}) {
    const window = {dekita_bridge, dek_validate: require('../src/shared/validate')};
    const context = vm.createContext({window, crypto, Intl, URL, setTimeout, clearTimeout, console});
    const source = fs.readFileSync(path.join(__dirname, '../src/app/js/bridge.js'), 'utf8');
    vm.runInContext(source, context);
    return window;
}

const {dekita_rpc, app_events} = loadBridge();
const MINUTE = 60 * 1000;

test('format replaces keys literally and case-sensitively', () => {
    const result = dekita_rpc.format('{p} of {players} {P} A.B AxB', {'{p}': 1, '{players}': 2, 'A.B': 'z'});
    assert.strictEqual(result, '1 of 2 {P} z AxB');
    // an activity line that was never set
    assert.strictEqual(dekita_rpc.format(undefined, {'{p}': 1}), '');
});

test('logicalDuration shows the two largest units', () => {
    assert.strictEqual(dekita_rpc.logicalDuration(30 * 1000), 'less than a minute');
    assert.strictEqual(dekita_rpc.logicalDuration(MINUTE), '1 minute');
    assert.strictEqual(dekita_rpc.logicalDuration(5 * MINUTE), '5 minutes');
    assert.strictEqual(dekita_rpc.logicalDuration(61 * MINUTE), '1 hour, 1 minute');
    assert.strictEqual(dekita_rpc.logicalDuration(120 * MINUTE), '2 hours');
    // 1 day, 1 hour and 3 minutes: the minutes are the smallest unit, so left out
    assert.strictEqual(dekita_rpc.logicalDuration((25 * 60 + 3) * MINUTE), '1 day, 1 hour');
    // zero units are skipped
    assert.strictEqual(dekita_rpc.logicalDuration((24 * 60 + 5) * MINUTE), '1 day, 5 minutes');
});

test('shortDuration lists every unit from the largest non-zero', () => {
    assert.strictEqual(dekita_rpc.shortDuration(61 * MINUTE), '1h, 1m');
    assert.strictEqual(dekita_rpc.shortDuration((25 * 60 + 3) * MINUTE), '1d, 1h, 3m');
    assert.strictEqual(dekita_rpc.shortDuration(0), '0m');
});

test('raceTimeout rejects with timeout when promise is too slow', async () => {
    const slow = new Promise(resolve => {setTimeout(resolve, 200)});
    await assert.rejects(dekita_rpc.raceTimeout(slow, 20), {name: 'Error', message: 'timeout'});
    assert.strictEqual(await dekita_rpc.raceTimeout(Promise.resolve(1), 20), 1);
});

test('ipc errors are passed on without the electron prefix', async () => {
    const window = loadBridge({
        rpcLogin: async () => {
            throw new Error("Error invoking remote method 'rpc-login': Error: Could not connect");
        },
    });
    await assert.rejects(window.dekita_rpc.login('965114674750292058'), {message: 'Could not connect'});
});

test('app_events emits to listeners and supports once', () => {
    const calls = [];
    app_events.on('test', value => calls.push(['on', value]));
    app_events.once('test', value => calls.push(['once', value]));
    app_events.emit('test', 1);
    app_events.emit('test', 2);
    assert.deepStrictEqual(calls, [['on', 1], ['once', 1], ['on', 2]]);
});
