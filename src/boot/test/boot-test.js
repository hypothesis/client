import { bootHypothesisClient, bootSidebarApp } from '../boot';

function assetURL(url) {
  return `https://marginal.ly/client/build/${url}`;
}

describe('bootstrap', () => {
  let iframe;

  beforeEach(() => {
    iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
  });

  afterEach(() => {
    iframe.remove();
  });

  function runBoot(app = 'annotator') {
    const assetNames = [
      // Annotation layer
      'scripts/annotator.bundle.js',
      'styles/annotator.css',
      'styles/highlights.css',
      'styles/pdfjs-overrides.css',

      // Sidebar app
      'scripts/sentry.bundle.js',
      'scripts/katex.bundle.js',
      'scripts/showdown.bundle.js',
      'scripts/sidebar.bundle.js',

      'styles/katex.min.css',
      'styles/sidebar.css',
    ];

    const manifest = assetNames.reduce((manifest, path) => {
      const url = path.replace(/\.([a-z]+)$/, '.1234.$1');
      manifest[path] = url;
      return manifest;
    }, {});

    let extraSettings = {};
    let bootApp;
    if (app === 'annotator') {
      bootApp = bootHypothesisClient;
    } else if (app === 'sidebar') {
      bootApp = bootSidebarApp;
      extraSettings.apiUrl = 'https://marginal.ly/api/';
    }

    bootApp(iframe.contentDocument, {
      sidebarAppUrl: 'https://marginal.ly/app.html',
      assetRoot: 'https://marginal.ly/client/',
      manifest,
      ...extraSettings,
    });
  }

  function findAssets(doc_) {
    const scripts = Array.from(
      doc_.querySelectorAll('script[data-hypothesis-asset]')
    ).map(el => {
      return { src: el.src, type: el.type === 'module' ? 'module' : 'script' };
    });

    const styles = Array.from(
      doc_.querySelectorAll('link[rel="stylesheet"][data-hypothesis-asset]')
    ).map(el => {
      return { src: el.href, type: 'stylesheet' };
    });

    return scripts.concat(styles).sort((a, b) => a.src.localeCompare(b.src));
  }

  describe('bootHypothesisClient', () => {
    let clock;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
    });

    afterEach(() => {
      clock.restore();
    });

    it('loads assets for the annotation layer', () => {
      clock.tick(123); // Set timestamp used by module cache-busting fragment.

      runBoot('annotator');
      const expectedAssets = [
        { src: assetURL('scripts/annotator.bundle.1234.js'), type: 'script' },
        { src: assetURL('styles/highlights.1234.css'), type: 'stylesheet' },
      ];

      assert.deepEqual(findAssets(iframe.contentDocument), expectedAssets);
    });

    it('loads styling overrides in PDF.js', () => {
      clock.tick(123); // Set timestamp used by module cache-busting fragment.

      window.PDFViewerApplication = {};
      try {
        runBoot('annotator');
        const expectedAssets = [
          { src: assetURL('scripts/annotator.bundle.1234.js'), type: 'script' },
          { src: assetURL('styles/highlights.1234.css'), type: 'stylesheet' },
          {
            src: assetURL('styles/pdfjs-overrides.1234.css'),
            type: 'stylesheet',
          },
        ];

        assert.deepEqual(findAssets(iframe.contentDocument), expectedAssets);
      } finally {
        delete window.PDFViewerApplication;
      }
    });

    it('preloads assets used wihin shadow roots in the annotation layer', () => {
      runBoot('annotator');

      const preloadLinks = [
        ...iframe.contentDocument.querySelectorAll('link[rel=preload]'),
      ];
      preloadLinks.sort((a, b) => a.href.localeCompare(b.href));

      assert.equal(preloadLinks.length, 1);

      assert.equal(
        preloadLinks[0].href,
        'https://marginal.ly/client/build/styles/annotator.1234.css'
      );
      assert.equal(preloadLinks[0].as, 'style');
      assert.equal(preloadLinks[0].crossOrigin, null);
    });

    it('creates the link to the sidebar iframe', () => {
      runBoot('annotator');

      const sidebarAppLink = iframe.contentDocument.querySelector(
        'link[type="application/annotator+html"]'
      );
      assert.ok(sidebarAppLink);
      assert.isTrue(sidebarAppLink.hasAttribute('data-hypothesis-asset'));
      assert.equal(sidebarAppLink.href, 'https://marginal.ly/app.html');
    });

    it('does nothing if Hypothesis is already loaded in the document', () => {
      const link = iframe.contentDocument.createElement('link');
      link.type = 'application/annotator+html';
      iframe.contentDocument.head.appendChild(link);

      runBoot('annotator');

      assert.deepEqual(findAssets(iframe.contentDocument), []);
    });
  });

  describe('bootSidebarApp', () => {
    it('loads assets for the sidebar application', () => {
      runBoot('sidebar');
      const expectedAssets = [
        { src: assetURL('scripts/sidebar.bundle.1234.js'), type: 'module' },
        { src: assetURL('styles/katex.min.1234.css'), type: 'stylesheet' },
        { src: assetURL('styles/sidebar.1234.css'), type: 'stylesheet' },
      ];

      assert.deepEqual(findAssets(iframe.contentDocument), expectedAssets);
    });

    it('preloads /api/ and /api/links responses from Hypothesis API', () => {
      runBoot('sidebar');

      const preloadLinks = [
        ...iframe.contentDocument.querySelectorAll('link[rel=preload]'),
      ];
      preloadLinks.sort((a, b) => a.href.localeCompare(b.href));

      assert.equal(preloadLinks.length, 2);

      assert.equal(preloadLinks[0].href, 'https://marginal.ly/api/');
      assert.equal(preloadLinks[0].as, 'fetch');
      assert.equal(preloadLinks[0].crossOrigin, 'anonymous');

      assert.equal(preloadLinks[1].href, 'https://marginal.ly/api/links');
      assert.equal(preloadLinks[1].as, 'fetch');
      assert.equal(preloadLinks[1].crossOrigin, 'anonymous');
    });
  });
});
