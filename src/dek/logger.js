/**
* logger.js
* handles logging with additional functionality.
* author: dekitarpg@gmail.com
*/

/**
* EXAMPLE USAGE:
* opts are OPTIONAL!
* const log = require('logger')(__filename, {
*     file_options: {
*         filename: 'somefile.log',
*         options: {flags: 'a', encoding: 'utf8'},
*     },
*     file_record: {
*         fatal: true,
*         error: true,
*         warn: false,
*         http: false,
*         info: false,
*     },
*     log_colors: {
*         fatal: 'red',
*         error: 'red',
*         warn: 'yellow',
*         http: 'green',
*         info: 'cyan',
*     },
* });
*
* log.info('my awesome log');
* // => 21:22:36 PM [filename] my awesome log
*
* // to extend class functionality:
* class KustoomLoog extends log.Logger {}
*/

const {createWriteStream} = require('fs');
const {DateTime} = require('luxon');
const {Console} = console;

const colors = {
    reset: "\x1b[0m",
    fg: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        crimson: "\x1b[38m" // Scarlet
    },
};
// should log type be recorded to error file
const LOG_RECORD = {
    fatal: true,
    error: true,
    warn: false,
    http: false,
    info: false,
};
const LOG_COLORS = {
    fatal: 'red',
    error: 'red',
    warn: 'yellow',
    http: 'green',
    info: 'cyan',
};
// the console method used for each log level
const CONSOLE_METHODS = {
    fatal: 'error',
    error: 'error',
    warn: 'warn',
    http: 'info',
    info: 'info',
};

// transport: 'console', 'file'
const LOG_FORMATTER = ({level, datetime, id, message, color}, transport, logger) => {
    // colorize elements for console logging only
    // (adds extra characters for color codes)
    if (transport === 'console') {
        level = logger.colorize(color, level.toUpperCase());
        id = logger.colorize(color, id);
    }
    // return array used for log format..
    return [level, datetime, id, message];
};

// new FileTransport({filename, options});
class FileTransport extends Console {
    constructor(file_options) {
        const {filename="", options={}} = file_options;
        const log_stream = createWriteStream(filename, options);
        // a log file that cannot be written should not crash the app
        log_stream.on('error', error => console.error('log file error:', error.message));
        super({stdout: log_stream, stderr: log_stream});
    }
}

class LoggyBoi {
    /**
    * sets global defaults for all loggers, including ones already created
    * @param {object} [global_options={}]
    * @static
    */
    static setGlobalOptions(global_options={}) {
        const {
            replacer = null,
            log_format = null,
            log_colors = {},
            file_record = {},
            file_options = {},
        } = global_options;

        this._grecord = {
            ...LOG_RECORD,
            ...file_record,
        };
        this._gcolors = {
            ...LOG_COLORS,
            ...log_colors,
        };
        this._greplacer = replacer ?? __dirname;
        this._gformatter = log_format || LOG_FORMATTER;
        if (this.validFileOptions(file_options)) {
            this._gfilestream = new FileTransport(file_options);
        }
    }
    /**
    * @param {object} file_options
    * @returns {boolean} based on if file_options is valid
    */
    static validFileOptions(file_options) {
        return !!file_options?.filename;
    }

    constructor() {this.initialize(...arguments)}
    setGlobalOptions(){return LoggyBoi.setGlobalOptions(...arguments)}
    initialize(id_or_filename, logger_options={}) {
        const {file_record={},log_colors={}} = logger_options;
        this._file_record = file_record;
        this._log_colors = log_colors;
        this.addFileTransport(logger_options.file_options);
        this.setFormatter(logger_options.log_format);
        this.setID(id_or_filename,LoggyBoi._greplacer);
    }
    // global options are read when logging, so loggers created before
    // setGlobalOptions was called still use the global log file
    get file_record() {return {...LoggyBoi._grecord, ...this._file_record}}
    get log_colors() {return {...LoggyBoi._gcolors, ...this._log_colors}}
    get filestream() {return this._filestream || LoggyBoi._gfilestream || null}
    setFormatter(formatter_function) {
        this._formatter = formatter_function || null;
    }
    addFileTransport(file_options={}) {
        this._filestream = null;
        if (LoggyBoi.validFileOptions(file_options)) {
            this._filestream = new FileTransport(file_options);
        }
    }
    setID(id_or_filename, replacer) {
        let idtag = String(id_or_filename).replace(replacer, '');
        if (idtag.endsWith('.js')) {
            idtag = idtag.replace('.js', '');
            idtag = `[${idtag}]`;
        }
        this.idtag = idtag;
    }
    colorize(color, text) {
        return `${colors.fg[color] || ''}${text}${colors.reset}`;
    }

    /**
    * @public
    */
    get Logger() {return LoggyBoi} //for creating children if needed
    get timestamp() {return DateTime.now().toLocaleString(DateTime.DATETIME_MED)}

    log() {this.#log('info', ...arguments)} // should use .info instead.
    info() {this.#log('info', ...arguments)}
    http() {this.#log('http', ...arguments)}
    warn() {this.#log('warn', ...arguments)}
    error(){this.#log('error', ...arguments)}
    fatal(){this.#log('fatal', ...arguments)}

    /**
    * @private
    * never throws, a failed log must not cause another error to log
    */
    #log(level, ...argz) {
        try {
            const method = CONSOLE_METHODS[level] || 'log';
            const format_data = this.#formatArgz(level, ...argz);
            const formatter = this._formatter || LoggyBoi._gformatter;
            console[method](...formatter(format_data, 'console', this)); // regular console log:
            const filestream = this.filestream;
            if (filestream && this.file_record[level]) { // log to file::
                filestream[method](...formatter(format_data, 'file', this));
            }
        } catch (error) {
            try { console.error('logger error:', error) } catch { /* nothing left to log with */ }
        }
    }
    // converts arguments sent to _log function into an object
    #formatArgz(level, message, metadata={}) {
        return {
            id: this.idtag,
            datetime: this.timestamp,
            color: this.log_colors[level],
            level, message, metadata,
        };
    }
}

// initialize default values
LoggyBoi.setGlobalOptions();

// export as function to quickly create new logger
module.exports = function(idtag, options){
    return new LoggyBoi(idtag, options);
};

// export class as require(module).Logger
module.exports.Logger = LoggyBoi;

// export function for setGlobalOptions
module.exports.setGlobalOptions = function(){
    LoggyBoi.setGlobalOptions(...arguments);
};
