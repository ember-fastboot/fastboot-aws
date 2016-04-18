"use strict";

const RSVP = require('rsvp');
const AWS  = require('aws-sdk');
const fs = require('fs');
const fsp  = require('fs-promise');
const exec = RSVP.denodeify(require('child_process').exec);

const AppNotFoundError = require('./errors/app-not-found');

const OUTPUT_PATH = 'dist';
const ZIP_PATH    = 'dist.zip';

const s3 = new AWS.S3({
  apiVersion: '2006-03-01'
});

/*
 * Downloader class that downloads the latest version of the deployed
 * app from S3 and unzips it.
 */
class S3Downloader {
  constructor(options) {
    this.ui = options.ui;
    this.configBucket = options.bucket;
    this.configKey = options.key;

    this.ui.writeLine(`S3 downloader created; bucket=${this.bucket}; key=${this.key}`);
  }

  download(config) {
    if (!this.configBucket || !this.configKey) {
      return Promise.reject(new AppNotFoundError());
    }

    return this.fetchCurrentVersion()
      .then(() => this.removeOldApp())
      .then(() => this.downloadAppZip())
      .then(() => this.unzipApp())
      .then(() => this.installNPMDependencies())
      .then(() => OUTPUT_PATH);
  }

  removeOldApp() {
    this.ui.writeLine('removing ' + OUTPUT_PATH);
    return fsp.remove(OUTPUT_PATH);
  }

  fetchCurrentVersion() {
    this.ui.writeLine('fetching current app version');

    return new Promise((res, rej) => {
      let bucket = this.configBucket;
      let key = this.configKey;

      let params = {
        Bucket: bucket,
        Key: key
      };

      s3.getObject(params, (err, data) => {
        if (err) { return rej(err); }

        let config = JSON.parse(data.Body);
        this.ui.writeLine('got config', config);

        this.appBucket = config.bucket;
        this.appKey = config.key;

        res();
      });
    });
  }

  downloadAppZip() {
    return new Promise((res, rej) => {
      let bucket = this.appBucket;
      let key = this.appKey;

      let params = {
        Bucket: bucket,
        Key: key
      };

      let file = fs.createWriteStream(ZIP_PATH);
      let request = s3.getObject(params);

      this.ui.writeLine("Saving S3 object " + bucket + "/" + key + " to " + ZIP_PATH);

      request.createReadStream().pipe(file)
        .on('close', res)
        .on('error', rej);
    });
  }

  unzipApp() {
    return this.execAndPrint('unzip ' + ZIP_PATH)
      .then(() => {
        this.ui.writeLine("Unzipped " + ZIP_PATH);
      });
  }

  installNPMDependencies() {
    return this.execAndPrint(`cd ${OUTPUT_PATH} && npm install`);
  }

  execAndPrint() {
    return exec.apply(null, arguments)
      .then((stdout, stderr) => {
        this.ui.writeLine(stdout);
        if (stderr) {
          this.ui.writeLine(stderr);
        }
      });
  }
}

module.exports = S3Downloader;
