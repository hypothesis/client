export type SidebarAppConfig = {
  /** The root URL to which URLs in `manifest` are relative. */
  assetRoot: string;

  /** A mapping from canonical asset path to cache-busted asset path. */
  manifest: Record<string, string>;
  apiUrl: string;
};

export type AnnotatorConfig = {
  /** The root URL to which URLs in `manifest` are relative. */
  assetRoot: string;
  /** The URL of the sidebar's notebook. */
  notebookAppUrl: string;
  /** The URL of the sidebar's user profile view. */
  profileAppUrl: string;
  /** The URL of the sidebar's HTML page. */
  sidebarAppUrl: string;
  /** A mapping from canonical asset path to cache-busted asset path. */
  manifest: Record<string, string>;
};

type MaybePDFWindow = Window & { PDFViewerApplication?: object };

/**
 * Mark an element as having been added by the boot script.
 *
 * This marker is later used to know which elements to remove when unloading
 * the client.
 */
function tagElement(el: HTMLElement) {
  el.setAttribute('data-hypothesis-asset', '');
}

function injectStylesheet(doc: Document, href: string) {
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = href;

  tagElement(link);
  doc.head.appendChild(link);
}

function injectScript(
  doc: Document,
  src: string,
  {
    esModule = true,
    forceReload = false,
  }: {
    /** Whether to load the script as an ES module. */
    esModule?: boolean;
    /** Whether to force re-evaluation of an ES module script. */
    forceReload?: boolean;
  } = {},
) {
  const script = doc.createElement('script');

  if (esModule) {
    script.type = 'module';
  }

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

function injectLink(
  doc: Document,
  rel: string,
  type: 'html' | 'javascript',
  url: string,
) {
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
 */
function preloadURL(doc: Document, type: string, url: string) {
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

function assetURL(config: SidebarAppConfig | AnnotatorConfig, path: string) {
  return config.assetRoot + 'build/' + config.manifest[path];
}

/**
 * Bootstrap the Hypothesis client.
 *
 * This triggers loading of the necessary resources for the client in a host
 * or guest frame. We could in future simplify booting in guest-only frames
 * by omitting resources that are only needed in the host frame.
 */
export function bootHypothesisClient(doc: Document, config: AnnotatorConfig) {
  // Detect presence of Hypothesis in the page
  const appLinkEl = doc.querySelector(
    'link[type="application/annotator+html"]',
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

  // Register the URL of the user profile app which the Hypothesis client should load.
  injectLink(doc, 'profile', 'html', config.profileAppUrl);

  // Preload the styles used by the shadow roots of annotator UI elements.
  preloadURL(doc, 'style', assetURL(config, 'styles/annotator.css'));

  // Register the URL of the annotation client which is currently being used to drive
  // annotation interactions.
  injectLink(
    doc,
    'hypothesis-client',
    'javascript',
    config.assetRoot + 'build/boot.js',
  );

  const scripts = ['scripts/annotator.bundle.js'];
  for (const path of scripts) {
    const url = assetURL(config, path);
    injectScript(doc, url, { esModule: false });
  }

  const styles = [];
  if ((window as MaybePDFWindow).PDFViewerApplication !== undefined) {
    styles.push('styles/pdfjs-overrides.css');
  }
  styles.push('styles/highlights.css');
  for (const path of styles) {
    const url = assetURL(config, path);
    injectStylesheet(doc, url);
  }
}

/**
 * Bootstrap the sidebar application which displays annotations.
 */
export function bootSidebarApp(doc: Document, config: SidebarAppConfig) {
  // Preload `/api/` and `/api/links` API responses.
  preloadURL(doc, 'fetch', config.apiUrl);
  preloadURL(doc, 'fetch', config.apiUrl + 'links');

  const scripts = ['scripts/sidebar.bundle.js'];
  for (const path of scripts) {
    const url = assetURL(config, path);
    injectScript(doc, url, { esModule: true });
  }

  const styles = ['styles/katex.min.css', 'styles/sidebar.css'];
  for (const path of styles) {
    const url = assetURL(config, path);
    injectStylesheet(doc, url);
  }
}
