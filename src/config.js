/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
* 
* This file handles all configuration options for the rpc tool.
* Config data is used to define how the app and windows behave.
* 
*/

// load modules used for generating config:
const {randomUUID} = require('crypto');
const {join} = require('path');

const {app} = require('electron');

// export the configuration:
module.exports = {
    /**
    * dev_mode: 
    * flag to be used in development only!
    */
    dev_mode: !app.isPackaged,

    /**
    * show_debug: 
    * shows debug menu (javascript console) 
    * devmode must also be true for this to work <3
    */
    show_debug: !app.isPackaged,

    /**
    * single_instance:
    * determines if the app is allowed to open multiple instances.
    * NOTE: if dev_mode is enabled, this well always be false. 
    */
    single_instance: true,

    /**
    * handle_rejections:
    * determine if DEAP should handle unhandled promise rejections
    */
    handle_rejections: true, 

    /**
    * app_icon:
    * defines the ico and png files for the app icon
    */
    app_icon: {
        ico: join(__dirname, './img/rpc-icon.ico'),
        png: join(__dirname, './img/rpc-icon.png'),
    },

    /**
    * themes_dir:
    * defines the directory that theme css files are located
    */
    themes_dir: join(__dirname, 'themes'),
    
    /**
    * logger:
    * options sent to the logger module
    */
    logger: {
        replacer: __dirname,      
    },

    /**
    * data_store:
    * Custom app specific configuration saved to appdata json file
    * these proeprties can be get/set from global.app_settings.
    */
     data_store: {
        'show-welcome': true,
        'auto-boot': false,
        'auto-play': false,
        'auto-tiny': false,
        'tiny-tray': true,
        'gui-theme': 'slate-dark',
        'gui-color': 'pastel',
        // creates a random uuid on first boot,
        // that uuid is then used afterwords
        'uuid': randomUUID(),
    },

    /**
    * windows:
    * defines each window used within the app
    */
    windows: {
        // window id
        main: {
            // size for window
            size: {w: 1208, h: 608},
            // smallest size the window can be resized to
            min: {w: 1208, h: 608},
            // the ejs template for this window
            page: join(__dirname, './main-window.ejs'),
            // the preload file to load for this window
            load: join(__dirname, './preload.js'),
            // various options for the window behaviour
            opts: {
                fullscreen: false,
                transparent: false,
                show_frame: false, 
            },
            // custom key: value pairs that will be passed through to the
            // ejs renderer when loading the app/page. can be accessed
            // within the ejs files when building the contents directly.
            data: { 
                page: 'app',
            }
        },
        help: {
            size: {w: 694, h: 420},
            page: join(__dirname, './help-window.ejs'),
            load: join(__dirname, './preload.js'),
            opts: {
                fullscreen: false,
                transparent: false,
                show_frame: false, 
            },
            data: { // ejs data
                page: 'help',
            }
        },
    },

    // end of config
}