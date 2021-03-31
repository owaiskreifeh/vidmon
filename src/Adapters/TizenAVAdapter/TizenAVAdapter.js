import Adapter from '../Adapter';
import Logger from '../../Logger';
import ValidationException from '../../ValidationException';
import { AV_ERROR, AV_STATE } from './enums'


class TizenAVAdapter extends Adapter {
    _lastError = null;
    _avStateWatcherInterval = 500; // in ms
    _lastAvState = AV_STATE.IDLE;

    constructor(player) {
        super(player, Adapter.TYPES.AV_PLAY);
    }

    /**
     * @implements Adapter.attachListeners
     */
    attachListeners() {
        Logger.log(Logger.LOG_LEVELS.DEBUG, this.type, 'Attaching Listeners');
        if (!this._eventHandlerCallback) {
            throw new ValidationException('event handler is not initialized');
        }
        if (this._hasWebapis) {
            window.webapis.avplay.setListener(this._buildAvEventsObject());
        }
    }

    /**
     * @implements Adapter.detachListeners
     */
    detachListeners = () => {
        //@TODO: Check if we need to call `webapis.avplay.close()` to remove listeners
        clearInterval(this._avStateWatcher);
    };

    /**
     * @implements Adapter.getError
     */
    getError = () => {
        return this._lastError;
    };

    _eventHandler = (event) => {
        this._eventHandlerCallback(this._adaptEvent(event));
    };

    _adaptEvent = (event) => {
        return {
            ts: Date.now(),
            currentTime: this.player.getCurrentTime(),
            ...event
        };
    };

    _buildAvEventsObject() {
        return {
            onbufferingstart: () => {
                this._eventHandler({
                    type: 'waiting',
                });
            },
            oncurrentplaytime: (/*currentTime*/) => {
                this._eventHandler({
                    type: 'timeupdate',
                });
            },
            onerror: (eventType) => {
                this._lastError = eventType;
                this._eventHandler({
                    type: 'error',
                    errorMessage: eventType,
                });
            },
        };
    }

    // Watch for AV state change
    // to check if the state changes from playing to pausing or vice versa
    // Then send the event to Vidmon
    _watchAvState = () => {
        if (this._hasWebapis) {
            this._avStateWatcher = setInterval(() => {
                let state = window.webapis.avplay.getState();
                if (state != this._lastAvState){
                    switch (state) {
                        case AV_STATE.PLAYING:
                            this._eventHandler({
                                type: 'play',
                            });
                            break;
                        case AV_STATE.PAUSED:
                            this._eventHandler({
                                type: 'pause',
                            });
                            break;
                    }
                }
                
            }, this._avStateWatcherInterval);
        }
    };
    // Check if we're in tizen env`
    _hasWebapis = () => {
        return window.webapis !== undefined;
    };
}

export default TizenAVAdapter;
