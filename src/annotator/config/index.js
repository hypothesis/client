'use strict';

var settings = require('./settings');
var sharedSettings = require('../../shared/settings');

/**
 * Reads the Hypothesis configuration from the environment.
 *
 * @param {Window} window_ - The Window object to read config from.
 */
function configFrom(window_) {
  var config = {
    app: settings.app(window_.document),
  };

  var chromeExt = 'chrome-extension://';
  var mozExt = 'moz-extension://';
  var edgeExt = 'ms-browser-extension://';

  // Extract the default annotation ID or query from the URL.
  //
  // The Chrome extension or proxy may already have provided this config
  // via a tag injected into the DOM, which avoids the problem where the page's
  // JS rewrites the URL before Hypothesis loads.
  //
  // In environments where the config has not been injected into the DOM,
  // we try to retrieve it from the URL here.
  var query = settings.query(window_.location.href);
  if (query) {
    config.query = query;
  } else {
    var annotations = settings.annotations(window_.location.href);
    if (annotations) {
      config.annotations = annotations;
    }
  }

  // If the client is injected by the browser extension, ignore
  // the rest of the host page config.
  if (config.app.indexOf(chromeExt) === 0 ||
    config.app.indexOf(mozExt) === 0||
    config.app.indexOf(edgeExt) === 0) {
    return config;
  }

  Object.assign(config, sharedSettings.jsonConfigsFrom(window_.document));
  Object.assign(config, settings.configFuncSettingsFrom(window_));

  // Convert legacy keys/values in config to corresponding current
  // configuration.
  if (typeof config.showHighlights === 'boolean') {
    config.showHighlights = config.showHighlights ? 'always' : 'never';
  }

  return config;
}

module.exports = configFrom;
