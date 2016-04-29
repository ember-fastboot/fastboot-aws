"use strict";

const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');
const spawn = require('child_process').spawn;

const S3_BUCKET = process.env.RELEASE_BUCKET || 'fastboot-aws';

let s3 = new AWS.S3({
  apiVersion: '2006-03-01'
});

let version = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'))).version;
let key = `fastboot-aws-${version}.zip`;

checkIfCurrentVersionExists()
  .then(createZip)
  .then(uploadZip)
  .then(aliasLatest)
  .then(() => {
    console.log('Done');
  })
  .catch(err => {
    console.error(err.stack);
  });

function checkIfCurrentVersionExists() {
  let params = {
    Bucket: S3_BUCKET,
    Key: key
  };

  return s3.headObject(params).promise()
    .then(data => {
      console.error(`Key ${key} already exists`);
      process.exit(1);
    }, err => {
      if (err.code !== 'NotFound') {
        throw err;
      }
    });
}

function createZip() {
  return new Promise((res, rej) => {
    let archive = spawn('git', ['archive', '-v', '--format=zip', '-o', key, 'master']);

    archive.stdout.pipe(process.stdout);
    archive.stderr.pipe(process.stderr);

    archive.on('close', code => {
      if (code !== 0) {
        rej();
      } else {
        res();
      }
    });
  });
}

function uploadZip() {
  let file = fs.createReadStream(key);

  let params = {
    Bucket: S3_BUCKET,
    Key: key,
    Body: file
  };

  return s3.putObject(params).promise();
}

function aliasLatest() {
  let params = {
    Bucket: S3_BUCKET,
    CopySource: `${S3_BUCKET}/${key}`,
    Key: 'fastboot-aws-latest.zip'
  };

  return s3.copyObject(params).promise();
}

