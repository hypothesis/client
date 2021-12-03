'use strict';

const { readFileSync } = require('fs');

const express = require('express');
const log = require('fancy-log');

const { createServer, useSsl } = require('./create-server');
const { version } = require('../package.json');

/**
 * An express server which serves the contents of the package.
 *
 * The server mirrors the URL structure of cdn.hypothes.is, an S3-backed domain
 * which serves the client's assets in production.
 *
 * When developing the client, the Hypothesis service should be configured to
 * use the URL of this service as the client URL, so that the boot script is
 * returned by the service's '/embed.js' route and included in the '/app.html'
 * app.
 */
function servePackage(port) {
  const app = express();

  // Enable CORS for assets so that cross-origin font loading works.
  app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', '*');
    res.append('Access-Control-Allow-Methods', 'GET');
    next();
  });

  const serveBootScript = function (req, res) {
    const entryPath = require.resolve('../');
    const entryScript = readFileSync(entryPath).toString('utf-8');
    res.append('Content-Type', 'application/javascript; charset=utf-8');
    res.send(entryScript);
  };

  // Set up URLs which serve the boot script and package content, mirroring
  // cdn.hypothes.is' structure.
  app.get('/hypothesis', serveBootScript);
  app.get(`/hypothesis/${version}`, serveBootScript);
  app.use(`/hypothesis/${version}/`, express.static('.'));

  createServer(app).listen(port, () => {
    const scheme = useSsl ? 'https' : 'http';
    log(`Package served at ${scheme}://localhost:${port}/hypothesis`);
  });
}

module.exports = servePackage;
