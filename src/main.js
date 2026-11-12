/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*
* loads the deap and api modules.
* Then setup deap using config.
* Add handler for api functions.
* Launch DEAP application.
*
*/

const logger = require('./dek/logger')(__filename);

// uncaught exceptions are written to the error log, so they can be found
// in a packaged app. unhandled promise rejections are logged by DEAP.
process.on('uncaughtException', error => {
    logger.error(`uncaught exception: ${error?.stack || error}`);
});

const DEAP = require('./dek/deap');
const DAPI = require('./dek/api');

// setup returns false when another instance is already running
if (DEAP.setup(require('./config'))) {
    require('./dek/rpc-client')(DEAP);
    require('./dek/app-data')(DEAP);

    DEAP.addIPCHandler("get-user-count", async() => {
        // only count users of the packaged app, not development runs
        if (!DEAP.app.isPackaged) return 0;
        return await DAPI.getUserCount({
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            uuid: DEAP.datastore.get('uuid'),
            version: DEAP.version,
        });
    });

    DEAP.launch();
}
