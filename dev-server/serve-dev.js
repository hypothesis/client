/* eslint-env node */
import express from 'express';
import log from 'fancy-log';
import Mustache from 'mustache';
import mustacheExpress from 'mustache-express';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServer, useSsl } from './create-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_PATH = `${__dirname}/documents/html/`;
const PDF_PATH = `${__dirname}/documents/pdf/`;
const TEMPLATE_PATH = `${__dirname}/templates/`;

/**
 * @typedef Config
 * @prop {string} clientUrl - The URL of the client's boot script
 * @prop {object} clientConfig - Additional configuration for the Hypothesis client
 */

/**
 * Render client config and script embed
 *
 * @param {object} context
 */
function renderScript(context) {
  const scriptTemplate = `
    {{{hypothesisConfig}}}

    <script src="/scripts/util.js"></script>
    <script>
      (function(){
        let clientUrl = '{{{clientUrl}}}'.replace('{current_host}', document.location.hostname);
        loadClient(clientUrl);
      })();
    </script>
  `;
  return Mustache.render(scriptTemplate, context);
}

/**
 * Read tags in test pages specifying custom headers to serve the content with.
 *
 * These tags look like `<!-- Header: <Key>: <Value> -->`.
 *
 * @param {string} content
 * @return {[key: string, value: string][]}
 */
function readCustomHeaderTags(content) {
  return content
    .split('\n')
    .map(line => {
      const keyValue = line.match(/<!--\s*Header:\s*([A-Za-z-]+):(.*)-->/);
      if (!keyValue) {
        return null;
      }
      return [keyValue[1], keyValue[2]];
    })
    .filter(kv => kv !== null);
}

/**
 * Build context for rendering templates in the defined views directory.
 *
 * @param {Config} config
 */
function templateContext(config) {
  // Just the config by itself, in contrast with `hypothesisScript`, which
  // combines this config with a <script> that adds the embed script
  const configTemplate = fs.readFileSync(
    `${TEMPLATE_PATH}client-config.js.mustache`,
    'utf-8',
  );
  const hypothesisConfig = Mustache.render(configTemplate, {
    exampleConfig: config.clientConfig
      ? JSON.stringify(config.clientConfig)
      : null,
  });

  return {
    hypothesisConfig,
    hypothesisScript: renderScript({
      hypothesisConfig,
      clientUrl: config.clientUrl,
    }),
  };
}

/**
 * An HTTP server which serves test documents with the development client embedded.
 *
 * @param {number} port - The port that the test server should listen on.
 * @param {Config} config - Config for the server
 */
export function serveDev(port, config) {
  const app = express();

  app.engine('mustache', mustacheExpress());

  // Disable template caching.
  // See https://github.com/bryanburgers/node-mustache-express/issues/13.
  app.disable('view cache');

  app.set('view engine', 'mustache');
  app.set('views', [HTML_PATH, path.join(__dirname, '/templates')]);

  app.use(express.static(path.join(__dirname, 'static')));

  // Serve static PDF files out of the PDF directory, but serve under
  // `/pdf-source/` — these are needed by PDF JS viewer
  app.use('/pdf-source', express.static(PDF_PATH));

  // Enable CORS for assets so that cross-origin font loading works.
  app.use((req, res, next) => {
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
    const path = `${HTML_PATH}${req.params.document}.mustache`;
    if (fs.existsSync(path)) {
      const content = fs.readFileSync(path, 'utf8');
      const headers = readCustomHeaderTags(content);
      for (const [key, value] of headers) {
        res.set(key, value);
      }
      res.render(req.params.document, templateContext(config));
    } else {
      next();
    }
  });

  // Serve PDF documents with PDFJS viewer and client script.
  //
  // The optional suffix allows the same PDF to be accessed at different URLs.
  // This is helpful for testing that annotations/real-time updates etc. work
  // based on the document fingerprint as well as the URL.
  app.get('/pdf/:pdf{/:suffix}', (req, res, next) => {
    const pdfPath = `${PDF_PATH}${req.params.pdf}.pdf`;

    if (fs.existsSync(pdfPath)) {
      const relativeSourceUrl = `/pdf-source/${req.params.pdf}.pdf`;
      const suffix = req.params.suffix ? `?suffix=${req.params.suffix}` : '';
      const fullUrl = `${req.protocol}://${req.hostname}:${port}${req.originalUrl}${suffix}`;

      // Read custom client configuration for this test document.
      const configPath = pdfPath.replace(/\.pdf$/, '.config.json');
      const extraConfig = fs.existsSync(configPath)
        ? JSON.parse(fs.readFileSync(configPath))
        : {};

      const context = templateContext({
        ...config,
        ...extraConfig,
      });

      res.render('pdfjs-viewer', {
        ...context,
        clientUrl: config.clientUrl, // URL to embed source
        documentUrl: fullUrl, // The URL that annotations are associated with
        url: relativeSourceUrl, // The URL for the PDF source file
      });
    } else {
      next();
    }
  });

  // Serve UI component playground
  app.get('/ui-playground{/:path}', (req, res) => {
    res.render('ui-playground', {
      resourceRoot:
        'http://localhost:3001/hypothesis/1.0.0-dummy-version/build',
    });
  });

  // Nothing else matches: this is a 404
  app.use((req, res) => {
    res.render('404', templateContext(config));
  });

  createServer(app).listen(port, () => {
    const scheme = useSsl ? 'https' : 'http';
    if (port === 3000) {
      log(`Primary web server started at ${scheme}://localhost:${port}/`);
    } else {
      log(`Alternate web server started at ${scheme}://localhost:${port}/`);
    }
  });
}
