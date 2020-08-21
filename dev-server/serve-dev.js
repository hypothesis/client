'use strict';
/* eslint-env node */

const fs = require('fs');
const path = require('path');

const express = require('express');
const log = require('fancy-log');
const mustacheExpress = require('mustache-express');
const Mustache = require('mustache');

const { createServer, useSsl } = require('./create-server');

const HTML_PATH = `${__dirname}/documents/html/`;
const PDF_PATH = `${__dirname}/documents/pdf/`;
const TEMPLATE_PATH = `${__dirname}/templates/`;

/**
 * @typedef Config
 * @property {string} clientUrl - The URL of the client's boot script
 */

/**
 * Generate `<script>` content for client configuration and injection
 *
 * @param {string} clientUrl
 * @return {string}
 */
function renderConfig(clientUrl) {
  const scriptTemplate = fs.readFileSync(
    `${TEMPLATE_PATH}client-config.js.mustache`,
    'utf-8'
  );
  return Mustache.render(scriptTemplate, { clientUrl });
}

/**
 * Build context for rendering templates in the defined views directory. This
 * is dead simple at present but could be extended as needs grow.
 *
 * @param {Config} config
 */
function templateContext(config) {
  return {
    hypothesisScript: renderConfig(config.clientUrl),
  };
}

/**
 * An HTTP server which serves test documents with the development client embedded.
 *
 * @param {number} port - The port that the test server should listen on.
 * @param {Config} config - Config for the server
 */
function serveDev(port, config) {
  const app = express();

  app.engine('mustache', mustacheExpress());
  app.set('view engine', 'mustache');
  app.set('views', [HTML_PATH, path.join(__dirname, '/templates')]);

  app.use(express.static(path.join(__dirname, 'static')));

  // Serve static PDF files out of the PDF directory, but serve under
  // `/pdf-source/` — these are needed by PDF JS viewer
  app.use('/pdf-source', express.static(PDF_PATH));

  // Enable CORS for assets so that cross-origin font loading works.
  app.use(function (req, res, next) {
    res.append('Access-Control-Allow-Origin', '*');
    res.append('Access-Control-Allow-Methods', 'GET');
    next();
  });

  // Landing page
  app.get('/', (req, res) => {
    res.render('index', templateContext(config));
  });

  // Serve HTML documents with injected client script
  app.get('/document/:document', (req, res, next) => {
    if (fs.existsSync(`${HTML_PATH}${req.params.document}.mustache`)) {
      res.render(req.params.document, templateContext(config));
    } else {
      next();
    }
  });

  // Serve PDF documents with PDFJS viewer and client script
  app.get('/pdf/:pdf', (req, res, next) => {
    if (fs.existsSync(`${PDF_PATH}${req.params.pdf}.pdf`)) {
      const fullUrl = `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
      res.render('pdfjs-viewer', {
        documentUrl: fullUrl, // The URL that annotations are associated with
        url: `/pdf-source/${req.params.pdf}.pdf`, // The URL for the PDF source file
        clientUrl: config.clientUrl,
      });
    } else {
      next();
    }
  });

  // Nothing else matches: this is a 404
  app.use((req, res) => {
    res.render('404', templateContext(config));
  });

  createServer(app).listen(port, () => {
    const scheme = useSsl ? 'https' : 'http';
    log(`Dev web server started at ${scheme}://localhost:${port}/`);
  });
}

module.exports = serveDev;
