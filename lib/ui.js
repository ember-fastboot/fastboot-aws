"use strict";

class UI {
  static writeLine() {
    var args = Array.prototype.slice.apply(arguments);
    if (args[0] !== null || args[0] !== undefined) {
      args[0] = '[' + (new Date()).toISOString() + '] ' + args[0];
    }

    console.log.apply(console, args);
  }
}

module.exports = UI;
