import PDF, { $imports } from '../pdf';

import FakePDFViewerApplication from '../../anchoring/test/fake-pdf-viewer-application';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('annotator/plugin/pdf', () => {
  let container;
  let fakeAnnotator;
  let fakePDFViewerApplication;
  let pdfPlugin;

  function createPDFPlugin() {
    return new PDF(document.body, {}, fakeAnnotator);
  }

  beforeEach(() => {
    // Setup fake PDF.js viewer.
    container = document.createElement('div');
    document.body.appendChild(container);
    fakePDFViewerApplication = new FakePDFViewerApplication({
      container,
      content: ['First page', 'Second page'],
    });
    fakePDFViewerApplication.pdfViewer.setCurrentPage(0);
    window.PDFViewerApplication = fakePDFViewerApplication;

    fakeAnnotator = {
      anchor: sinon.stub(),
      anchors: [],
      anchoring: null,
    };

    $imports.$mock({
      // Disable debouncing of updates.
      'lodash.debounce': callback => callback,
    });
  });

  afterEach(() => {
    container.remove();
    pdfPlugin?.destroy();
    delete window.PDFViewerApplication;

    $imports.$restore();
  });

  describe('#constructor', () => {
    it('adds CSS classes to override PDF.js styles', () => {
      pdfPlugin = createPDFPlugin();
      assert.isTrue(
        fakePDFViewerApplication.pdfViewer.viewer.classList.contains(
          'has-transparent-text-layer'
        )
      );
    });
  });

  describe('#destroy', () => {
    it('removes CSS classes to override PDF.js styles', () => {
      pdfPlugin = createPDFPlugin();

      pdfPlugin.destroy();
      pdfPlugin = null;

      assert.isFalse(
        fakePDFViewerApplication.pdfViewer.viewer.classList.contains(
          'has-transparent-text-layer'
        )
      );
    });
  });

  context('when the PDF viewer content changes', () => {
    async function triggerUpdate() {
      const element = document.createElement('div');
      fakePDFViewerApplication.pdfViewer.viewer.appendChild(element);

      // Give MutationObserver a chance to trigger its callback.
      await delay(0);
    }

    function createAnchor() {
      const anchor = {
        anchor: {},
        highlights: [document.createElement('div')],
        range: document.createRange(),
      };
      fakeAnnotator.anchors.push(anchor);
      return anchor;
    }

    it('re-anchors annotations whose highlights are no longer in the page', async () => {
      const anchor = createAnchor();
      pdfPlugin = createPDFPlugin();

      await triggerUpdate();

      assert.equal(anchor.highlights.length, 0);
      assert.isUndefined(anchor.range);
      assert.calledWith(fakeAnnotator.anchor, anchor.annotation);
    });

    it('does not re-anchor annotations whose highlights are still in the page', async () => {
      const anchor = createAnchor();
      pdfPlugin = createPDFPlugin();

      document.body.appendChild(anchor.highlights[0]);
      await triggerUpdate();

      assert.equal(anchor.highlights.length, 1);
      assert.ok(anchor.range);
      assert.notCalled(fakeAnnotator.anchor);
    });
  });
});
