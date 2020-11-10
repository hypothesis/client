import { requiredPolyfillSets } from './polyfills';

/**
 * Polyfills used by both the annotator and sidebar app.
 */
const commonPolyfills = [
  // ES APIs
  'es2017',
  'es2018',

  // Any other polyfills which may rely on certain ES APIs should be listed here.
];

/**
 * @typedef SidebarAppConfig
 * @prop {string} assetRoot - The root URL to which URLs in `manifest` are relative
 * @prop {Object.<string,string>} manifest -
 *   A mapping from canonical asset path to cache-busted asset path
 */

/**
 * @typedef AnnotatorConfig
 * @prop {string} assetRoot - The root URL to which URLs in `manifest` are relative
 * @prop {string} sidebarAppUrl - The URL of the sidebar's HTML page
 * @prop {Object.<string,string>} manifest -
 *   A mapping from canonical asset path to cache-busted asset path
 */

/**
 * @param {Document} doc
 * @param {string} href
 */
function injectStylesheet(doc, href) {
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = href;
  doc.head.appendChild(link);
}

/**
 * @param {Document} doc
 * @param {string} src - The script URL
 */
function injectScript(doc, src) {
  const script = doc.createElement('script');
  script.type = 'text/javascript';
  script.src = src;

  // Set 'async' to false to maintain execution order of scripts.
  // See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
  script.async = false;
  doc.head.appendChild(script);
}

/**
 * @param {Document} doc
 * @param {SidebarAppConfig|AnnotatorConfig} config
 * @param {string[]} assets
 */
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
 *
 * @param {Document} doc
 * @param {AnnotatorConfig} config
 */
export function bootHypothesisClient(doc, config) {
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

  const polyfills = polyfillBundles(commonPolyfills);

  injectAssets(doc, config, [
    // Vendor code and polyfills
    ...polyfills,

    // Main entry point for the client
    'scripts/annotator.bundle.js',

    'styles/annotator.css',
    'styles/pdfjs-overrides.css',
  ]);
}

/**
 * Bootstrap the sidebar application which displays annotations.
 *
 * @param {Document} doc
 * @param {SidebarAppConfig} config
 */
export function bootSidebarApp(doc, config) {
  const polyfills = polyfillBundles(commonPolyfills);

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
