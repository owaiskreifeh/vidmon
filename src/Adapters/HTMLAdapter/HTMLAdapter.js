import Adapter from '../Adapter';
import { vidEvents } from './events';
import Logger from '../../Logger';
import ValidationException from '../../ValidationException';

class HTMLAdapter extends Adapter {
    constructor(player) {
        super(player, Adapter.TYPES.HTML_PLAYER);
    }

    attachListeners() {
        Logger.log(Logger.LOG_LEVELS.DEBUG, this.type, "Attaching Listeners", JSON.stringify(vidEvents))
        if (!this._eventHandlerCallback) {
            throw new ValidationException('event handler is not initialized');
        }
        vidEvents.forEach((eventName) => {
            Logger.log(
                Logger.LOG_LEVELS.VERBOSE,
                'Adding Event Listener',
                eventName
            );
            this._player.addEventListener(
                eventName,
                this._eventHandlerCallback
            );
        });
    }

    detachListeners = () => {
        vidEvents.forEach((eventName) => {
            Logger.log(
                Logger.LOG_LEVELS.VERBOSE,
                'Removing Event Listener',
                eventName
            );
            this._player.removeEventListener(eventName, this._eventHandler);
        });
    };
    
    getError = () => {
        return this._player.error;
    };

    _eventHandler = (event) => {
        this._eventHandlerCallback(this._adaptEvent(event));
    };

    _adaptEvent = (event) => {
        return {
            type: event.type,
            ts: Date.now(),
            currentTime: this.player.currentTime,
        };
    };


}

export default HTMLAdapter;
