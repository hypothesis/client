// This is the main entry point for the Hypothesis client in the host page
// and the sidebar application.
//
// The same boot script is used for both entry points so that the browser
// already has it cached when it encounters the reference in the sidebar
// application.

import { parseJsonConfig } from './parse-json-config';

import { bootHypothesisClient, bootSidebarApp } from './boot';
import processUrlTemplate from './url-template';
import { isBrowserSupported } from './browser-check';

// @ts-ignore - This file is generated before the boot bundle is built.
import manifest from '../../build/manifest.json';

if (isBrowserSupported()) {
  const settings = parseJsonConfig(document);
  const assetRoot = processUrlTemplate(settings.assetRoot || '__ASSET_ROOT__');

  // Check whether this is the sidebar app (indicated by the presence of a
  // `<hypothesis-app>` element) and load the appropriate part of the client.
  if (document.querySelector('hypothesis-app')) {
    bootSidebarApp(document, { assetRoot, manifest, apiUrl: settings.apiUrl });
  } else {
    const notebookAppUrl = processUrlTemplate(
      settings.notebookAppUrl || '__NOTEBOOK_APP_URL__'
    );
    const sidebarAppUrl = processUrlTemplate(
      settings.sidebarAppUrl || '__SIDEBAR_APP_URL__'
    );
    bootHypothesisClient(document, {
      assetRoot,
      manifest,
      notebookAppUrl,
      sidebarAppUrl,
    });
  }
} else {
  // Show a "quiet" warning to avoid being disruptive on non-Hypothesis sites
  // that embed the client.
  //
  // In Via or when using the bookmarklet we could show something louder.
  console.warn(
    'The Hypothesis annotation tool is not supported in this browser. See https://web.hypothes.is/help/which-browsers-are-supported-by-hypothesis/.'
  );
}
