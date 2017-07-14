'use strict';

var fs = require('fs');
var gulpUtil = require('gulp-util');
var http = require('http');
var WebSocketServer = require('websocket').server;
var urlParser = require('url');

function readmeText() {
  return fs.readFileSync('./README.md', 'utf-8');
}

function licenseText() {
  return fs.readFileSync('./LICENSE', 'utf-8');
}

function changelogText() {
  return fs.readFileSync('./CHANGELOG.md', 'utf-8');
}

/**
 * @typedef Config
 * @property {string} clientUrl - The URL of the client's boot script
 */

/**
 * An HTTP and WebSocket server which enables live reloading of the client.
 *
 * A simple HTTP and WebSocket server
 * which serves a test page with the Hypothesis client embedded
 * and notifies connected clients when assets are modified, enabling
 * the client to live-reload.
 *
 * @param {number} port - The port that the test server should listen on.
 * @param {Config} config - Config for the server
 *
 * @constructor
 */
function LiveReloadServer(port, config) {
  var connections = [];

  function listen() {
    var log = gulpUtil.log;
    var server = http.createServer(function (req, response) {
      var url = urlParser.parse(req.url);
      var content;

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
      } else if (url.pathname === '/document/changelog') {
        content = `
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Hypothesis in-line frame document - Changelog</title>
          </head>
          <body>
            <pre style="margin: 20px;">${changelogText()}</pre>
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
              <iframe id="iframe1" src="/document/license" style="width: 50%;height: 300px;"></iframe>
            </div>
            <div id="iframe2-container" style="margin: 10px 0 0 75px;">
            </div>
            <pre style="margin: 20px 75px 75px 75px;">${readmeText()}</pre>
            <script>
            var appHost = document.location.hostname;

            window.hypothesisConfig = function () {
              return {
                liveReloadServer: 'ws://' + appHost + ':${port}',

                // Open the sidebar when the page loads
                openSidebar: true,
              };
            };

            window.addEventListener('message', function (event) {
              if (event.data.type && event.data.type === 'reloadrequest') {
                window.location.reload();
              }
            });

            var embedScript = document.createElement('script');
            embedScript.src = '${config.clientUrl}';
            document.body.appendChild(embedScript);

            var iframeIsAdded = false;
            var addIframeBtn = document.querySelector('#add-test');
            if(addIframeBtn){
              addIframeBtn.addEventListener('click', function() {
                if (!iframeIsAdded) {
                  var iframe1 = document.querySelector('#iframe1');
                  var iframeNew = iframe1.cloneNode();
                  iframeNew.src = "/document/changelog";
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
    });

    server.listen(port, function (err) {
      if (err) {
        log('Setting up live reload server failed', err);
      }
      log(`Live reload server listening at http://localhost:${port}/`);
    });

    var ws = new WebSocketServer({
      httpServer: server,
    });

    ws.on('request', function (req) {
      log('Live reload client connected');
      var conn = req.accept(null, req.origin);
      connections.push(conn);

      conn.on('close', function () {
        var closedConn = conn;
        connections = connections.filter(function (conn) {
          return conn !== closedConn;
        });
      });
    });
  }

  /**
   * Notify connected clients about assets that changed.
   *
   * @param {Array<string>} assets - A list of paths of assets that changed.
   *                                 Paths are relative to the root asset
   *                                 build directory.
   */
  this.notifyChanged = function (assets) {
    connections.forEach(function (conn) {
      conn.sendUTF(JSON.stringify({
        type: 'assets-changed',
        changed: assets,
      }));
    });
  };

  listen();
}

module.exports = LiveReloadServer;
