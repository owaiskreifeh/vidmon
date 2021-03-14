import ValidationException from './ValidationException';

class Logger {
    static LOG_LEVELS = {
        DISABLED: 0,
        ERROR: 1,
        WARNING: 2,
        INFO: 3,
        DEBUG: 4,
        VERBOSE: 5,
    };

    static TAG = 'Vidmon: ';
    static _logLevel = 1;
    static set logLevel(level) {
        if (level < 0 || level > 5) {
            throw new ValidationException(
                'Log level should be one of ' +
                    JSON.stringify(Logger.LOG_LEVELS)
            );
        }

        Logger._logLevel = level;
    }

    static get logLevel() {
        return Logger._logLevel;
    }

    static log = (level, ...args) => {
        if (level == Logger.LOG_LEVELS.DISABLED) return;
        const [functionName, levelTag] = Logger._getLogFunction(level);
        if (Logger._logLevel >= level) {
            console[functionName]
                ? console[functionName](Logger.TAG, levelTag, ...args)
                : console.log(Logger.TAG, levelTag, ...args);
        }
    };

    static _getLogFunction = (level) => {
        switch (level) {
            case Logger.LOG_LEVELS.DEBUG:
                return ['debug', 'DEBUG: '];
            case Logger.LOG_LEVELS.ERROR:
                return ['error', 'ERROR: '];
            case Logger.LOG_LEVELS.WARNING:
                return ['warn', 'WARNING: '];
            case Logger.LOG_LEVELS.INFO:
                return ['info', 'INFO: '];
            case Logger.LOG_LEVELS.VERBOSE:
                return ['info', 'VERBOSE: '];
        }
    };
}

export default Logger;
