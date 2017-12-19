'use strict';

var boot = require('../boot');

describe('bootstrap', function () {
  var iframe;

  beforeEach(function () {
    iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
  });

  afterEach(function () {
    iframe.remove();
  });

  function runBoot() {
    var assetNames = [
      // Annotation layer
      'scripts/polyfills.bundle.js',
      'scripts/jquery.bundle.js',
      'scripts/annotator.bundle.js',
      'styles/annotator.css',
      'styles/icomoon.css',
      'styles/pdfjs-overrides.css',

      // Sidebar app
      'scripts/raven.bundle.js',
      'scripts/angular.bundle.js',
      'scripts/katex.bundle.js',
      'scripts/showdown.bundle.js',
      'scripts/polyfills.bundle.js',
      'scripts/unorm.bundle.js',
      'scripts/sidebar.bundle.js',

      'styles/angular-csp.css',
      'styles/angular-toastr.css',
      'styles/icomoon.css',
      'styles/katex.min.css',
      'styles/sidebar.css',
    ];

    var manifest = assetNames.reduce(function (manifest, path) {
      var url = path.replace(/\.([a-z]+)$/, '.1234.$1');
      manifest[path] = url;
      return manifest;
    }, {});

    boot(iframe.contentDocument, {
      sidebarAppUrl: 'https://marginal.ly/app.html',
      assetRoot: 'https://marginal.ly/client/',
      manifest: manifest,
    });
  }

  function findAssets(doc_) {
    var scripts = Array.from(doc_.querySelectorAll('script')).map(function (el) {
      return el.src;
    });

    var styles = Array.from(doc_.querySelectorAll('link[rel="stylesheet"]'))
      .map(function (el) {
        return el.href;
      });

    return scripts.concat(styles).sort();
  }

  context('in the host page', function () {
    it('loads assets for the annotation layer', function () {
      runBoot();
      var expectedAssets = [
        'scripts/annotator.bundle.1234.js',
        'scripts/jquery.bundle.1234.js',
        'scripts/polyfills.bundle.1234.js',
        'styles/annotator.1234.css',
        'styles/icomoon.1234.css',
        'styles/pdfjs-overrides.1234.css',
      ].map(function (url) {
        return 'https://marginal.ly/client/build/' + url;
      });

      assert.deepEqual(findAssets(iframe.contentDocument), expectedAssets);
    });

    it('creates the link to the sidebar iframe', function () {
      runBoot();

      var sidebarAppLink = iframe.contentDocument
        .querySelector('link[type="application/annotator+html"]');
      assert.ok(sidebarAppLink);
      assert.equal(sidebarAppLink.href, 'https://marginal.ly/app.html');
    });

    it('does nothing if Hypothesis is already loaded in the document', function () {
      var link = iframe.contentDocument.createElement('link');
      link.type = 'application/annotator+html';
      iframe.contentDocument.head.appendChild(link);

      runBoot();

      assert.deepEqual(findAssets(iframe.contentDocument), []);
    });
  });

  context('in the sidebar application', function () {
    var appRootElement;

    beforeEach(function () {
      appRootElement = iframe.contentDocument.createElement('hypothesis-app');
      iframe.contentDocument.body.appendChild(appRootElement);
    });

    afterEach(function () {
      appRootElement.remove();
    });

    it('loads assets for the sidebar application', function () {
      runBoot();
      var expectedAssets = [
        'scripts/angular.bundle.1234.js',
        'scripts/katex.bundle.1234.js',
        'scripts/polyfills.bundle.1234.js',
        'scripts/raven.bundle.1234.js',
        'scripts/showdown.bundle.1234.js',
        'scripts/sidebar.bundle.1234.js',
        'scripts/unorm.bundle.1234.js',
        'styles/angular-csp.1234.css',
        'styles/angular-toastr.1234.css',
        'styles/icomoon.1234.css',
        'styles/katex.min.1234.css',
        'styles/sidebar.1234.css',
      ].map(function (url) {
        return 'https://marginal.ly/client/build/' + url;
      });

      assert.deepEqual(findAssets(iframe.contentDocument), expectedAssets);
    });
  });
});
