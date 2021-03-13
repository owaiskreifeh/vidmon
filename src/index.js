import { vidEvents } from "./vidEvents";

class ValidationException extends Error {
    static TAG = "VIDMOM ERROR: ";
    constructor(message) {
        super(`${ValidationException.TAG}: ${message}`);
        this.name = "ValidationError";
    }
}
class Vidmon {
    static LOG_LEVELS = {
        DISABLED: 0,
        ERROR: 1,
        WARNING: 2,
        INFO: 3,
        DEBUG: 4,
        VERBOSE: 5,
    };

    static WATCHERS = {
        JOIN_TIME: "Join Time",
        REAL_STALL: "Visual Stalling",
        MULTI_WAITING: "Multiple waitings in a row",
        PLAY_AFTER_WAITING: "Play after waiting",
    };

    _logLevel = 1;
    _vidEl = null;
    _extra = null;
    _eventsLogs = [];
    _lastEvent = {};
    _startTime = null;
    _timeupdateThreshold = 10 * 1000; // 10sec
    _jointimeThershold = 30 * 1000; // 30sec
    _playAfterWaitingThershold = 5 * 1000; // 30sec
    _waitingTSDiffThershold = 60 * 1000; // 30sec
    _lastTimeupdateTS = 0;
    _watchers = {};
    _waitings = [];

    /**
     * Create Vidmon instance
     * @param {HTMLVideoElement} videoElement video element to monitor
     * @param {Object|null} reportExtra any extra data to include on the report
     */
    constructor(videoElement, reportExtra = {}) {
        this._vidEl = videoElement;
        this._extra = reportExtra;
    }

    /**
     * Set log level where 0 is disabled and 4 is debug logs
     */
    set logLevel(level) {
        if (level < 0 || level > 5) {
            throw new ValidationException(
                "Log level should be one of " +
                    JSON.stringify(Object.keys(Vidmon.LOG_LEVELS))
            );
        }
        this._logLevel = level;
    }

    start = () => {
        if (!this._vidEl) {
            throw new ValidationException("Video elements is not set yet");
        }
        this._log(Vidmon.LOG_LEVELS.INFO, "Started");
        this._startTime = Date.now();
        this._eventsLogs.push({
            event: {
                type: "vidmon_start",
            },
            ts: this._startTime,
        });
        this._attachListeners();
    };

    stop = () => {
        this._log(Vidmon.LOG_LEVELS.INFO, "Stopped");
        this._removeListeners();
        this._watchers.forEach((watcher) => {
            clearTimeout(watcher);
        });
        console.log(this._logEvent);
    };

    _handleEvents = (event) => {
        this._logEvent(event);

        this._lastEvent = {
            event,
            ts: Date.now(),
        };

        this._eventsLogs.push(this._lastEvent);

        this._handleWatchers(event);
    };

    _attachListeners = () => {
        vidEvents.forEach((eventName) => {
            this._log(
                Vidmon.LOG_LEVELS.VERBOSE,
                "Adding Event Listener",
                eventName
            );
            this._vidEl.addEventListener(eventName, this._handleEvents);
        });
    };

    _removeListeners = () => {
        vidEvents.forEach((eventName) => {
            this._log(
                Vidmon.LOG_LEVELS.VERBOSE,
                "Removing Event Listener",
                eventName
            );
            this._vidEl.removeEventListener(eventName, this._handleEvents);
        });
    };

    _startWatcher = (type, timeout, callback, overwritePrev = false) => {
        this._log(Vidmon.LOG_LEVELS.VERBOSE, "Adding watcher for ", type);

        if (!overwritePrev && this._watchers[type]) {
            throw new ValidationException(
                `event type ${type} has watcher already!`
            );
        } else if (this._watchers[type]) {
            this._stopWatcher(type);
        }
        this._watchers[type] = setTimeout(callback, timeout);
    };

    _stopWatcher = (type) => {
        if (this._watchers[type]) {
            this._log(Vidmon.LOG_LEVELS.VERBOSE, "Removing watcher for ", type);
            clearTimeout(this._watchers[type]);
            delete this._watchers[type];
        }
    };

    _handleWatchers = (event) => {
        switch (event.type) {
            case "play":
                this._startWatcher(
                    Vidmon.WATCHERS.JOIN_TIME,
                    this._jointimeThershold,
                    () => {
                        this._log(
                            Vidmon.LOG_LEVELS.WARNING,
                            "Join time toke more than",
                            this._jointimeThershold / 1000,
                            "seconds"
                        );
                    }
                );
                break;
            case "timeupdate":
                this._stopWatcher(Vidmon.WATCHERS.JOIN_TIME);
                this._stopWatcher(Vidmon.WATCHERS.REAL_STALL);
                this._stopWatcher(Vidmon.WATCHERS.PLAY_AFTER_WAITING);
                this._startWatcher(
                    Vidmon.WATCHERS.REAL_STALL,
                    this._timeupdateThreshold,
                    () => {
                        this._log(
                            Vidmon.LOG_LEVELS.WARNING,
                            "The player visually stalled for more than",
                            this._timeupdateThreshold / 1000,
                            "seconds"
                        );
                    }
                );
                break;
            case "pause":
                this._stopWatcher(Vidmon.WATCHERS.JOIN_TIME);
                this._stopWatcher(Vidmon.WATCHERS.REAL_STALL);
                break;
            case "waiting":
                this._stopWatcher(Vidmon.WATCHERS.MULTI_WAITING);
                this._stopWatcher(Vidmon.WATCHERS.PLAY_AFTER_WAITING);
                this._startWatcher(
                    Vidmon.WATCHERS.PLAY_AFTER_WAITING,
                    this._playAfterWaitingThershold,
                    () => {
                        this._log(
                            Vidmon.LOG_LEVELS.WARNING,
                            "The player still waiting for more than",
                            this._playAfterWaitingThershold / 1000,
                            "seconds"
                        );
                    }
                );
                this._startWatcher(Vidmon.WATCHERS.MULTI_WAITING, 500, () => {
                    this._waitings.push(Date.now());
                    if (this._waitings.length > 3) {
                        this._waitings.shift();
                        if (
                            Date.now - this._waitings[0] >
                            this._waitingTSDiffThershold
                        )
                            this._log(
                                Vidmon.LOG_LEVELS.WARNING,
                                "The player waitted for more than 3 times in less than ",
                                this._waitingTSDiffThershold / 1000,
                                "seconds"
                            );
                    }
                });
        }
    };

    _logEvent = (event) => {
        switch (event.type) {
            case "play":
            case "pause":
            case "ratechange":
            case "seeked":
                this._log(Vidmon.LOG_LEVELS.INFO, "Got event", event.type);
                break;
            case "error":
                this._log(
                    Vidmon.LOG_LEVELS.ERROR,
                    "Got Error",
                    this._vidEl.error
                );
                break;
            default:
                this._log(Vidmon.LOG_LEVELS.VERBOSE, "Got event", event.type);
        }
    };

    _log = (level, ...args) => {
        const TAG = "Vidmon: ";
        if (level == Vidmon.LOG_LEVELS.DISABLED) return;
        switch (level) {
            case Vidmon.LOG_LEVELS.DEBUG:
                if (this._logLevel >= Vidmon.LOG_LEVELS.DEBUG)
                    console.debug
                        ? console.debug(TAG, ...args)
                        : console.log(TAG, "DEBUG: ", ...args);
                break;
            case Vidmon.LOG_LEVELS.ERROR:
                if (this._logLevel >= Vidmon.LOG_LEVELS.ERROR)
                    console.error
                        ? console.error(TAG, ...args)
                        : console.log(TAG, "ERROR: ", ...args);
                break;
            case Vidmon.LOG_LEVELS.WARNING:
                if (this._logLevel >= Vidmon.LOG_LEVELS.WARNING)
                    console.warn
                        ? console.warn(TAG, ...args)
                        : console.log(TAG, "WARNING: ", ...args);
                break;
            case Vidmon.LOG_LEVELS.INFO:
                if (this._logLevel >= Vidmon.LOG_LEVELS.INFO)
                    console.info
                        ? console.info(TAG, ...args)
                        : console.log(TAG, "INFO: ", ...args);
                break;
            case Vidmon.LOG_LEVELS.VERBOSE:
                if (this._logLevel >= Vidmon.LOG_LEVELS.VERBOSE)
                    console.info
                        ? console.info(TAG, ...args)
                        : console.log(TAG, "VERBOSE: ", ...args);
                break;
        }
    };
}

export default Vidmon;
