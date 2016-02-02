var assert         = require('assert');
var fs             = require('fs');
var fsp            = require('fs-promise');
var path           = require('path');
var RSVP           = require('rsvp');
var Promise        = RSVP.Promise;
var exec           = RSVP.denodeify(require('child_process').exec);
var express        = require('express');
var cluster        = require('express-cluster');
var isMaster       = require('cluster').isMaster;
var AWS            = require('aws-sdk');
var FastBootServer = require('ember-fastboot-server');
var basicAuth      = require('./basic-auth');

var S3_BUCKET = process.env.FASTBOOT_S3_BUCKET;
var S3_KEY    = process.env.FASTBOOT_S3_KEY;
var USERNAME  = process.env.FASTBOOT_USERNAME;
var PASSWORD  = process.env.FASTBOOT_PASSWORD;

var OUTPUT_PATH = 'fastboot-dist';
var ZIP_PATH    = 'fastboot-dist.zip';

// The core promise chain that initializes the server.
//
// 1. Delete the old `fastboot-dist` directory (if it exists)
// 2. Fetch the new zip file containing the FastBoot build of the app from S3.
//    The S3 bucket and key are provided via environment variables.
// 3. Unzip the zip into `fastboot-dist`
// 4. Start the FastBoot server, with app, vendor and `index.html` files detected
//    automatically.

var missingEnv = findMissingEnvVars();

// The master process is in charge of downloading the application zip
// file before spinning up child processes.
if (!missingEnv && isMaster) {
  removeOldApp()
    .then(downloadAppZip)
    .then(unzipApp)
    .then(startServer)
    .catch(function(err) {
      log(err);
    });
} else {
  startServer();
}

// If this server had already downloaded a previous version of the app, delete
// the directory.
function removeOldApp() {
  log("Removing " + OUTPUT_PATH);
  return fsp.remove(OUTPUT_PATH);
}

// Fetch the zip file of the new assets as provided by the FASTBOOT_S3_BUCKET
// and FASTBOOT_S3_KEY environment variables. We'll save that file to
// `fastboot-dist.zip`.
function downloadAppZip() {
  return new RSVP.Promise(function(res, rej) {
    var s3 = new AWS.S3();
    var params = {
      Bucket: S3_BUCKET,
      Key: S3_KEY
    };

    var file = fs.createWriteStream(ZIP_PATH);
    var request = s3.getObject(params);

    log("Saving S3 object " + S3_BUCKET + "/" + S3_KEY + " to " + ZIP_PATH);

    request.createReadStream().pipe(file)
      .on('close', res)
      .on('error', rej);
  });
}

// Unzip `fastboot-dist.zip`
function unzipApp() {
  return execAndPrint('unzip ' + ZIP_PATH)
    .then(function() {
      log("Unzipped " + ZIP_PATH);
    });
}

// Start an Express server and use the FastBootServer middleware.
// We'll automatically find the correct vendor, app and `index.html` files
// based on the name of the app.
function startServer() {
  cluster(function() {
    var app = express();

    if (USERNAME !== undefined || PASSWORD !== undefined) {
      app.use(basicAuth(USERNAME, PASSWORD));
    }

    if (missingEnv) {
      app.get('/*', function(req, res) {
        res.send("Missing environment variable " + missingEnv);
      });
    } else {
      var server = new FastBootServer({
        distPath: OUTPUT_PATH,
        ui: {
          writeLine: function() {
            log.apply(null, arguments);
          }
        }
      });

      app.get('/*', server.middleware());
    }

    var listener = app.listen(process.env.PORT || 3000, function () {
      var host = listener.address().address;
      var port = listener.address().port;

      log('FastBoot server listening at http://%s:%s', host, port);
    });
  }, { verbose: true });
}

function findMissingEnvVars() {
  var requiredEnvs = ['S3_BUCKET', 'S3_KEY'];

  for (var i = 0; i < requiredEnvs.length; i++) {
    var name = requiredEnvs[i];

    if (!process.env['FASTBOOT_' + name]) {
      log("Couldn't find required environment variable FASTBOOT_" + name);
      return "FASTBOOT_" + name;
    }
  }

  return false;
}

function log() {
  var args = Array.prototype.slice.apply(arguments);
  if (args[0] !== null || args[0] !== undefined) {
    args[0] = '[' + (new Date()).toISOString() + '] ' + args[0];
  }

  console.log.apply(console, args);
}

function execAndPrint() {
  return exec.apply(null, arguments)
    .then(function(stdout, stderr) {
      log(stdout);
      if (stderr) {
        log(stderr);
      }
    });
}

