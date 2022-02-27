import { requiredPolyfillSets } from './polyfills';

/** @typedef {import('./polyfills').PolyfillSet} PolyfillSet */

/**
 * Polyfills used by both the annotator and sidebar app.
 */
const commonPolyfills = /** @type {PolyfillSet[]} */ ([
  // ES APIs
  'es2017',
  'es2018',

  // Any other polyfills which may rely on certain ES APIs should be listed here.
]);

/**
 * @typedef SidebarAppConfig
 * @prop {string} assetRoot - The root URL to which URLs in `manifest` are relative
 * @prop {Record<string,string>} manifest -
 *   A mapping from canonical asset path to cache-busted asset path
 * @prop {string} apiUrl
 */

/**
 * @typedef AnnotatorConfig
 * @prop {string} assetRoot - The root URL to which URLs in `manifest` are relative
 * @prop {string} notebookAppUrl - The URL of the sidebar's notebook
 * @prop {string} sidebarAppUrl - The URL of the sidebar's HTML page
 * @prop {Record<string,string>} manifest -
 *   A mapping from canonical asset path to cache-busted asset path
 */

/**
 * @typedef {Window & { PDFViewerApplication?: object }} MaybePDFWindow
 */

/**
 * Mark an element as having been added by the boot script.
 *
 * This marker is later used to know which elements to remove when unloading
 * the client.
 *
 * @param {HTMLElement} el
 */
function tagElement(el) {
  el.setAttribute('data-hypothesis-asset', '');
}

/**
 * @param {Document} doc
 * @param {string} href
 */
function injectStylesheet(doc, href) {
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = href;

  tagElement(link);
  doc.head.appendChild(link);
}

/**
 * @param {Document} doc
 * @param {string} src - The script URL
 * @param {boolean} forceReload - Whether to force re-evaluation of the script,
 *   in case it has been loaded in the same document previously.
 */
function injectScript(doc, src, forceReload = false) {
  const script = doc.createElement('script');
  script.type = 'module';

  if (forceReload) {
    // Module scripts are only evaluated once per URL in a document. Adding
    // a dynamic fragment forces re-evaluation without breaking browser or CDN
    // caching of the script, as a query string would do.
    //
    // See examples in https://html.spec.whatwg.org/multipage/webappapis.html#integration-with-the-javascript-module-system
    src += `#ts=${Date.now()}`;
  }

  script.src = src;

  // Set 'async' to false to maintain execution order of scripts.
  // See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
  script.async = false;

  tagElement(script);
  doc.head.appendChild(script);
}

/**
 * @param {Document} doc
 * @param {string} rel
 * @param {'html'|'javascript'} type
 * @param {string} url
 */
function injectLink(doc, rel, type, url) {
  const link = doc.createElement('link');
  link.rel = rel;
  link.href = url;
  link.type = `application/annotator+${type}`;

  tagElement(link);
  doc.head.appendChild(link);
}

/**
 * Preload a URL using a `<link rel="preload" as="<type>" ...>` element
 *
 * This can be used to preload an API request or other resource which we know
 * that the client will load.
 *
 * @param {Document} doc
 * @param {string} type - Type of resource
 * @param {string} url
 */
function preloadURL(doc, type, url) {
  const link = doc.createElement('link');
  link.rel = 'preload';
  link.as = type;
  link.href = url;

  // If this is a resource that we are going to read the contents of, then we
  // need to make a cross-origin request. For other types, use a non cross-origin
  // request which returns a response that is opaque.
  if (type === 'fetch') {
    link.crossOrigin = 'anonymous';
  }

  tagElement(link);
  doc.head.appendChild(link);
}

/**
 * @param {SidebarAppConfig|AnnotatorConfig} config
 * @param {string} path
 */
function assetURL(config, path) {
  return config.assetRoot + 'build/' + config.manifest[path];
}

/**
 * @param {Document} doc
 * @param {SidebarAppConfig|AnnotatorConfig} config
 * @param {string[]} assets
 * @param {object} options
 *   @param {boolean} [options.forceModuleReload]
 */
function injectAssets(doc, config, assets, { forceModuleReload } = {}) {
  assets.forEach(path => {
    const url = assetURL(config, path);
    if (url.match(/\.css/)) {
      injectStylesheet(doc, url);
    } else {
      injectScript(doc, url, forceModuleReload);
    }
  });
}

/** @param {PolyfillSet[]} needed */
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
  injectLink(doc, 'sidebar', 'html', config.sidebarAppUrl);

  // Register the URL of the notebook app which the Hypothesis client should load.
  injectLink(doc, 'notebook', 'html', config.notebookAppUrl);

  // Preload the styles used by the shadow roots of annotator UI elements.
  preloadURL(doc, 'style', assetURL(config, 'styles/annotator.css'));

  // Register the URL of the annotation client which is currently being used to drive
  // annotation interactions.
  injectLink(
    doc,
    'hypothesis-client',
    'javascript',
    config.assetRoot + 'build/boot.js'
  );

  const polyfills = polyfillBundles(commonPolyfills);

  // Override styling in certain document viewers.
  const viewerStyles = [];
  if (
    /** @type {MaybePDFWindow} */ (window).PDFViewerApplication !== undefined
  ) {
    viewerStyles.push('styles/pdfjs-overrides.css');
  }

  injectAssets(
    doc,
    config,
    [
      ...polyfills,
      ...viewerStyles,

      'scripts/annotator.bundle.js',
      'styles/highlights.css',
    ],

    // Force re-evaluation of JS module scripts, so that the annotator entry
    // point code gets re-run if the client is unloaded and later re-loaded.
    { forceModuleReload: true }
  );
}

/**
 * Bootstrap the sidebar application which displays annotations.
 *
 * @param {Document} doc
 * @param {SidebarAppConfig} config
 */
export function bootSidebarApp(doc, config) {
  // Preload `/api/` and `/api/links` API responses.
  preloadURL(doc, 'fetch', config.apiUrl);
  preloadURL(doc, 'fetch', config.apiUrl + 'links');

  const polyfills = polyfillBundles(commonPolyfills);

  injectAssets(doc, config, [
    ...polyfills,

    'scripts/sidebar.bundle.js',

    'styles/katex.min.css',
    'styles/sidebar.css',
  ]);
}
