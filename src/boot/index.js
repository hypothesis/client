'use strict';

// This is the main entry point for the Hypothesis client in the host page
// and the sidebar application.
//
// The same boot script is used for both entry points so that the browser
// already has it cached when it encounters the reference in the sidebar
// application.

/* global __MANIFEST__ */

var boot = require('./boot');
var settings = require('../shared/settings')(document);

// The `sidebarAppUrl` and `assetRoot` settings are set by the service which is
// serving the Hypothesis client to tell it where to load the sidebar and assets
// from.

var defaultAssetRoot = 'https://unpkg.com/hypothesis@__VERSION__/';

boot(document, {
  assetRoot: settings.assetRoot || defaultAssetRoot,
  manifest: __MANIFEST__,  // Replaced by build script
  sidebarAppUrl: settings.sidebarAppUrl || 'https://hypothes.is/app.html',
});
