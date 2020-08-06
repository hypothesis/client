'use strict';

const fs = require('fs');
const log = require('fancy-log');
const urlParser = require('url');
const Mustache = require('mustache');

const { createServer, useSsl } = require('./create-server');

const DOCUMENT_PATH = './test-documents/';
const DOCUMENT_PATTERN = /\.html\.mustache/;

/**
 * Render some content in an HTML document with `<pre>` tags
 *
 * @param {string} filename - source to inject between `<pre>` tags
 * @return {string}
 */
function preformattedContent(filename) {
  const textContent = fs.readFileSync(filename, 'utf-8');
  const template = fs.readFileSync(
    `${DOCUMENT_PATH}preformatted.template.mustache`,
    'utf-8'
  );
  return Mustache.render(template, { textContent });
}

/**
 * Generate `<script>` content for client configuration and injection
 *
 * @param {string} clientUrl
 * @return {string}
 */
function renderConfig(clientUrl) {
  const scriptTemplate = fs.readFileSync(
    `${DOCUMENT_PATH}client-config.js.mustache`,
    'utf-8'
  );
  return Mustache.render(scriptTemplate, { clientUrl });
}

/**
 * Read in the file at `filename` and render it as a template, injecting
 * script source for the embedded client.
 *
 * @param {string} filename
 * @param {string} clientUrl
 * @param [{Object}] context - optional extra view context
 * @return {string} Rendered HTML template with injected script
 */
function injectClientScript(filename, clientUrl, context = {}) {
  const documentTemplate = fs.readFileSync(filename, 'utf-8');
  const scriptContent = renderConfig(clientUrl);
  context = { ...context, hypothesisScript: scriptContent };
  return Mustache.render(documentTemplate, context);
}

/**
 * Provide a "route" for all HTML documents in the test-documents directory
 *
 * @return {Object<string, string>} - Routes, mapping route (path) to
 *                                    filepath of HTML document
 */
function buildDocumentRoutes() {
  const documentRoutes = {};
  const documentPaths = fs
    .readdirSync(DOCUMENT_PATH)
    .filter(filename => filename.match(DOCUMENT_PATTERN));
  documentPaths.forEach(filename => {
    const shortName = filename.replace(DOCUMENT_PATTERN, '');
    documentRoutes[`/document/${shortName}`] = `${DOCUMENT_PATH}${filename}`;
  });
  return documentRoutes;
}

/**
 * @typedef Config
 * @property {string} clientUrl - The URL of the client's boot script
 */

/**
 * An HTTP server which serves a test page with the development client embedded.
 *
 * @param {number} port - The port that the test server should listen on.
 * @param {Config} config - Config for the server
 *
 * @constructor
 */
function DevServer(port, config) {
  const documentRoutes = buildDocumentRoutes();
  const preformattedRoutes = {
    '/document/code_of_conduct': './CODE_OF_CONDUCT',
    '/document/license': './LICENSE',
  };

  function listen() {
    const app = function (req, response) {
      const url = urlParser.parse(req.url);
      let content;

      if (documentRoutes[url.pathname]) {
        content = injectClientScript(
          documentRoutes[url.pathname],
          config.clientUrl
        );
      } else if (preformattedRoutes[url.pathname]) {
        content = preformattedContent(preformattedRoutes[url.pathname]);
      } else {
        content = injectClientScript(
          `${DOCUMENT_PATH}index.template.mustache`,
          config.clientUrl,
          { readme: fs.readFileSync('./README.md', 'utf-8') }
        );
      }
      response.end(content);
    };

    const server = createServer(app);
    server.listen(port, function (err) {
      if (err) {
        log('Setting up dev server failed', err);
      }
      const scheme = useSsl ? 'https' : 'http';
      log(`Dev server listening at ${scheme}://localhost:${port}/`);
    });
  }

  listen();
}

module.exports = DevServer;
