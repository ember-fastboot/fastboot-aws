"use strict";

const assert                = require('assert');
const cluster               = require('cluster');
const os                    = require('os');
const Worker                = require('./worker');
const AppNotFoundError      = require('./errors/app-not-found');
const appNotFoundMiddleware = require('./middleware/app-not-found');

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

  start() {
    if (cluster.isMaster) {
      return this.initializeApp()
        .then(() => this.subscribeToNotifier())
        .then(() => this.forkWorkers())
        .catch(err => {
          this.ui.writeLine(err.stack);
        });
    } else {
      let worker = new Worker({
        distPath: process.env.FASTBOOT_DIST_PATH,
        httpServer: this.httpServer,
        ui: this.ui
      });

      worker.start();
    }
  }

  initializeApp() {
    let initialize;

    // If there's a downloader, it returns a promise for downloading the app
    if (this.downloader) {
      return this.downloadApp();
    }

    this.ui.writeline(`using distPath; path=${this.distPath}`);

    return Promise.resolve();
  }

  downloadApp() {
    this.ui.writeLine('downloading app');

    return this.downloader.download()
      .then(distPath => {
        this.distPath = distPath;
      });
  }

  subscribeToNotifier() {
    if (this.notifier) {
      this.ui.writeLine('subscribing to update notifications');

      return this.notifier.subscribe(() => {
        this.ui.writeLine('reloading server');
        this.initializeApp()
          .then(() => this.reload());
      });
    }
  }

  reload() {
    let workers = cluster.workers;

    for (let id in workers) {
      workers[id].send({ event: 'reload' });
    }
  }

  forkWorkers() {
    let numCPUs = os.cpus().length;

    for (let i = 0; i < numCPUs; i++) {
      this.forkWorker();
    }
  }

  forkWorker() {
    let worker = cluster.fork({ FASTBOOT_DIST_PATH: this.distPath });
    this.ui.writeLine(`forked worker ${worker.process.pid}`);

    worker.on('exit', (code, signal) => {
      if (signal) {
        this.ui.writeLine(`worker was killed by signal: ${signal}`);
      } else if (code !== 0) {
        this.ui.writeLine(`worker exited with error code: ${code}`);
      } else {
        this.ui.writeLine(`worker exited`);
      }

      this.forkWorker();
    });
  }

}

module.exports = FastBootAppServer;
