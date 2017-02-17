'use strict';

var { readFileSync } = require('fs');

var express = require('express');
var { log } = require('gulp-util');

var { version } = require('../../package.json');

/**
 * An express server which serves the contents of the package.
 *
 * The server behaves similarly to npm CDNs, such as unpkg.com. The
 * '/hypothesis@VERSION' route returns the contents of the package's entry
 * point. Other routes return the contents of the specified file within the
 * package.
 *
 * When developing the client, the Hypothesis service should be configured to
 * use the URL of this service as the client URL, so that the boot script is
 * returned by the service's '/embed.js' route and included in the '/app.html'
 * app.
 */
function servePackage(port) {
  var app = express();

  // Set up redirects which mirror unpkg's behavior
  app.get('/hypothesis', function (req, res) {
    res.redirect(302, `/hypothesis@${version}`);
  });

  app.get('/hypothesis/*', function (req, res) {
    var path = req.path.replace('/hypothesis/', '');
    res.redirect(302, `/hypothesis@${version}/${path}`);
  });

  app.get(`/hypothesis@${version}`, function (req, res) {
    var entryPath = require.resolve('../..');
    var entryScript = readFileSync(entryPath).toString('utf-8');
    res.send(entryScript);
  });

  app.use(`/hypothesis@${version}/`, express.static('.'));

  app.listen(port, function () {
    log(`Package served at http://localhost:${port}`);
  });
}

module.exports = servePackage;
