'use strict';

const redis = require('redis');
const onFinished = require('on-finished');

const FIVE_MINUTES = 5 * 60;

class RedisCache {
  constructor(options) {
    let client = this.client = redis.createClient({
      host: options.host,
      port: options.port
    });

    this.expiration = options.expiration || FIVE_MINUTES;
    this.connected = false;

    client.on('error', error => {
      this.ui.writeLine(`redis error; err=${error}`);
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.ui.writeLine('redis connected');
    });

    this.client.on('end', () => {
      this.connected = false;
      this.ui.writeLine('redis disconnected');
    });
  }

  fetch(path, request) {
    if (!this.connected) {
      return;
    }

    return new Promise((res, rej) => {
      this.client.get(path, (err, reply) => {
        if (err) {
          rej(err);
        } else {
          res(reply);
        }
      });
    });
  }

  put(path, body) {
    return new Promise((res, rej) => {
      this.client.multi()
        .set(path, body)
        .expire(path, this.expiration)
        .exec(err => {
          if (err) {
            rej(err);
          } else {
            res();
          }
        });
    });
  }
}

module.exports = RedisCache;
