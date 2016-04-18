"use strict";

const assert                = require('assert');
const FastBootServer        = require('ember-fastboot-server');
const AppNotFoundError      = require('./errors/app-not-found');
const appNotFoundMiddleware = require('./middleware/app-not-found');

const isMaster = require('cluster').isMaster;

class FastBootAppServer {
  constructor(options) {
    this.downloader = options.downloader;
    this.distPath = options.distPath;
    this.notifier = options.notifier;
    this.httpServer = options.httpServer;
    this.ui = options.ui;

    assert(this.distPath || this.downloader, "FastBootAppServer must be provided with either a distPath or a downloader option.");
    assert(!(this.distPath && this.downloader), "FastBootAppServer must be provided with either a distPath or a downloader option, but not both.");
  }

  buildServer(distPath) {
    this.server = new FastBootServer({
      distPath: distPath,
      ui: this.ui
    });
  }

  get middleware() {
    return this._middleware || this.server.middleware();
  }

  set middleware(middleware) {
    this._middleware = middleware;
  }

  start() {
    if (isMaster) {
      return this.downloadApp()
        .then(() => this.subscribeToNotifier())
        .then(() => this.serveHTTP())
        .then(() => this.spawn())
        .catch(err => {
          this.ui.writeLine(err.stack);
        });
    } else {
      return this.serveHTTP();
    }
  }

  downloadApp() {
    let download;

    // If there's a downloader, it returns a promise that
    // resolves to the ultimate distPath
    if (this.downloader) {
      this.ui.writeLine('downloading app');
      download = this.downloader.download();
    } else {
      this.ui.writeline(`using distPath; path=${this.distPath}`);
      // Otherwise, use the hardcoded path provided
      download = Promise.resolve(this.distPath);
    }

    return download
      .then(path => this.buildServer(path))
      .catch(err => {
        if (err instanceof AppNotFoundError) {
          this.middleware = appNotFoundMiddleware();
        } else {
          throw err;
        }
      });
  }

  subscribeToNotifier() {
    if (this.notifier) {
      this.ui.writeLine('subscribing to update notifications');
      return this.notifier.subscribe(() => {
        this.ui.writeLine('reloading server');
        this.server.reload();
      });
    }
  }

  serveHTTP() {
    this.ui.writeLine('starting HTTP server');
    this.httpServer.serve(this.middleware);
  }

  spawn() {
  }
}

module.exports = FastBootAppServer;
