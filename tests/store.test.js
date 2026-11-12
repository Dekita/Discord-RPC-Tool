/**
* Tests for the json data store in src/dek/store.js
* run with: yarn test
*/
const {test, beforeEach, afterEach} = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const DataStore = require('../src/dek/store');

let folder;
const create = (defaults = {count: 0}) => new DataStore({filepath: folder, filename: 'test', defaults});
const file = () => path.join(folder, 'test.json');

beforeEach(() => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), 'rpc-store-'));
});
afterEach(() => {
    fs.rmSync(folder, {recursive: true, force: true});
});

test('a missing file gives a copy of the defaults', () => {
    const defaults = {count: 0, list: [1]};
    const store = create(defaults);
    store.set('count', 5);
    store.data.list.push(2);
    assert.deepStrictEqual(defaults, {count: 0, list: [1]});
    assert.strictEqual(store.load_problem, null);
});

test('flush writes pending changes, and they load again', () => {
    const store = create();
    store.set('count', 3);
    store.flush();
    assert.strictEqual(JSON.parse(fs.readFileSync(file(), 'utf8')).count, 3);
    assert.strictEqual(create().get('count'), 3);
    assert.ok(!fs.existsSync(`${file()}.tmp`));
});

test('saving keeps the previous file as a backup', () => {
    const store = create();
    store.set('count', 1);
    store.flush();
    store.set('count', 2);
    store.flush();
    assert.strictEqual(JSON.parse(fs.readFileSync(`${file()}.bak`, 'utf8')).count, 1);
});

test('a broken file is moved aside and the backup is loaded', () => {
    const store = create();
    store.set('count', 1);
    store.flush();
    store.set('count', 2);
    store.flush();
    fs.writeFileSync(file(), '{"count": 2, "appl');
    const loaded = create();
    assert.strictEqual(loaded.get('count'), 1);
    assert.strictEqual(loaded.load_problem.restored_backup, true);
    assert.ok(fs.existsSync(loaded.load_problem.moved_to));
    assert.strictEqual(fs.readFileSync(loaded.load_problem.moved_to, 'utf8'), '{"count": 2, "appl');
});

test('a broken file with no backup gives the defaults and reports it', () => {
    fs.writeFileSync(file(), 'not json');
    const loaded = create({count: 7});
    assert.strictEqual(loaded.get('count'), 7);
    assert.strictEqual(loaded.load_problem.restored_backup, false);
    assert.ok(!fs.existsSync(file()));
});

test('a file holding something other than an object counts as broken', () => {
    fs.writeFileSync(file(), '[1, 2, 3]');
    const loaded = create({count: 7});
    assert.strictEqual(loaded.get('count'), 7);
    assert.ok(loaded.load_problem);
});

test('save writes the defaults of a new file', () => {
    const store = create({count: 7});
    store.save();
    store.flush();
    assert.strictEqual(JSON.parse(fs.readFileSync(file(), 'utf8')).count, 7);
});
