"use strict";

const ExtendableError = require('./extendable-error');

class AppNotFoundError extends ExtendableError {
  constructor(message) {
    super(message);
    this.name = 'AppNotFoundError';
  }
}

module.exports = AppNotFoundError;
