'use strict';

const fs = require('fs');
const log = require('fancy-log');
const urlParser = require('url');

const { createServer, useSsl } = require('./create-server');

function readmeText() {
  return fs.readFileSync('./README.md', 'utf-8');
}

function licenseText() {
  return fs.readFileSync('./LICENSE', 'utf-8');
}

function codeOfConductText() {
  return fs.readFileSync('./CODE_OF_CONDUCT', 'utf-8');
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
  function listen() {
    const app = function (req, response) {
      const url = urlParser.parse(req.url);
      let content;

      if (url.pathname === '/document/license') {
        content = `
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Hypothesis in-line frame document - License</title>
          </head>
          <body>
            <pre style="margin: 20px;">${licenseText()}</pre>
          </body>
          </html>
        `;
      } else if (url.pathname === '/document/code_of_conduct') {
        content = `
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Hypothesis in-line frame document - Code of conduct</title>
          </head>
          <body>
            <pre style="margin: 20px;">${codeOfConductText()}</pre>
          </body>
          </html>
        `;
      } else {
        content = `
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Hypothesis Client Test</title>
          </head>
          <body>
            <div data-hypothesis-trigger style="margin: 75px 0 0 75px;">
              Number of annotations:
              <span data-hypothesis-annotation-count>...</span>
            </div>
            <div style="margin: 10px 0 0 75px;">
              <button id="add-test" style="padding: 0.6em; font-size: 0.75em">Toggle 2nd Frame</button>
            </div>
            <div style="margin: 10px 0 0 75px;">
              <iframe enable-annotation id="iframe1" src="/document/license" style="width: 50%;height: 300px;"></iframe>
            </div>
            <div id="iframe2-container" style="margin: 10px 0 0 75px;">
            </div>
            <pre style="margin: 20px 75px 75px 75px;">${readmeText()}</pre>
            <script>
            var appHost = document.location.hostname;

            window.hypothesisConfig = function () {
              // See https://h.readthedocs.io/projects/client/en/latest/publishers/config/
              return {
                // enableExperimentalNewNoteButton: true,
                // showHighlights: 'always',
                // theme: 'clean',

                // Example focused user mode
                // focus: {
                //   user: {
                //     username: 'foo',
                //     authority: 'lms',
                //     displayName: 'Foo Bar',
                //   }
                // },
                // Example services config
                // services: [{
                //   apiUrl: 'http://localhost:5000/api',
                //   authority: 'partner.org',
                //   allowLeavingGroups: false,
                //   groups: ['a-group-id', 'another-group-id'],
                // }],

                // Open the sidebar when the page loads
                openSidebar: true,
              };
            };

            var embedScript = document.createElement('script');
            embedScript.src = '${
              config.clientUrl
            }'.replace('{current_host}', document.location.hostname);
            document.body.appendChild(embedScript);

            var iframeIsAdded = false;
            var addIframeBtn = document.querySelector('#add-test');
            if(addIframeBtn){
              addIframeBtn.addEventListener('click', function() {
                if (!iframeIsAdded) {
                  var iframe1 = document.querySelector('#iframe1');
                  var iframeNew = iframe1.cloneNode();
                  iframeNew.src = "/document/code_of_conduct";
                  iframeNew.id = "iframe2";
                  iframeIsAdded = true;
                  document.querySelector('#iframe2-container').appendChild(iframeNew);
                } else {
                  var iframe2 = document.querySelector('#iframe2');
                  iframe2.parentNode.removeChild(iframe2);
                  iframeIsAdded = false;
                }
              });
            }
            </script>
          </body>
          </html>
        `;
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
