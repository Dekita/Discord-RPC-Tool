/**
* Tests for the logger in src/dek/logger.js
* run with: yarn test
*/
const {test} = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const createLogger = require('../src/dek/logger');

// waits for the log file stream to write its data
const settle = () => new Promise(resolve => {setTimeout(resolve, 100)});

test('loggers created before the log file is set still write to it', async t => {
    t.mock.method(console, 'error', () => {});
    t.mock.method(console, 'info', () => {});
    const early = createLogger('early.js');
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'rpc-log-'));
    const filename = path.join(folder, 'errors.log');
    createLogger.setGlobalOptions({file_options: {filename, options: {flags: 'a'}}});
    early.error('something broke');
    early.fatal('something else broke');
    early.info('not an error'); // info is not written to the file by default
    await settle();
    const log = fs.readFileSync(filename, 'utf8');
    assert.match(log, /error .*\[early\] something broke/);
    assert.match(log, /fatal .*\[early\] something else broke/);
    assert.doesNotMatch(log, /not an error/);
});

test('every log level works, and logging never throws', t => {
    t.mock.method(console, 'error', () => {});
    t.mock.method(console, 'warn', () => {});
    t.mock.method(console, 'info', () => {});
    const logger = createLogger('levels.js');
    for (const level of ['log', 'info', 'http', 'warn', 'error', 'fatal']) {
        assert.doesNotThrow(() => logger[level]('message'));
    }
});
