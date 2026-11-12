/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*
* Runs the discord rpc client in the main process and exposes it
* to the renderer through ipc handlers.
*/
const {BrowserWindow} = require('electron');
const {Client} = require('discord-rpc');
const logger = require('./logger')(__filename);
const {isSnowflake} = require('../shared/validate');
const {buildActivityPayload} = require('./ipc-validators');

// discord-rpc waits forever for discord to close the pipe on destroy
const DESTROY_TIMEOUT_MS = 3000;

let rpc = null;

async function logout() {
    const client = rpc;
    rpc = null;
    if (!client) return;
    let timeout;
    try {
        await Promise.race([
            client.destroy(),
            new Promise(resolve => {timeout = setTimeout(resolve, DESTROY_TIMEOUT_MS)}),
        ]);
    } catch (error) {
        logger.warn(`rpc destroy error: ${error.message}`);
    } finally {
        clearTimeout(timeout);
    }
}

async function login(client_id) {
    if (!isSnowflake(client_id)) {
        throw new Error(`"${client_id}" is not a valid Discord Application ID!`);
    }
    await logout();
    const client = new Client({transport: 'ipc'});
    // discord closed or the connection dropped (not a requested logout)
    client.on('disconnected', () => {
        if (rpc !== client) return;
        rpc = null;
        for (const windoe of BrowserWindow.getAllWindows()) {
            windoe.webContents.send('rpc-disconnected');
        }
    });
    rpc = client;
    try {
        await client.login({clientId: String(client_id)});
    } catch (error) {
        if (rpc === client) await logout();
        throw error;
    }
    // logout (or another login) was called while this login was running
    if (rpc !== client) {
        client.destroy().catch(() => {});
        throw new Error('Login was cancelled');
    }
    const {id, username, discriminator, avatar, global_name} = client.user;
    return {user: {id, username, discriminator, avatar, global_name}};
}

async function setActivity(activity) {
    if (!rpc) throw new Error('Not logged in to Discord RPC!');
    await rpc.request('SET_ACTIVITY', {
        pid: process.pid,
        activity: buildActivityPayload(activity),
    });
    return true;
}

module.exports = function registerRPCHandlers(DEAP) {
    DEAP.addIPCHandler('rpc-login', (event, client_id) => login(client_id));
    DEAP.addIPCHandler('rpc-logout', () => logout());
    DEAP.addIPCHandler('rpc-set-activity', (event, activity) => setActivity(activity));
    DEAP.app.on('before-quit', () => {logout()});
};
