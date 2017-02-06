'use strict';

// This is the main entry point for the Hypothesis client in the host page
// and the sidebar application.

/* global __MANIFEST__ */

var boot = require('./boot');

// The HYP* properties are set (if at all) by the service which is serving the
// Hypothesis client to tell it where to load the sidebar and assets from.
var appHtmlUrl = window.__HYP_APP_HTML_URL__ || 'https://hypothes.is/app.html';
var assetRoot = window.__HYP_CLIENT_ASSET_ROOT__ || 'https://hypothes.is/assets/client/';

boot(document, {
  appHtmlUrl: appHtmlUrl,
  assetRoot: assetRoot,
  manifest: __MANIFEST__,  // Replaced by build script
});
