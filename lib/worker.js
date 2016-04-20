"use strict";

const FastBootServer = require('ember-fastboot-server');

class Worker {
  constructor(options) {
    this.distPath = options.distPath;
    this.httpServer = options.httpServer;
    this.ui = options.ui;
  }

  start() {
    if (!this.distPath) {
      this.middleware = this.noAppMiddleware();
    } else {
      this.buildServer();
      this.middleware = this.server.middleware();
    }

    this.bindEvents();
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

  serveHTTP() {
    this.ui.writeLine('starting HTTP server');
    return Promise.resolve(this.httpServer.serve(this.middleware));
  }

  noAppMiddleware() {
    return (req, res) => {
      res.status(500).send('No Application Found');
    };
  }
}

module.exports = Worker;
