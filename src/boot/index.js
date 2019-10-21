'use strict';

// This is the main entry point for the Hypothesis client in the host page
// and the sidebar application.
//
// The same boot script is used for both entry points so that the browser
// already has it cached when it encounters the reference in the sidebar
// application.

// Variables replaced by the build script

/* global __MANIFEST__ */

const boot = require('./boot');
const settings = require('../shared/settings').jsonConfigsFrom(document);
const processUrlTemplate = require('./url-template');

boot(document, {
  assetRoot: processUrlTemplate(settings.assetRoot || '__ASSET_ROOT__'),
  manifest: __MANIFEST__,
  sidebarAppUrl: processUrlTemplate(
    settings.sidebarAppUrl || '__SIDEBAR_APP_URL__'
  ),
});
