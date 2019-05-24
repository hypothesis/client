// This is the main entry point for the Hypothesis client in the host page
// and the sidebar application.
//
// The same boot script is used for both entry points so that the browser
// already has it cached when it encounters the reference in the sidebar
// application.

// Variables replaced by the build script

/* global __MANIFEST__ */

import { parseJsonConfig } from './parse-json-config';

import boot from './boot';
import processUrlTemplate from './url-template';
import { isBrowserSupported } from './browser-check';

if (isBrowserSupported()) {
  const settings = parseJsonConfig(document);
  // Use the asset root and sidebar app locations specified in the host page,
  // if present. This is used by the Hypothesis browser extensions to make the
  // boot script load assets bundled with the extension.
  let assetRoot;
  if (settings.assetRoot) {
    // The `assetRoot` setting is assumed to point at the root of the contents of
    // the npm package.
    assetRoot = settings.assetRoot + 'build/';
  }
  let sidebarAppUrl = settings.sidebarAppUrl;

  // Otherwise, try to determine the default root URL for assets and the sidebar
  // application from the location where the boot script is hosted.
  try {
    const script = /** @type {HTMLScriptElement} */ (document.currentScript);
    let scriptUrl = new URL(script.src);

    // We only use the bundled sidebar HTML and assets if the boot script has
    // its original name. If the `<script>` tag references a custom name
    // (eg. as in "https://hypothes.is/embed.js") then we skip this and fall
    // back to the URLs embedded in the boot script.
    if (scriptUrl.pathname.endsWith('/boot.js')) {
      assetRoot = assetRoot || new URL('./', scriptUrl).href;
      sidebarAppUrl = sidebarAppUrl || new URL('app.html', scriptUrl).href;
    }
  } catch (e) {
    // IE does not support `document.currentScript` or the URL constructor.
  }

  // Otherwise, fall back to hardcoded default URLs.
  assetRoot = processUrlTemplate(assetRoot || '__ASSET_ROOT__');
  sidebarAppUrl = processUrlTemplate(sidebarAppUrl || '__SIDEBAR_APP_URL__');

  boot(document, {
    assetRoot,
    // @ts-ignore - `__MANIFEST__` is injected by the build script
    manifest: __MANIFEST__,
    sidebarAppUrl,
  });
} else {
  // Show a "quiet" warning to avoid being disruptive on non-Hypothesis sites
  // that embed the client.
  //
  // In Via or when using the bookmarklet we could show something louder.
  console.warn(
    'The Hypothesis annotation tool is not supported in this browser. See https://web.hypothes.is/help/which-browsers-are-supported-by-hypothesis/.'
  );
}
