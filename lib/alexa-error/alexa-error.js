// Custom Error Handler to return user/Alexa friendly language on the exception

module.exports = function AlexaResponseError(message, extra) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
    this.extra = extra;
};

require('util').inherits(module.exports, Error);
