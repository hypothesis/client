'use strict';

var settings = require('./settings');
var sharedSettings = require('../../shared/settings');

/**
 * Reads the Hypothesis configuration from the environment.
 *
 * @param {Window} window_ - The Window object to read config from.
 */
function configFrom(window_) {
  var config = {};

  config.app = settings.iFrameSrc(window_.document);

  // Parse config from `<script class="js-hypothesis-config">` tags
  try {
    Object.assign(config, sharedSettings.jsonConfigsFrom(window_.document));
  } catch (err) {
    console.warn('Could not parse settings from js-hypothesis-config tags',
      err);
  }

  Object.assign(config, settings.configFuncSettingsFrom(window_));

  // Convert legacy keys/values in config to corresponding current
  // configuration.
  if (typeof config.showHighlights === 'boolean') {
    config.showHighlights = config.showHighlights ? 'always' : 'never';
  }

  // Extract the default annotation ID or query from the URL.
  //
  // The Chrome extension or proxy may already have provided this config
  // via a tag injected into the DOM, which avoids the problem where the page's
  // JS rewrites the URL before Hypothesis loads.
  //
  // In environments where the config has not been injected into the DOM,
  // we try to retrieve it from the URL here.
  config.query = settings.query(window_.location.href);
  config.annotations = settings.annotations(window_.location.href);

  return config;
}

module.exports = configFrom;
