/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*/
module.exports = {
    // enable debugger (console window)
    dev_mode: true, 
    
    // enable electron-reloader module:
    enable_reloader: false,

    // app window sizes
    window_sizes: {
        main:   {w: 1024,h: 540},
        help:   {w: 640, h: 420},
        themes: {w: 1280,h: 640},
    },

    // default values for app datastore properties
    data_store: {
        'auto-boot': false,
        'auto-play': false,
        'auto-tiny': false,
        'tiny-tray': true,
        'gui-theme': 'dek-dark',
        'gui-color': 'pastel',
        'uuid': require('crypto').randomUUID(),
    },
}