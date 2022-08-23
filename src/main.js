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
const DEAP = require('./dek/deap');
const DAPI = require('./dek/api');
DEAP.setup(require('./config'));

DEAP.addIPCHandler("get-user-count", async() => {
    // if (!DEAP.app.isPackaged) return 0;
    return await DAPI.getUserCount({
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        uuid: DEAP.datastore.get('uuid'),
        version: DEAP.version,
    });
});

DEAP.launch();