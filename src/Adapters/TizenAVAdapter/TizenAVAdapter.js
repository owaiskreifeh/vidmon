import Adapter from '../Adapter';
import Logger from '../../Logger';
import ValidationException from '../../ValidationException';
import { AV_ERROR, AV_STATE } from './enums';

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
            this._watchAvState(); // emit PLAY | PAUSE Events
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
            ...event,
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
                // this._handleAVError(eventType)
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
                if (state != this._lastAvState) {
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

    _handleAVError = (errorMessage) => {
        switch (errorMessage) {
            case AV_ERROR.PLAYER_ERROR_CONNECTION_FAILED:
                // Do something
                break;
            case AV_ERROR.PLAYER_ERROR_GENEREIC:
                // Do something
                break;
            case AV_ERROR.PLAYER_ERROR_INVALID_OPERATION:
                // Do something
                break;
            case AV_ERROR.PLAYER_ERROR_INVALID_PARAMETER:
                // Do something
                break;
            case AV_ERROR.PLAYER_ERROR_INVALID_STATE:
                // Do something
                break;
            case AV_ERROR.PLAYER_ERROR_INVALID_URI:
                // Do something
                break;
            case AV_ERROR.PLAYER_ERROR_NONE:
                // Do something
                break;
            case AV_ERROR.PLAYER_ERROR_NOT_SUPPORTED_FILE:
                // Do something
                break;
            case AV_ERROR.PLAYER_ERROR_NO_SUCH_FILE:
                // Do something
                break;
            case AV_ERROR.PLAYER_ERROR_SEEK_FAILED:
                // Do something
                break;
        }
    };

    // Check if we're in tizen env`
    _hasWebapis = () => {
        return window.webapis !== undefined;
    };
}

export default TizenAVAdapter;
