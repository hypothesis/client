'use strict';

const boot = require('../boot');

function assetUrl(url) {
  return `https://marginal.ly/client/build/${url}`;
}

describe('bootstrap', function() {
  let fakePolyfills;
  let iframe;

  beforeEach(function() {
    iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    fakePolyfills = {
      requiredPolyfillSets: sinon.stub().returns([]),
    };

    boot.$imports.$mock({
      '../shared/polyfills': fakePolyfills,
    });
  });

  afterEach(function() {
    boot.$imports.$restore();
    iframe.remove();
  });

  function runBoot() {
    const assetNames = [
      // Polyfills
      'scripts/polyfills-es2015.bundle.js',

      // Annotation layer
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
      'scripts/sidebar.bundle.js',

      'styles/angular-csp.css',
      'styles/angular-toastr.css',
      'styles/icomoon.css',
      'styles/katex.min.css',
      'styles/sidebar.css',
    ];

    const manifest = assetNames.reduce(function(manifest, path) {
      const url = path.replace(/\.([a-z]+)$/, '.1234.$1');
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
    const scripts = Array.from(doc_.querySelectorAll('script')).map(function(
      el
    ) {
      return el.src;
    });

    const styles = Array.from(
      doc_.querySelectorAll('link[rel="stylesheet"]')
    ).map(function(el) {
      return el.href;
    });

    return scripts.concat(styles).sort();
  }

  context('in the host page', function() {
    it('loads assets for the annotation layer', function() {
      runBoot();
      const expectedAssets = [
        'scripts/annotator.bundle.1234.js',
        'scripts/jquery.bundle.1234.js',
        'styles/annotator.1234.css',
        'styles/icomoon.1234.css',
        'styles/pdfjs-overrides.1234.css',
      ].map(assetUrl);

      assert.deepEqual(findAssets(iframe.contentDocument), expectedAssets);
    });

    it('creates the link to the sidebar iframe', function() {
      runBoot();

      const sidebarAppLink = iframe.contentDocument.querySelector(
        'link[type="application/annotator+html"]'
      );
      assert.ok(sidebarAppLink);
      assert.equal(sidebarAppLink.href, 'https://marginal.ly/app.html');
    });

    it('does nothing if Hypothesis is already loaded in the document', function() {
      const link = iframe.contentDocument.createElement('link');
      link.type = 'application/annotator+html';
      iframe.contentDocument.head.appendChild(link);

      runBoot();

      assert.deepEqual(findAssets(iframe.contentDocument), []);
    });

    it('loads polyfills if required', () => {
      fakePolyfills.requiredPolyfillSets.callsFake(sets =>
        sets.filter(s => s.match(/es2015/))
      );

      runBoot();

      const polyfillsLoaded = findAssets(iframe.contentDocument).filter(a =>
        a.match(/polyfills/)
      );
      assert.called(fakePolyfills.requiredPolyfillSets);
      assert.deepEqual(polyfillsLoaded, [
        assetUrl('scripts/polyfills-es2015.bundle.1234.js'),
      ]);
    });
  });

  context('in the sidebar application', function() {
    let appRootElement;

    beforeEach(function() {
      appRootElement = iframe.contentDocument.createElement('hypothesis-app');
      iframe.contentDocument.body.appendChild(appRootElement);
    });

    afterEach(function() {
      appRootElement.remove();
    });

    it('loads assets for the sidebar application', function() {
      runBoot();
      const expectedAssets = [
        'scripts/angular.bundle.1234.js',
        'scripts/katex.bundle.1234.js',
        'scripts/raven.bundle.1234.js',
        'scripts/showdown.bundle.1234.js',
        'scripts/sidebar.bundle.1234.js',
        'styles/angular-csp.1234.css',
        'styles/angular-toastr.1234.css',
        'styles/icomoon.1234.css',
        'styles/katex.min.1234.css',
        'styles/sidebar.1234.css',
      ].map(assetUrl);

      assert.deepEqual(findAssets(iframe.contentDocument), expectedAssets);
    });

    it('loads polyfills if required', () => {
      fakePolyfills.requiredPolyfillSets.callsFake(sets =>
        sets.filter(s => s.match(/es2015/))
      );

      runBoot();

      const polyfillsLoaded = findAssets(iframe.contentDocument).filter(a =>
        a.match(/polyfills/)
      );
      assert.called(fakePolyfills.requiredPolyfillSets);
      assert.deepEqual(polyfillsLoaded, [
        assetUrl('scripts/polyfills-es2015.bundle.1234.js'),
      ]);
    });
  });
});
