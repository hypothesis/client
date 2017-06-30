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
    sidebarAppUrl: settings.sidebarAppUrl,
    query: settings.query,
    annotations: settings.annotations,
    showHighlights: settings.showHighlights,
    openLoginForm: settings.hostPageSetting('openLoginForm', {allowInBrowserExt: true}),
    openSidebar: settings.hostPageSetting('openSidebar', {allowInBrowserExt: true}),
    branding: settings.hostPageSetting('branding'),
    services: settings.hostPageSetting('services'),

    // Needed by the multi-frame feature for now
    enableMultiFrameSupport: settings.hostPageSetting('enableMultiFrameSupport'),
    embedScriptUrl: settings.hostPageSetting('embedScriptUrl'),
    subFrameIdentifier: settings.hostPageSetting('subFrameIdentifier'),

    // Temporary feature flag override for 1st-party OAuth
    oauthEnabled: settings.hostPageSetting('oauthEnabled'),
  };
}

module.exports = configFrom;
