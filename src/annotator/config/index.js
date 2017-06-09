'use strict';

var settingsFrom = require('./settings');
var sharedSettings = require('../../shared/settings');
var isBrowserExtension = require('./is-browser-extension');
var configFuncSettingsFrom = require('./config-func-settings-from');

/**
 * Reads the Hypothesis configuration from the environment.
 *
 * @param {Window} window_ - The Window object to read config from.
 */
function configFrom(window_) {
  var settings = settingsFrom(window_);

  var config = {
    app: settings.app,

    // Extract the default annotation ID or query from the URL.
    //
    // The Chrome extension or proxy may already have provided this config via
    // a tag injected into the DOM, which avoids the problem where the page's
    // JS rewrites the URL before Hypothesis loads.
    //
    // In environments where the config has not been injected into the DOM,
    // we try to retrieve it from the URL here.
    query: settings.query,
    annotations: settings.annotations,
  };

  if (isBrowserExtension(config.app)) {
    return config;
  }

  Object.assign(config, sharedSettings.jsonConfigsFrom(window_.document));
  Object.assign(config, configFuncSettingsFrom(window_));

  // Convert legacy keys/values in config to corresponding current
  // configuration.
  if (typeof config.showHighlights === 'boolean') {
    config.showHighlights = config.showHighlights ? 'always' : 'never';
  }

  return config;
}

module.exports = configFrom;
