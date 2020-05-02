import { requiredPolyfillSets } from '../shared/polyfills';

function injectStylesheet(doc, href) {
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = href;
  doc.head.appendChild(link);
}

function injectScript(doc, src) {
  const script = doc.createElement('script');
  script.type = 'text/javascript';
  script.src = src;

  // Set 'async' to false to maintain execution order of scripts.
  // See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
  script.async = false;
  doc.head.appendChild(script);
}

function injectAssets(doc, config, assets) {
  assets.forEach(function (path) {
    const url = config.assetRoot + 'build/' + config.manifest[path];
    if (url.match(/\.css/)) {
      injectStylesheet(doc, url);
    } else {
      injectScript(doc, url);
    }
  });
}

function polyfillBundles(needed) {
  return requiredPolyfillSets(needed).map(
    set => `scripts/polyfills-${set}.bundle.js`
  );
}

/**
 * Bootstrap the Hypothesis client.
 *
 * This triggers loading of the necessary resources for the client
 */
function bootHypothesisClient(doc, config) {
  // Detect presence of Hypothesis in the page
  const appLinkEl = doc.querySelector(
    'link[type="application/annotator+html"]'
  );
  if (appLinkEl) {
    return;
  }

  // Register the URL of the sidebar app which the Hypothesis client should load.
  // The <link> tag is also used by browser extensions etc. to detect the
  // presence of the Hypothesis client on the page.
  const sidebarUrl = doc.createElement('link');
  sidebarUrl.rel = 'sidebar';
  sidebarUrl.href = config.sidebarAppUrl;
  sidebarUrl.type = 'application/annotator+html';
  doc.head.appendChild(sidebarUrl);

  // Register the URL of the annotation client which is currently being used to drive
  // annotation interactions.
  const clientUrl = doc.createElement('link');
  clientUrl.rel = 'hypothesis-client';
  clientUrl.href = config.assetRoot + 'build/boot.js';
  clientUrl.type = 'application/annotator+javascript';
  doc.head.appendChild(clientUrl);

  const polyfills = polyfillBundles([
    'document.evaluate',
    'es2015',
    'es2016',
    'es2017',
    'es2018',
    'url',
  ]);

  injectAssets(doc, config, [
    // Vendor code and polyfills
    ...polyfills,
    'scripts/jquery.bundle.js',

    // Main entry point for the client
    'scripts/annotator.bundle.js',

    'styles/icomoon.css',
    'styles/annotator.css',
    'styles/pdfjs-overrides.css',
  ]);
}

/**
 * Bootstrap the sidebar application which displays annotations.
 */
function bootSidebarApp(doc, config) {
  const polyfills = polyfillBundles([
    // JS polyfills.
    'es2015',
    'es2016',
    'es2017',
    'string.prototype.normalize',

    // DOM polyfills. These are loaded after the JS polyfills as they may
    // depend upon them, eg. for Promises.
    'fetch',
    'url',
  ]);

  injectAssets(doc, config, [
    ...polyfills,

    // Vendor code required by sidebar.bundle.js
    'scripts/sentry.bundle.js',
    'scripts/katex.bundle.js',
    'scripts/showdown.bundle.js',

    // The sidebar app
    'scripts/sidebar.bundle.js',

    'styles/katex.min.css',
    'styles/sidebar.css',
  ]);
}

export default function boot(document_, config) {
  if (document_.querySelector('hypothesis-app')) {
    bootSidebarApp(document_, config);
  } else {
    bootHypothesisClient(document_, config);
  }
}
