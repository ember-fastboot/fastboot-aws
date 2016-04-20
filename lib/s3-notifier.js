"use strict";

const AWS  = require('aws-sdk');

const DEFAULT_POLL_TIME = 3 * 1000;

const s3 = new AWS.S3({
  apiVersion: '2006-03-01'
});

class S3Notifier {
  constructor(options) {
    this.ui = options.ui;
    this.bucket = options.bucket;
    this.key = options.key;
    this.pollTime = options.poll || DEFAULT_POLL_TIME;

    this.params = {
      Bucket: this.bucket,
      Key: this.key
    };
  }

  subscribe(notify) {
    this.notify = notify;

    this.getCurrentLastModified()
      .then(() => this.schedulePoll());
  }

  getCurrentLastModified() {
    return s3.headObject(this.params).promise()
      .then(data => {
        this.lastModified = data.LastModified;
      })
      .catch(err => {
        this.ui.writeLine('Error fetching S3 last modified: ', err);
      });
  }

  schedulePoll() {
    setTimeout(() => {
      this.poll();
    }, this.pollTime);
  }

  poll() {
    s3.headObject(this.params).promise()
      .then(data => {
        this.compareLastModifieds(data.LastModified);
        this.schedulePoll();
      });
  }

  compareLastModifieds(newLastModified) {
    if (newLastModified !== this.lastModified) {
      this.ui.writeLine('config modified; old=%s; new=%s', this.lastModified, newLastModified);
      this.lastModified = newLastModified;
      this.notify();
    }
  }
}


module.exports = S3Notifier;
