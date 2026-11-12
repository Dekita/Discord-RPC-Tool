/**
* Tests for the cache in src/dek/dekache.js
* run with: yarn test
*/
const {test} = require('node:test');
const assert = require('node:assert');
const Dekache = require('../src/dek/dekache');

const createCache = () => new Dekache({name: 'test', mins: 1, log: false, no_start: true});

test('get caches the callback result', async () => {
    const cache = createCache();
    let calls = 0;
    const callback = async () => ++calls;
    assert.strictEqual(await cache.get('key', callback), 1);
    assert.strictEqual(await cache.get('key', callback), 1);
    assert.strictEqual(calls, 1);
});

test('get rejects when the callback throws, and caches nothing', async () => {
    const cache = createCache();
    await assert.rejects(cache.get('key', async () => {throw new Error('offline')}), {message: 'offline'});
    assert.strictEqual(await cache.get('key', async () => 'online'), 'online');
});

test('calls made while the callback runs share one result', async () => {
    const cache = createCache();
    let calls = 0;
    const callback = () => new Promise(resolve => {setTimeout(() => resolve(++calls), 20)});
    const results = await Promise.all([cache.get('key', callback), cache.get('key', callback)]);
    assert.deepStrictEqual(results, [1, 1]);
    assert.strictEqual(calls, 1);
});

test('clear removes items older than mins, or every item when forced', async () => {
    const cache = createCache();
    await cache.get('old', async () => 'a');
    await cache.get('new', async () => 'b');
    cache.data[JSON.stringify('old')]._time -= 2 * 60 * 1000;
    cache.clear();
    assert.deepStrictEqual(Object.keys(cache.data), [JSON.stringify('new')]);
    cache.clear(true);
    assert.deepStrictEqual(Object.keys(cache.data), []);
});
