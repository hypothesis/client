'use strict';

const getApiUrl = require('../get-api-url');
const hostConfig = require('../host-config');
const postMessageJsonRpc = require('./postmessage-json-rpc');

function ancestors(window_) {
  if (window_ === window_.top) {
    return [];
  }

  // nb. The top window's `parent` is itself!
  const ancestors = [];
  do {
    window_ = window_.parent;
    ancestors.push(window_);
  } while (window_ !== window_.top);

  return ancestors;
}

/**
 * Fetch client configuration from an ancestor frame.
 *
 * @param {string} origin - The origin of the frame to fetch config from.
 * @param {Window} window_ - Test seam.
 * @return {Promise<any>}
 */
function fetchConfigFromAncestorFrame(origin, window_ = window) {
  const configResponses = [];

  for (let ancestor of ancestors(window_)) {
    const timeout = 3000;
    const result = postMessageJsonRpc.call(
      ancestor,
      origin,
      'requestConfig',
      timeout
    );
    configResponses.push(result);
  }

  if (configResponses.length === 0) {
    configResponses.push(Promise.reject(new Error('Client is top frame')));
  }

  return Promise.race(configResponses);
}

/**
 * Merge client configuration from h service with config fetched from
 * embedding frame.
 *
 * Typically the configuration from the embedding frame is passed
 * synchronously in the query string. However it can also be retrieved from
 * an ancestor of the embedding frame. See tests for more details.
 *
 * @param {Object} appConfig - Settings rendered into `app.html` by the h service.
 * @param {Window} window_ - Test seam.
 * @return {Promise<Object>} - The merged settings.
 */
function fetchConfig(appConfig, window_ = window) {
  const hostPageConfig = hostConfig(window_);

  let embedderConfig;
  if (hostPageConfig.requestConfigFromFrame) {
    const origin = hostPageConfig.requestConfigFromFrame;
    embedderConfig = fetchConfigFromAncestorFrame(origin, window_);
  } else {
    embedderConfig = Promise.resolve(hostPageConfig);
  }

  return embedderConfig.then(embedderConfig => {
    const mergedConfig = Object.assign({}, appConfig, embedderConfig);
    mergedConfig.apiUrl = getApiUrl(mergedConfig);
    return mergedConfig;
  });
}

module.exports = {
  fetchConfig,
};
