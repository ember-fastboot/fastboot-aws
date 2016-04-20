"use strict";

const FastBootServer = require('ember-fastboot-server');

class Worker {
  constructor(options) {
    this.distPath = options.distPath;
    this.httpServer = options.httpServer;
    this.ui = options.ui;
  }

  start() {
    this.bindEvents();
    this.buildServer();
    this.serveHTTP();
  }

  bindEvents() {
    process.on('message', message => this.handleMessage(message));
  }

  handleMessage(message) {
    switch (message.event) {
      case 'reload':
        this.server.reload();
        break;
    }
  }

  buildServer() {
    this.server = new FastBootServer({
      distPath: this.distPath,
      ui: this.ui
    });
  }

  get middleware() {
    return this._middleware || this.server.middleware();
  }

  set middleware(middleware) {
    this._middleware = middleware;
  }
  serveHTTP() {
    this.ui.writeLine('starting HTTP server');
    return Promise.resolve(this.httpServer.serve(this.middleware));
  }
}

module.exports = Worker;
