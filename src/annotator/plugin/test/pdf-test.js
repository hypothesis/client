import PDF, { $imports } from '../pdf';

import FakePDFViewerApplication from '../../anchoring/test/fake-pdf-viewer-application';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function awaitEvent(target, eventName) {
  return new Promise(resolve => {
    target.addEventListener(eventName, event => resolve(event), {
      once: true,
    });
  });
}

describe('annotator/plugin/pdf', () => {
  let container;
  let fakeAnnotator;
  let fakePdfAnchoring;
  let fakePDFMetadata;
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

    fakePdfAnchoring = {
      documentHasText: sinon.stub().resolves(true),
    };

    fakePDFMetadata = {
      getMetadata: sinon.stub().resolves({}),
      getUri: sinon.stub().resolves('https://example.com/test.pdf'),
    };

    $imports.$mock({
      './pdf-metadata': sinon.stub().returns(fakePDFMetadata),
      '../anchoring/pdf': fakePdfAnchoring,

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

  function pdfViewerHasClass(className) {
    return fakePDFViewerApplication.pdfViewer.viewer.classList.contains(
      className
    );
  }

  describe('#constructor', () => {
    it('adds CSS classes to override PDF.js styles', () => {
      pdfPlugin = createPDFPlugin();
      assert.isTrue(pdfViewerHasClass('has-transparent-text-layer'));
    });
  });

  it('hides annotation layers when there is a text selection', async () => {
    // This tests checks for a CSS class on the root PDF viewer element.
    // The annotation layers are hidden by a CSS rule that uses this class.

    // Start with an empty selection.
    const selection = window.getSelection();
    if (!selection.isCollapsed) {
      selection.collapseToStart();
    }
    pdfPlugin = createPDFPlugin();
    assert.isFalse(pdfViewerHasClass('is-selecting'));

    // Make the selection non-empty.
    selection.selectAllChildren(document.body);
    await awaitEvent(document, 'selectionchange');
    assert.isTrue(pdfViewerHasClass('is-selecting'));

    // Then make the selection empty again.
    selection.collapseToStart();
    await awaitEvent(document, 'selectionchange');
    assert.isFalse(pdfViewerHasClass('is-selecting'));

    // Finally, remove the selection entirely.
    selection.removeAllRanges();
    await awaitEvent(document, 'selectionchange');
    assert.isFalse(pdfViewerHasClass('is-selecting'));
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

  function getWarningBanner() {
    return document.querySelector('.annotator-pdf-warning-banner');
  }

  it('does not show a warning when PDF has selectable text', async () => {
    fakePdfAnchoring.documentHasText.resolves(true);

    pdfPlugin = createPDFPlugin();
    await delay(0); // Wait for text check to complete.

    assert.called(fakePdfAnchoring.documentHasText);
    assert.isNull(getWarningBanner());
  });

  it('does not show a warning if PDF does not load', async () => {
    fakePDFMetadata.getUri.rejects(new Error('Something went wrong'));

    pdfPlugin = createPDFPlugin();
    await delay(0); // Wait for text check to complete.

    assert.notCalled(fakePdfAnchoring.documentHasText);
    assert.isNull(getWarningBanner());
  });

  it('shows a warning when PDF has no selectable text', async () => {
    const mainContainer = document.createElement('div');
    mainContainer.id = 'mainContainer';
    document.body.appendChild(mainContainer);
    fakePdfAnchoring.documentHasText.resolves(false);

    pdfPlugin = createPDFPlugin();
    await delay(0); // Wait for text check to complete.

    assert.called(fakePdfAnchoring.documentHasText);
    const banner = getWarningBanner();
    assert.isNotNull(banner);
    assert.isTrue(mainContainer.contains(banner));
    assert.include(
      banner.textContent,
      'This PDF does not contain selectable text'
    );

    mainContainer.remove();
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
