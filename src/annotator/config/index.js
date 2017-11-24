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
    // URL where client assets are served from. Used when injecting the client
    // into child iframes.
    assetRoot: settings.hostPageSetting('assetRoot', {allowInBrowserExt: true}),
    branding: settings.hostPageSetting('branding'),
    // URL of the client's boot script. Used when injecting the client into
    // child iframes.
    clientUrl: settings.clientUrl,
    disableToolbarCloseBtn:settings.hostPageSetting('disableToolbarCloseBtn', {defaultValue: true}),
    disableToolbarMinimizeBtn: settings.hostPageSetting('disableToolbarMinimizeBtn'),
    disableToolbarHighlightsBtn: settings.hostPageSetting('disableToolbarHighlightsBtn'),
    disableToolbarNewNoteBtn: settings.hostPageSetting('disableToolbarNewNoteBtn'),
    disableBucketBar: settings.hostPageSetting('disableBucketBar'),
    enableCleanOnboardingTheme: settings.hostPageSetting('enableCleanOnboardingTheme'),
    enableExperimentalNewNoteButton: settings.hostPageSetting('enableExperimentalNewNoteButton'),
    enableSidebarDropShadow: settings.hostPageSetting('enableSidebarDropShadow'),
    theme: settings.hostPageSetting('theme'),
    usernameUrl: settings.hostPageSetting('usernameUrl'),
    onLayoutChange: settings.hostPageSetting('onLayoutChange'),
    openSidebar: settings.hostPageSetting('openSidebar', {allowInBrowserExt: true}),
    query: settings.query,
    services: settings.hostPageSetting('services'),
    showHighlights: settings.showHighlights,
    sidebarAppUrl: settings.sidebarAppUrl,
    // Subframe identifier given when a frame is being embedded into
    // by a top level client
    subFrameIdentifier: settings.hostPageSetting('subFrameIdentifier', {allowInBrowserExt: true}),
  };
}

module.exports = configFrom;
