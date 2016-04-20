"use strict";

const S3Downloader      = require('fastboot-s3-downloader');
const S3Notifier        = require('fastboot-s3-notifier');
const FastBootAppServer = require('fastboot-app-server');

const S3_BUCKET = process.env.FASTBOOT_S3_BUCKET;
const S3_KEY    = process.env.FASTBOOT_S3_KEY;
const USERNAME  = process.env.FASTBOOT_USERNAME;
const PASSWORD  = process.env.FASTBOOT_PASSWORD;

let downloader = new S3Downloader({
  bucket: S3_BUCKET,
  key: S3_KEY
});

let notifier = new S3Notifier({
  bucket: S3_BUCKET,
  key: S3_KEY
});

let server = new FastBootAppServer({
  downloader: downloader,
  notifier: notifier
});

server.start();
