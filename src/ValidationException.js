export default class ValidationException extends Error {
    static TAG = 'VIDMOM ERROR';
    constructor(message) {
        super(`${ValidationException.TAG}: ${message}`);
        this.name = 'ValidationError';
    }
}