'use strict';

var settingsFrom = require('./settings');

/**
 * Reads the Hypothesis configuration from the environment.
 *
 * @param {Window} window_ - The Window object to read config from.
 */
function configFrom(window_) {
  var settings = settingsFrom(window_);
  return {
    annotations: settings.annotations,
    branding: settings.hostPageSetting('branding'),
    clientUrl: settings.clientUrl,
    services: settings.hostPageSetting('services'),
    showHighlights: settings.showHighlights,
    sidebarAppUrl: settings.sidebarAppUrl,

    // Subframe identifier given when a frame is being embedded into
    // by a top level client
    subFrameIdentifier: settings.hostPageSetting('subFrameIdentifier'),

    openLoginForm: settings.hostPageSetting('openLoginForm', {allowInBrowserExt: true}),
    openSidebar: settings.hostPageSetting('openSidebar', {allowInBrowserExt: true}),
    query: settings.query,

    // Temporary feature flag override for 1st-party OAuth
    oauthEnabled: settings.hostPageSetting('oauthEnabled'),
  };
}

module.exports = configFrom;
