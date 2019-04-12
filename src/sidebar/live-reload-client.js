'use strict';

/* eslint no-console: "off" */

const queryString = require('query-string');

const Socket = require('./websocket');

/**
 * Return a URL with a cache-busting query string parameter added.
 *
 * @param {string} url - The original asset URL
 * @return {string} The URL with a cache-buster added.
 */
function cacheBustURL(url) {
  let newUrl = url;
  const cacheBuster = queryString.parse({ timestamp: Date.now() });
  if (url.indexOf('?') !== -1) {
    newUrl += '&' + cacheBuster;
  } else {
    newUrl += '?' + cacheBuster;
  }
  return newUrl;
}

/**
 * Return true if a URL matches a list of paths of modified assets.
 *
 * @param {string} url - The URL of the stylesheet, script or other resource.
 * @param {Array<string>} changed - List of paths of modified assets.
 */
function didAssetChange(url, changed) {
  return changed.some(function(path) {
    return url.indexOf(path) !== -1;
  });
}

/**
 * Reload a stylesheet or media element if it references a file
 * in a list of changed assets.
 *
 * @param {Element} element - An HTML <link> tag or media element.
 * @param {Array<string>} changed - List of paths of modified assets.
 */
function maybeReloadElement(element, changed) {
  const parentElement = element.parentNode;
  const newElement = element.cloneNode();
  const srcKeys = ['href', 'src'];
  srcKeys.forEach(function(key) {
    if (key in element && didAssetChange(element[key], changed)) {
      newElement[key] = cacheBustURL(element[key]);
    }
  });
  parentElement.replaceChild(newElement, element);
}

function reloadExternalStyleSheets(changed) {
  const linkTags = [].slice.apply(document.querySelectorAll('link'));
  linkTags.forEach(function(tag) {
    maybeReloadElement(tag, changed);
  });
}

/**
 * Connect to the live-reload server at @p url.
 *
 * @param {string} url - The URL of the live reload server. If undefined,
 *                       the 'livereloadserver' query string parameter is
 *                       used.
 */
function connect(url) {
  const conn = new Socket(url);
  conn.on('open', function() {
    console.log('Live reload client listening');
  });
  conn.on('message', function(event) {
    const message = JSON.parse(event.data);
    if (message.type === 'assets-changed') {
      const scriptsOrTemplatesChanged = message.changed.some(function(path) {
        return path.match(/\.(html|js)$/);
      });
      const stylesChanged = message.changed.some(function(path) {
        return path.match(/\.css$/);
      });
      if (scriptsOrTemplatesChanged) {
        // Ask the host page to reload the client (eg. by reloading itself).
        window.top.postMessage({ type: 'reloadrequest' }, '*');
        return;
      }
      if (stylesChanged) {
        reloadExternalStyleSheets(message.changed);
      }
    }
  });
  conn.on('error', function(err) {
    console.error('Error connecting to live reload server:', err);
  });
}

module.exports = {
  connect: connect,
};
