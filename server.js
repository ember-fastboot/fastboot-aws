"use strict";

const ExpressHTTPServer = require('./lib/express-http-server');
const S3Downloader      = require('./lib/s3-downloader');
const S3Notifier        = require('./lib/s3-notifier');
const UI                = require('./lib/ui');
const FastBootAppServer = require('./lib/fastboot-app-server');

const S3_BUCKET = process.env.FASTBOOT_S3_BUCKET;
const S3_KEY    = process.env.FASTBOOT_S3_KEY;
const USERNAME  = process.env.FASTBOOT_USERNAME;
const PASSWORD  = process.env.FASTBOOT_PASSWORD;

let downloader = new S3Downloader({
  bucket: S3_BUCKET,
  key: S3_KEY,
  ui: UI
});

let notifier = new S3Notifier({
  bucket: S3_BUCKET,
  key: S3_KEY,
  ui: UI
});

let httpServer = new ExpressHTTPServer({
  ui: UI,
  username: USERNAME,
  password: PASSWORD
});

let server = new FastBootAppServer({
  ui: UI,
  downloader: downloader,
  notifier: notifier,
  httpServer: httpServer,
});

server.start();
