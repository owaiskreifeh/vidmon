import EventEmitter from 'events';
import Logger from './Logger';
import ValidationException from './ValidationException';

class Vidmon extends EventEmitter {

    static LOG_LEVELS = Logger.LOG_LEVELS;

    static WATCHERS = {
        JOIN_TIME: 'Join Time',
        REAL_STALL: 'Visual Stalling',
        MULTI_WAITING: 'Multiple waitings in a row',
        PLAY_AFTER_WAITING: 'Play after waiting',
    };

    static EVENTS = {
        LONG_JOIN_TIME: 'long-join-time',
        VISUAL_STALL: 'visual-stall',
        LONG_WAITING_TIME: 'long-waiting-time',
        MULTI_WAITING_IN_ROW: 'multi-waiting-in-row',
    };

    _adapter = null;
    _eventsLogs = [];
    _lastEvent = {};
    _startTime = null;
    _lastTimeupdateTS = 0;
    _watchers = [];
    _waitings = [];
    _options = {
        // time thershold between timeupdate events, if we didn't receive timeupdate event before
        // event of type VISUAL_STALL wil be fired
        timeupdateThreshold: 10 * 1000, // default 10sec

        // time thershold between first play event and first timeupdate event
        // if the join time exceded this limit
        // event of type LONG_JOIN_TIME will be fired
        jointimeThershold: 30 * 1000, // default 30sec

        // time thershold between waiting event and next timeupdate event
        // if the join time exceded this limit
        // event of type LONG_WAITING_TIME will be fired
        playAfterWaitingThershold: 5 * 1000, // default 30sec

        // in this time interval if we get more than 3 waiting events in a row
        // event of type MULTI_WAITING_IN_ROW will be fired
        waitingTSDiffThershold: 60 * 1000, // default 30sec
    };

    /**
     * Create Vidmon instance
     * @param {Adapter} adapter player adapter
     * @param {typeof this._options} options timeout thersholds config
     */
    constructor(adapter, options = {}) {
        super({});
        // setup options
        this._options = {
            ...this._options,
            ...options,
        };
        // setup adapter
        this._adapter = adapter;
        this._adapter.eventHandler = this._handleEvents;
    }

    /**
     * Set log level where 0 is disabled and 5 is verbos (noisy) logs
     */
    set logLevel(level) {
        Logger.logLevel = level;
    }

    get playerEventsLogs() {
        return this._eventsLogs;
    }

    /**
     * start monitor
     */
    start = () => {
        if (!this._adapter.player) {
            throw new ValidationException('Video player is not set yet');
        }
        Logger.log(Logger.LOG_LEVELS.DEBUG, 'Started with adapter', this._adapter.type );
        this._startTime = Date.now();
        this._eventsLogs.push({
            type: 'vidmon_start',
            ts: this._startTime,
        });
        this._attachListeners();
    };

    /**
     * stop monitor
     */
    stop = () => {
        Logger.log(Logger.LOG_LEVELS.INFO, 'Stopped');
        this._detachListeners();
        this._clearListeners();
        this._watchers.forEach((watcher) => {
            clearTimeout(watcher);
        });
    };

    /**
     * Subscripe to player events
     */
    _attachListeners = () => {
        Logger.log(Logger.LOG_LEVELS.DEBUG, "_attachListeners")
        this._adapter.attachListeners();
    };

    /**
     * Unsubscripe to player events
     */
    _detachListeners = () => {
        this._adapter.detachListeners();
    };

    /**
     * Clear all listeners of Vidmon events
     */
    _clearListeners = () => {
        Object.values(Vidmon.EVENTS).forEach((eventName) => {
            this.removeAllListeners(eventName);
        });
    };

    _handleEvents = (event) => {
        this._logEvent(event);

        this._lastEvent = event;

        this._eventsLogs.push(this._lastEvent);

        this._handleWatchers(event);
    };

    _startWatcher = (type, timeout, callback, overwritePrev = false) => {
        Logger.log(Logger.LOG_LEVELS.VERBOSE, 'Adding watcher for ', type);

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
            Logger.log(
                Logger.LOG_LEVELS.VERBOSE,
                'Removing watcher for ',
                type
            );
            clearTimeout(this._watchers[type]);
            delete this._watchers[type];
        }
    };

    _handleWatchers = (event) => {
        switch (event.type) {
            case 'play':
                this._startWatcher(
                    Vidmon.WATCHERS.JOIN_TIME,
                    this._options.jointimeThershold,
                    () => {
                        this.emit(Vidmon.EVENTS.LONG_JOIN_TIME);
                        Logger.log(
                            Logger.LOG_LEVELS.WARNING,
                            'Join time toke more than',
                            this._options.jointimeThershold / 1000,
                            'seconds'
                        );
                    }
                );
                break;
            case 'timeupdate':
                this._stopWatcher(Vidmon.WATCHERS.JOIN_TIME);
                this._stopWatcher(Vidmon.WATCHERS.REAL_STALL);
                this._stopWatcher(Vidmon.WATCHERS.PLAY_AFTER_WAITING);
                this._startWatcher(
                    Vidmon.WATCHERS.REAL_STALL,
                    this._options.timeupdateThreshold,
                    () => {
                        this.emit(Vidmon.EVENTS.VISUAL_STALL);
                        Logger.log(
                            Logger.LOG_LEVELS.WARNING,
                            'The player visually stalled for more than',
                            this._options.timeupdateThreshold / 1000,
                            'seconds'
                        );
                    }
                );
                break;
            case 'pause':
                this._stopWatcher(Vidmon.WATCHERS.JOIN_TIME);
                this._stopWatcher(Vidmon.WATCHERS.REAL_STALL);
                break;
            case 'waiting':
                this._stopWatcher(Vidmon.WATCHERS.MULTI_WAITING);
                this._stopWatcher(Vidmon.WATCHERS.PLAY_AFTER_WAITING);
                this._startWatcher(
                    Vidmon.WATCHERS.PLAY_AFTER_WAITING,
                    this._options.playAfterWaitingThershold,
                    () => {
                        this.emit(Vidmon.EVENTS.LONG_WAITING_TIME);
                        Logger.log(
                            Logger.LOG_LEVELS.WARNING,
                            'The player still waiting for more than',
                            this._options.playAfterWaitingThershold / 1000,
                            'seconds'
                        );
                    }
                );
                this._startWatcher(Vidmon.WATCHERS.MULTI_WAITING, 500, () => {
                    this._waitings.push(Date.now());
                    if (this._waitings.length > 3) {
                        this._waitings.shift();
                        if (
                            Date.now - this._waitings[0] >
                            this._options.waitingTSDiffThershold
                        )
                            this.emit(Vidmon.EVENTS.MULTI_WAITING_IN_ROW);
                        Logger.log(
                            Logger.LOG_LEVELS.WARNING,
                            'The player waitted for more than 3 times in less than ',
                            this._options.waitingTSDiffThershold / 1000,
                            'seconds'
                        );
                    }
                });
        }
    };

    _logEvent = (event) => {
        switch (event.type) {
            case 'play':
            case 'pause':
            case 'ratechange':
            case 'seeked':
                Logger.log(Logger.LOG_LEVELS.INFO, 'Got event', event.type);
                break;
            case 'error':
                Logger.log(
                    Logger.LOG_LEVELS.ERROR,
                    'Got Error',
                    this._adapter.getError()
                );
                break;
            default:
                Logger.log(Logger.LOG_LEVELS.VERBOSE, 'Got event', event.type);
        }
    };
}

export default Vidmon;
