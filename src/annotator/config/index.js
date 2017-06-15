'use strict';

var settingsFrom = require('./settings');

/**
 * Reads the Hypothesis configuration from the environment.
 *
 * @param {Window} window_ - The Window object to read config from.
 */
function configFrom(window_) {
  var settings = settingsFrom(window_);

  var config = {
    app: settings.app,
    query: settings.query,
    annotations: settings.annotations,
    openLoginForm: settings.hostPageSetting('openLoginForm', {allowInBrowserExt: true}),
    openSidebar: settings.hostPageSetting('openSidebar', {allowInBrowserExt: true}),
    showHighlights: settings.hostPageSetting('showHighlights'),
    branding: settings.hostPageSetting('branding'),
    services: settings.hostPageSetting('services'),
  };

  // Convert legacy keys/values in config to corresponding current
  // configuration.
  if (typeof config.showHighlights === 'boolean') {
    config.showHighlights = config.showHighlights ? 'always' : 'never';
  }

  return config;
}

module.exports = configFrom;
