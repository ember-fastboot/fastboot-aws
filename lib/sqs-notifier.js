"use strict";

const AWS  = require('aws-sdk');

const POLL_TIME = 1000;

const sqs = new AWS.SQS({
  region: 'us-east-1',
  apiVersion: '2012-11-05'
});

class SQSNotifier {
  constructor(options) {
    this.queue = options.queue;
    this.ui = options.ui;

    this.params = {
      QueueUrl: this.queue,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20
    };
  }

  subscribe(notify) {
    if (this.queue) {
      this.notify = notify;
      this.pollSQS();
    } else {
      this.ui.writeLine('no SQS URL; not listening for updates');
    }

    return Promise.resolve();
  }

  pollSQS() {
    let params = this.params;

    sqs.receiveMessage(params, (err, data) => {
      if (err) { this.ui.writeLine(err); }
      if (data && data.Messages) {
        this.ui.writeLine('received reload message');
        this.notify();
        this.deleteMessage(data);
      }

      setTimeout(() => {
        this.pollSQS();
      }, POLL_TIME);
    });
  }

  deleteMessage(data) {
    let receiptHandle = data.Messages && data.Messages[0].ReceiptHandle;

    if (!receiptHandle) { return; }

    let params = {
      QueueUrl: this.queue,
      ReceiptHandle: receiptHandle
    };

    sqs.deleteMessage(params, (err, data) => {
      if (err) {
        this.ui.writeLine('Error deleting SQS message');
        this.ui.writeLine(err, err.stack);
      }
    });
  }
}


module.exports = SQSNotifier;
