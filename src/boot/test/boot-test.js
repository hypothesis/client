import { bootHypothesisClient, bootSidebarApp } from '../boot';
import { $imports } from '../boot';

function assetUrl(url) {
  return `https://marginal.ly/client/build/${url}`;
}

describe('bootstrap', function () {
  let fakePolyfills;
  let iframe;

  beforeEach(function () {
    iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    fakePolyfills = {
      requiredPolyfillSets: sinon.stub().returns([]),
    };

    $imports.$mock({
      './polyfills': fakePolyfills,
    });
  });

  afterEach(function () {
    $imports.$restore();
    iframe.remove();
  });

  function runBoot(app = 'annotator') {
    const assetNames = [
      // Polyfills
      'scripts/polyfills-es2017.bundle.js',

      // Annotation layer
      'scripts/annotator.bundle.js',
      'styles/annotator.css',
      'styles/pdfjs-overrides.css',

      // Sidebar app
      'scripts/sentry.bundle.js',
      'scripts/katex.bundle.js',
      'scripts/showdown.bundle.js',
      'scripts/sidebar.bundle.js',

      'styles/katex.min.css',
      'styles/sidebar.css',
    ];

    const manifest = assetNames.reduce(function (manifest, path) {
      const url = path.replace(/\.([a-z]+)$/, '.1234.$1');
      manifest[path] = url;
      return manifest;
    }, {});

    let bootApp;
    if (app === 'annotator') {
      bootApp = bootHypothesisClient;
    } else if (app === 'sidebar') {
      bootApp = bootSidebarApp;
    }

    bootApp(iframe.contentDocument, {
      sidebarAppUrl: 'https://marginal.ly/app.html',
      assetRoot: 'https://marginal.ly/client/',
      manifest,
    });
  }

  function findAssets(doc_) {
    const scripts = Array.from(
      doc_.querySelectorAll('script[data-hypothesis-asset]')
    ).map(function (el) {
      return el.src;
    });

    const styles = Array.from(
      doc_.querySelectorAll('link[rel="stylesheet"][data-hypothesis-asset]')
    ).map(function (el) {
      return el.href;
    });

    return scripts.concat(styles).sort();
  }

  describe('bootHypothesisClient', function () {
    it('loads assets for the annotation layer', function () {
      runBoot('annotator');
      const expectedAssets = [
        'scripts/annotator.bundle.1234.js',
        'styles/annotator.1234.css',
        'styles/pdfjs-overrides.1234.css',
      ].map(assetUrl);

      assert.deepEqual(findAssets(iframe.contentDocument), expectedAssets);
    });

    it('creates the link to the sidebar iframe', function () {
      runBoot('annotator');

      const sidebarAppLink = iframe.contentDocument.querySelector(
        'link[type="application/annotator+html"]'
      );
      assert.ok(sidebarAppLink);
      assert.isTrue(sidebarAppLink.hasAttribute('data-hypothesis-asset'));
      assert.equal(sidebarAppLink.href, 'https://marginal.ly/app.html');
    });

    it('does nothing if Hypothesis is already loaded in the document', function () {
      const link = iframe.contentDocument.createElement('link');
      link.type = 'application/annotator+html';
      iframe.contentDocument.head.appendChild(link);

      runBoot('annotator');

      assert.deepEqual(findAssets(iframe.contentDocument), []);
    });

    it('loads polyfills if required', () => {
      fakePolyfills.requiredPolyfillSets.callsFake(sets =>
        sets.filter(s => s.match(/es2017/))
      );

      runBoot('annotator');

      const polyfillsLoaded = findAssets(iframe.contentDocument).filter(a =>
        a.match(/polyfills/)
      );
      assert.called(fakePolyfills.requiredPolyfillSets);
      assert.deepEqual(polyfillsLoaded, [
        assetUrl('scripts/polyfills-es2017.bundle.1234.js'),
      ]);
    });
  });

  describe('bootSidebarApp', function () {
    it('loads assets for the sidebar application', function () {
      runBoot('sidebar');
      const expectedAssets = [
        'scripts/katex.bundle.1234.js',
        'scripts/sentry.bundle.1234.js',
        'scripts/showdown.bundle.1234.js',
        'scripts/sidebar.bundle.1234.js',
        'styles/katex.min.1234.css',
        'styles/sidebar.1234.css',
      ].map(assetUrl);

      assert.deepEqual(findAssets(iframe.contentDocument), expectedAssets);
    });

    it('loads polyfills if required', () => {
      fakePolyfills.requiredPolyfillSets.callsFake(sets =>
        sets.filter(s => s.match(/es2017/))
      );

      runBoot('sidebar');

      const polyfillsLoaded = findAssets(iframe.contentDocument).filter(a =>
        a.match(/polyfills/)
      );
      assert.called(fakePolyfills.requiredPolyfillSets);
      assert.deepEqual(polyfillsLoaded, [
        assetUrl('scripts/polyfills-es2017.bundle.1234.js'),
      ]);
    });
  });
});
