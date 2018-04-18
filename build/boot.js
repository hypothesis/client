(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
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
  'scripts/polyfills.bundle.js', 'scripts/jquery.bundle.js',

  // Main entry point for the client
  'scripts/annotator.bundle.js', 'styles/icomoon.css', 'styles/annotator.css', 'styles/pdfjs-overrides.css']);
}

/**
 * Bootstrap the sidebar application which displays annotations.
 */
function bootSidebarApp(doc, config) {
  injectAssets(doc, config, [
  // Vendor code and polyfills required by app.bundle.js
  'scripts/raven.bundle.js', 'scripts/angular.bundle.js', 'scripts/katex.bundle.js', 'scripts/showdown.bundle.js', 'scripts/polyfills.bundle.js', 'scripts/unorm.bundle.js',

  // The sidebar app
  'scripts/sidebar.bundle.js', 'styles/angular-csp.css', 'styles/angular-toastr.css', 'styles/icomoon.css', 'styles/katex.min.css', 'styles/sidebar.css']);
}

function boot(document_, config) {
  if (document_.querySelector('hypothesis-app')) {
    bootSidebarApp(document_, config);
  } else {
    bootHypothesisClient(document_, config);
  }
}

module.exports = boot;

},{}],2:[function(require,module,exports){
'use strict';

// This is the main entry point for the Hypothesis client in the host page
// and the sidebar application.
//
// The same boot script is used for both entry points so that the browser
// already has it cached when it encounters the reference in the sidebar
// application.

// Variables replaced by the build script

/* global {"fonts/KaTeX_AMS-Regular.woff":"fonts/KaTeX_AMS-Regular.woff?d1708b","fonts/KaTeX_Caligraphic-Bold.woff":"fonts/KaTeX_Caligraphic-Bold.woff?bce727","fonts/KaTeX_Caligraphic-Regular.woff":"fonts/KaTeX_Caligraphic-Regular.woff?ff0a2a","fonts/KaTeX_Fraktur-Bold.woff":"fonts/KaTeX_Fraktur-Bold.woff?4fe167","fonts/KaTeX_Fraktur-Regular.woff":"fonts/KaTeX_Fraktur-Regular.woff?22ac05","fonts/KaTeX_Main-Bold.woff":"fonts/KaTeX_Main-Bold.woff?355529","fonts/KaTeX_Main-Italic.woff":"fonts/KaTeX_Main-Italic.woff?0bf8cb","fonts/KaTeX_Main-Regular.woff":"fonts/KaTeX_Main-Regular.woff?76c0fe","fonts/KaTeX_Math-BoldItalic.woff":"fonts/KaTeX_Math-BoldItalic.woff?9a79de","fonts/KaTeX_Math-Italic.woff":"fonts/KaTeX_Math-Italic.woff?a0c5a3","fonts/KaTeX_Math-Regular.woff":"fonts/KaTeX_Math-Regular.woff?741de0","fonts/KaTeX_SansSerif-Bold.woff":"fonts/KaTeX_SansSerif-Bold.woff?0b932c","fonts/KaTeX_SansSerif-Italic.woff":"fonts/KaTeX_SansSerif-Italic.woff?c0cfcc","fonts/KaTeX_SansSerif-Regular.woff":"fonts/KaTeX_SansSerif-Regular.woff?0d52ce","fonts/KaTeX_Script-Regular.woff":"fonts/KaTeX_Script-Regular.woff?30b05b","fonts/KaTeX_Size1-Regular.woff":"fonts/KaTeX_Size1-Regular.woff?ac63f8","fonts/KaTeX_Size2-Regular.woff":"fonts/KaTeX_Size2-Regular.woff?80afd2","fonts/KaTeX_Size3-Regular.woff":"fonts/KaTeX_Size3-Regular.woff?579c05","fonts/KaTeX_Size4-Regular.woff":"fonts/KaTeX_Size4-Regular.woff?44c744","fonts/KaTeX_Typewriter-Regular.woff":"fonts/KaTeX_Typewriter-Regular.woff?6641c6","fonts/h.woff":"fonts/h.woff?9d153c","scripts/angular.bundle.js":"scripts/angular.bundle.js?694a20","scripts/annotator.bundle.js":"scripts/annotator.bundle.js?885b15","scripts/boot.bundle.js":"scripts/boot.bundle.js?87f0dd","scripts/jquery.bundle.js":"scripts/jquery.bundle.js?fe478a","scripts/katex.bundle.js":"scripts/katex.bundle.js?40feaa","scripts/polyfills.bundle.js":"scripts/polyfills.bundle.js?7e2d60","scripts/raven.bundle.js":"scripts/raven.bundle.js?3eba39","scripts/showdown.bundle.js":"scripts/showdown.bundle.js?3b9530","scripts/sidebar.bundle.js":"scripts/sidebar.bundle.js?d33995","scripts/unorm.bundle.js":"scripts/unorm.bundle.js?297bd4","styles/angular-csp.css":"styles/angular-csp.css?e61a94","styles/angular-toastr.css":"styles/angular-toastr.css?b84bea","styles/annotator.css":"styles/annotator.css?7612a3","styles/icomoon.css":"styles/icomoon.css?777c98","styles/katex.min.css":"styles/katex.min.css?43cde2","styles/pdfjs-overrides.css":"styles/pdfjs-overrides.css?45a1ee","styles/sidebar.css":"styles/sidebar.css?ac03a6"} */

var boot = require('./boot');
var settings = require('../shared/settings').jsonConfigsFrom(document);

boot(document, {
  assetRoot: settings.assetRoot || 'http://localhost:3001/hypothesis/1.64.0/',
  manifest: {"fonts/KaTeX_AMS-Regular.woff":"fonts/KaTeX_AMS-Regular.woff?d1708b","fonts/KaTeX_Caligraphic-Bold.woff":"fonts/KaTeX_Caligraphic-Bold.woff?bce727","fonts/KaTeX_Caligraphic-Regular.woff":"fonts/KaTeX_Caligraphic-Regular.woff?ff0a2a","fonts/KaTeX_Fraktur-Bold.woff":"fonts/KaTeX_Fraktur-Bold.woff?4fe167","fonts/KaTeX_Fraktur-Regular.woff":"fonts/KaTeX_Fraktur-Regular.woff?22ac05","fonts/KaTeX_Main-Bold.woff":"fonts/KaTeX_Main-Bold.woff?355529","fonts/KaTeX_Main-Italic.woff":"fonts/KaTeX_Main-Italic.woff?0bf8cb","fonts/KaTeX_Main-Regular.woff":"fonts/KaTeX_Main-Regular.woff?76c0fe","fonts/KaTeX_Math-BoldItalic.woff":"fonts/KaTeX_Math-BoldItalic.woff?9a79de","fonts/KaTeX_Math-Italic.woff":"fonts/KaTeX_Math-Italic.woff?a0c5a3","fonts/KaTeX_Math-Regular.woff":"fonts/KaTeX_Math-Regular.woff?741de0","fonts/KaTeX_SansSerif-Bold.woff":"fonts/KaTeX_SansSerif-Bold.woff?0b932c","fonts/KaTeX_SansSerif-Italic.woff":"fonts/KaTeX_SansSerif-Italic.woff?c0cfcc","fonts/KaTeX_SansSerif-Regular.woff":"fonts/KaTeX_SansSerif-Regular.woff?0d52ce","fonts/KaTeX_Script-Regular.woff":"fonts/KaTeX_Script-Regular.woff?30b05b","fonts/KaTeX_Size1-Regular.woff":"fonts/KaTeX_Size1-Regular.woff?ac63f8","fonts/KaTeX_Size2-Regular.woff":"fonts/KaTeX_Size2-Regular.woff?80afd2","fonts/KaTeX_Size3-Regular.woff":"fonts/KaTeX_Size3-Regular.woff?579c05","fonts/KaTeX_Size4-Regular.woff":"fonts/KaTeX_Size4-Regular.woff?44c744","fonts/KaTeX_Typewriter-Regular.woff":"fonts/KaTeX_Typewriter-Regular.woff?6641c6","fonts/h.woff":"fonts/h.woff?9d153c","scripts/angular.bundle.js":"scripts/angular.bundle.js?694a20","scripts/annotator.bundle.js":"scripts/annotator.bundle.js?885b15","scripts/boot.bundle.js":"scripts/boot.bundle.js?87f0dd","scripts/jquery.bundle.js":"scripts/jquery.bundle.js?fe478a","scripts/katex.bundle.js":"scripts/katex.bundle.js?40feaa","scripts/polyfills.bundle.js":"scripts/polyfills.bundle.js?7e2d60","scripts/raven.bundle.js":"scripts/raven.bundle.js?3eba39","scripts/showdown.bundle.js":"scripts/showdown.bundle.js?3b9530","scripts/sidebar.bundle.js":"scripts/sidebar.bundle.js?d33995","scripts/unorm.bundle.js":"scripts/unorm.bundle.js?297bd4","styles/angular-csp.css":"styles/angular-csp.css?e61a94","styles/angular-toastr.css":"styles/angular-toastr.css?b84bea","styles/annotator.css":"styles/annotator.css?7612a3","styles/icomoon.css":"styles/icomoon.css?777c98","styles/katex.min.css":"styles/katex.min.css?43cde2","styles/pdfjs-overrides.css":"styles/pdfjs-overrides.css?45a1ee","styles/sidebar.css":"styles/sidebar.css?ac03a6"},
  sidebarAppUrl: settings.sidebarAppUrl || 'http://conjecture:5000/app.html'
});

},{"../shared/settings":3,"./boot":1}],3:[function(require,module,exports){
'use strict';

// `Object.assign()`-like helper. Used because this script needs to work
// in IE 10/11 without polyfills.

function assign(dest, src) {
  for (var k in src) {
    if (src.hasOwnProperty(k)) {
      dest[k] = src[k];
    }
  }
  return dest;
}

/**
 * Return a parsed `js-hypothesis-config` object from the document, or `{}`.
 *
 * Find all `<script class="js-hypothesis-config">` tags in the given document,
 * parse them as JSON, and return the parsed object.
 *
 * If there are no `js-hypothesis-config` tags in the document then return
 * `{}`.
 *
 * If there are multiple `js-hypothesis-config` tags in the document then merge
 * them into a single returned object (when multiple scripts contain the same
 * setting names, scripts further down in the document override those further
 * up).
 *
 * @param {Document|Element} document - The root element to search.
 */
function jsonConfigsFrom(document) {
  var config = {};
  var settingsElements = document.querySelectorAll('script.js-hypothesis-config');

  for (var i = 0; i < settingsElements.length; i++) {
    var settings;
    try {
      settings = JSON.parse(settingsElements[i].textContent);
    } catch (err) {
      console.warn('Could not parse settings from js-hypothesis-config tags', err);
      settings = {};
    }
    assign(config, settings);
  }

  return config;
}

module.exports = {
  jsonConfigsFrom: jsonConfigsFrom
};

},{}]},{},[2])
