import Logger from '../Logger';
import ValidationException from '../ValidationException';

export default class Adapter /** Abstract class */ {
    static TYPES = {
        AV_PLAYER: "Tizen AV Player", // Tizen
        HTML_PLAYER: "HTML5 Video Player", // Web native HTML5
        AV_PLAY: "Apple AV Play", // iOS
        EXO_PLAYER: "Android Exo Player", // Android
    };

    _player = null;
    _eventHandlerCallback = null;
    _type = null;
    constructor(player, type) {
        this.player = player;
        this.type = type;

        Logger.log(Logger.LOG_LEVELS.DEBUG, "Adapter initialized: ", type)
    }

    set type (type) {
        if (!Object.values(Adapter.TYPES).includes(type)) {
            throw new ValidationException(
                'Type should be one of ' + JSON.stringify(Adapter.TYPES, null, "2")
            );
        }
        this._type = type;
    }

    get type () {
        return this._type;
    }

    set player(player) {
        if (!player) {
            throw new ValidationException(
                'Player shouldn\'t be null'
            );
        }

        this._player = player;
    }

    get player() {
        return this._player;
    }

    set eventHandler(handler) {
        if (!(handler instanceof Function)) {
            throw new ValidationException(
                'Event handler should be of type Function but got ' +
                    typeof handler
            );
        }
        this._eventHandlerCallback = handler;
    }

    
/*
    Abstract methods
    attachListeners = (callback) => {};
    detachListeners = () => {};
*/


}
