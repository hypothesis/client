'use strict';

function injectStylesheet(doc, href) {
  var link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = href;
  doc.head.appendChild(link);
}

function injectScript(doc, src) {
  var script = doc.createElement('script');
  script.type = 'text/javascript';
  script.src = src;

  // Set 'async' to false to maintain execution order of scripts.
  // See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
  script.async = false;
  doc.head.appendChild(script);
}

function injectAssets(doc, config, assets) {
  assets.forEach(function (path) {
    var url = config.assetRoot + 'build/' + config.manifest[path];
    if (url.match(/\.css/)) {
      injectStylesheet(doc, url);
    } else {
      injectScript(doc, url);
    }
  });
}

/**
 * Bootstrap the Hypothesis client.
 *
 * This triggers loading of the necessary resources for the client
 */
function bootHypothesisClient(doc, config) {
  // Detect presence of Hypothesis in the page
  var appLinkEl = doc.querySelector('link[type="application/annotator+html"]');
  if (appLinkEl) {
    return;
  }

  // Register the URL of the sidebar app which the Hypothesis client should load.
  // The <link> tag is also used by browser extensions etc. to detect the
  // presence of the Hypothesis client on the page.
  var sidebarUrl = doc.createElement('link');
  sidebarUrl.rel = 'sidebar';
  sidebarUrl.href = config.sidebarAppUrl;
  sidebarUrl.type = 'application/annotator+html';
  doc.head.appendChild(sidebarUrl);

  // Register the URL of the annotation client which is currently being used to drive
  // annotation interactions.
  var clientUrl = doc.createElement('link');
  clientUrl.rel = 'hypothesis-client';
  clientUrl.href = config.assetRoot + 'build/boot.js';
  clientUrl.type = 'application/annotator+javascript';
  doc.head.appendChild(clientUrl);

  injectAssets(doc, config, [
    // Vendor code and polyfills
    'scripts/polyfills.bundle.js',
    'scripts/jquery.bundle.js',

    // Main entry point for the client
    'scripts/injector.bundle.js',

    'styles/icomoon.css',
    'styles/inject.css',
    'styles/pdfjs-overrides.css',
  ]);
}

/**
 * Bootstrap the sidebar application which displays annotations.
 */
function bootSidebarApp(doc, config) {
  injectAssets(doc, config, [
    // Vendor code and polyfills required by app.bundle.js
    'scripts/raven.bundle.js',
    'scripts/angular.bundle.js',
    'scripts/katex.bundle.js',
    'scripts/showdown.bundle.js',
    'scripts/polyfills.bundle.js',
    'scripts/unorm.bundle.js',

    // The sidebar app
    'scripts/app.bundle.js',

    'styles/angular-csp.css',
    'styles/angular-toastr.css',
    'styles/icomoon.css',
    'styles/katex.min.css',
    'styles/app.css',
  ]);
}

function boot(document_, config) {
  if (document_.querySelector('hypothesis-app')) {
    bootSidebarApp(document_, config);
  } else {
    bootHypothesisClient(document_, config);
  }
}

module.exports = boot;
