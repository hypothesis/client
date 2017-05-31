'use strict';

// This is the main entry point for the Hypothesis client in the host page
// and the sidebar application.
//
// The same boot script is used for both entry points so that the browser
// already has it cached when it encounters the reference in the sidebar
// application.

// Variables replaced by the build script

/* global __MANIFEST__ */

var boot = require('./boot');
var settings = require('../shared/settings').jsonConfigsFrom(document);

boot(document, {
  assetRoot: settings.assetRoot || '__ASSET_ROOT__',
  manifest: __MANIFEST__,
  sidebarAppUrl: settings.sidebarAppUrl || '__SIDEBAR_APP_URL__',
});
