var assert         = require('assert');
var fs             = require('fs');
var fsp            = require('fs-promise');
var path           = require('path');
var RSVP           = require('rsvp');
var Promise        = RSVP.Promise;
var exec           = RSVP.denodeify(require('child_process').exec);
var express        = require('express');
var AWS            = require('aws-sdk');
var FastBootServer = require('ember-fastboot-server');

var APP_NAME  = process.env.FASTBOOT_APP_NAME;
var S3_BUCKET = process.env.FASTBOOT_S3_BUCKET;
var S3_KEY    = process.env.FASTBOOT_S3_KEY;

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

ensureEnvVars();

removeOldApp()
  .then(downloadAppZip)
  .then(unzipApp)
  .then(startServer)
  .catch(function(err) {
    console.log(err);
    log(err);
  });

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
  return execAndPrint('unzip ' + ZIP_PATH);
}

// Start an Express server and use the FastBootServer middleware.
// We'll automatically find the correct vendor, app and `index.html` files
// based on the name of the app.
function startServer() {
  var app = express();

  var server = new FastBootServer({
    appFile: findAppFile(),
    vendorFile: findVendorFile(),
    htmlFile: findHTMLFile(),
    ui: {
      writeLine: function() {
        log.apply(null, arguments);
      }
    }
  });

  app.get('/*', server.middleware());

  var listener = app.listen(process.env.PORT || 3000, function () {
    var host = listener.address().address;
    var port = listener.address().port;

    log('FastBoot server listening at http://%s:%s', host, port);
  });
}

function findAppFile() {
  return findFile("app", path.join(OUTPUT_PATH, "assets", APP_NAME + "*.js"));
}

function findVendorFile() {
  return findFile("vendor", path.join(OUTPUT_PATH, "assets", "vendor*.js"));
}

function findHTMLFile() {
  return findFile('html', path.join(OUTPUT_PATH, 'index*.html'));
}

function findFile(name, globPath) {
  var glob = require('glob');
  var files = glob.sync(globPath);

  assert("Found " + files.length + " " + name + " files (expected 1) when globbing '" + globPath + "'.", files.length === 1);

  return files[0];
}

function ensureEnvVars() {
  var requiredEnvs = ['APP_NAME', 'S3_BUCKET', 'S3_KEY'];

  requiredEnvs.forEach(function(name) {
    if (!process.env['FASTBOOT_' + name]) {
      log("Couldn't find required environment variable FASTBOOT_" + name);
      process.exit(1);
    }
  });
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

