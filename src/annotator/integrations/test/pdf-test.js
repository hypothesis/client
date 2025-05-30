import { delay } from '@hypothesis/frontend-testing';

import { RenderingStates } from '../../anchoring/pdf';
import { createPlaceholder } from '../../anchoring/placeholder';
import { FakePDFViewerApplication } from '../../anchoring/test/fake-pdf-viewer-application';
import { FeatureFlags } from '../../features';
import { PDFIntegration, isPDF, $imports } from '../pdf';

function awaitEvent(target, eventName) {
  return new Promise(resolve => {
    target.addEventListener(eventName, event => resolve(event), {
      once: true,
    });
  });
}

class FakeTextRange {
  static trimmedRange(range) {
    return range;
  }
}

describe('annotator/integrations/pdf', () => {
  describe('isPDF', () => {
    beforeEach(() => {
      delete window.PDFViewerApplication;
    });

    it('returns true in PDF.js', () => {
      window.PDFViewerApplication = {};
      assert.isTrue(isPDF());
    });

    it('returns false in other applications', () => {
      assert.isFalse(isPDF());
    });
  });

  describe('PDFIntegration', () => {
    // Fake for the top-level `#outerContainer` DOM element created by PDF.js.
    let outerContainer;
    // Fake for the `#viewerContainer` DOM element created by PDF.js that contains
    // the actual PDF content.
    let viewerContainer;

    let fakeAnnotator;
    let fakeHighlighter;
    let fakePDFAnchoring;
    let fakePDFMetadata;
    let fakePDFViewerApplication;
    let fakeScrollUtils;
    let pdfIntegration;

    function createPDFIntegration(options = {}) {
      return new PDFIntegration({
        annotator: fakeAnnotator,
        features: new FeatureFlags(['pdf_image_annotation']),
        ...options,
      });
    }

    beforeEach(() => {
      // Setup fake PDF.js viewer.
      outerContainer = document.createElement('div');
      outerContainer.id = 'outerContainer';
      document.body.appendChild(outerContainer);

      viewerContainer = document.createElement('div');
      outerContainer.appendChild(viewerContainer);

      fakePDFViewerApplication = new FakePDFViewerApplication({
        container: viewerContainer,
        content: ['First page', 'Second page'],
      });
      fakePDFViewerApplication.pdfViewer.setCurrentPage(0);
      window.PDFViewerApplication = fakePDFViewerApplication;

      fakeAnnotator = {
        anchor: sinon.stub(),
        anchors: [],
        anchoring: null,
      };

      fakeHighlighter = {
        getHighlightsFromPoint: sinon.stub().returns([]),
      };

      fakePDFAnchoring = {
        RenderingStates,
        anchor: sinon.stub(),
        canDescribe: sinon.stub().returns(true),
        describe: sinon.stub(),
        describeShape: sinon.stub(),
        documentHasText: sinon.stub().resolves(true),
      };

      fakePDFMetadata = {
        getMetadata: sinon
          .stub()
          .resolves({ title: 'Dummy PDF', documentFingerprint: 'abc' }),
        getUri: sinon.stub().resolves('https://example.com/test.pdf'),
      };

      fakeScrollUtils = {
        computeScrollOffset: sinon.stub().returns(0),
        scrollElement: sinon.stub().resolves(),
      };

      $imports.$mock({
        './pdf-metadata': {
          PDFMetadata: sinon.stub().returns(fakePDFMetadata),
        },
        '../anchoring/pdf': fakePDFAnchoring,
        '../anchoring/text-range': { TextRange: FakeTextRange },
        '../highlighter': fakeHighlighter,
        '../util/scroll': fakeScrollUtils,

        // Disable debouncing of updates.
        'lodash.debounce': callback => callback,
      });
    });

    afterEach(() => {
      pdfIntegration?.destroy();
      delete window.PDFViewerApplication;
      outerContainer.remove();
      $imports.$restore();
    });

    function pdfViewerHasClass(className) {
      return fakePDFViewerApplication.pdfViewer.viewer.classList.contains(
        className,
      );
    }

    describe('#constructor', () => {
      it('adds CSS classes to override PDF.js styles', () => {
        pdfIntegration = createPDFIntegration();
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
      pdfIntegration = createPDFIntegration();
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

    describe('#uri', () => {
      it('returns current PDF document URI', async () => {
        const uri = await createPDFIntegration().uri();
        assert.equal(uri, 'https://example.com/test.pdf');
      });
    });

    describe('#getMetadata', () => {
      it('returns current PDF document metadata', async () => {
        const metadata = await createPDFIntegration().getMetadata();
        assert.deepEqual(metadata, {
          title: 'Dummy PDF',
          documentFingerprint: 'abc',
        });
      });
    });

    describe('#anchor', () => {
      it('anchors provided selectors', async () => {
        pdfIntegration = createPDFIntegration();
        fakePDFAnchoring.anchor.returns({});
        const selectors = [];

        const range = await pdfIntegration.anchor({}, selectors);

        assert.calledWith(fakePDFAnchoring.anchor, selectors);
        assert.equal(range, fakePDFAnchoring.anchor());
      });
    });

    describe('#getAnnotatableRange', () => {
      let fakeTrimmedRange;

      beforeEach(() => {
        fakeTrimmedRange = sinon.stub(FakeTextRange, 'trimmedRange');
      });

      afterEach(() => {
        FakeTextRange.trimmedRange.restore();
      });

      it('verifies that range is in text layer of PDF', () => {
        const range = new Range();
        fakeTrimmedRange.returns(range);
        assert.equal(pdfIntegration.getAnnotatableRange(range), range);
        assert.calledWith(fakePDFAnchoring.canDescribe, range);
      });

      it('returns null if range-trimming encounters a RangeError', () => {
        fakeTrimmedRange.throws(
          new RangeError('Range contains no non-whitespace text'),
        );
        const range = new Range();
        assert.isNull(pdfIntegration.getAnnotatableRange(range));
      });

      it('throws if range-trimming encounters non-RangeError errors', () => {
        fakeTrimmedRange.throws(new Error('non-handled Error'));
        const range = new Range();
        assert.throws(() => pdfIntegration.getAnnotatableRange(range));
      });
    });

    describe('#describe', () => {
      it('generates selectors for DOM range', async () => {
        pdfIntegration = createPDFIntegration();
        const range = document.createRange();
        fakePDFAnchoring.describe.returns([]);

        const selectors = await pdfIntegration.describe({}, range);

        assert.calledWith(fakePDFAnchoring.describe, range);
        assert.equal(selectors, fakePDFAnchoring.describe());
      });

      it('generates selectors for shape', async () => {
        pdfIntegration = createPDFIntegration();
        const shape = { type: 'point', x: 0, y: 0 };

        const selectors = await pdfIntegration.describe({}, shape);

        assert.calledWith(fakePDFAnchoring.describeShape, shape);
        assert.equal(selectors, fakePDFAnchoring.describeShape());
      });
    });

    describe('#destroy', () => {
      const sandbox = sinon.createSandbox();
      afterEach(() => {
        sandbox.restore();
      });

      it('removes CSS classes to override PDF.js styles', () => {
        pdfIntegration = createPDFIntegration();

        pdfIntegration.destroy();
        pdfIntegration = null;

        assert.isFalse(
          fakePDFViewerApplication.pdfViewer.viewer.classList.contains(
            'has-transparent-text-layer',
          ),
        );
      });

      it('undoes side-by-side layout changes', () => {
        // Fix value to be a size at which side-by-side will activate.
        sandbox.stub(window, 'innerWidth').value(800);

        pdfIntegration = createPDFIntegration();
        pdfIntegration.fitSideBySide({
          expanded: true,
          width: 100,
        });
        assert.isTrue(
          pdfIntegration.sideBySideActive(),
          'side-by-side was not activated',
        );

        pdfIntegration.destroy();

        assert.isFalse(
          pdfIntegration.sideBySideActive(),
          'side-by-side was not deactivated',
        );
      });
    });

    function getBanner() {
      return document.querySelector('hypothesis-banner');
    }

    describe('content info banner', () => {
      /** @type {ContentInfoConfig} */
      const contentInfo = {
        logo: {
          logo: '/jstor-logo.svg',
          link: 'https://www.jstor.org',
          title: 'Document provided by JSTOR',
        },
        item: {
          title: 'Chapter 2: A chapter',
        },
        container: {
          title: 'Book Title Here',
        },
        links: {
          previousItem: 'https://jstor.org/stable/book123.1',
          nextItem: 'https://jstor.org/stable/book123.2',
        },
      };

      it('does not show content banner initially', () => {
        pdfIntegration = createPDFIntegration();
        assert.isNull(getBanner());
      });

      it('shows content banner when `showContentInfo` is called', () => {
        pdfIntegration = createPDFIntegration();
        pdfIntegration.showContentInfo(contentInfo);

        const banner = getBanner();
        assert.isNotNull(banner);
        assert.include(banner.shadowRoot.textContent, contentInfo.item.title);
      });
    });

    it('does not show a warning when PDF has selectable text', async () => {
      fakePDFAnchoring.documentHasText.resolves(true);

      pdfIntegration = createPDFIntegration();
      await delay(0); // Wait for text check to complete.

      assert.called(fakePDFAnchoring.documentHasText);
      assert.isNull(getBanner());
    });

    it('does not show a warning if PDF does not load', async () => {
      fakePDFMetadata.getUri.rejects(new Error('Something went wrong'));

      pdfIntegration = createPDFIntegration();
      await delay(0); // Wait for text check to complete.

      assert.notCalled(fakePDFAnchoring.documentHasText);
      assert.isNull(getBanner());
    });

    it('shows a warning when PDF has no selectable text', async () => {
      fakePDFAnchoring.documentHasText.resolves(false);

      pdfIntegration = createPDFIntegration();
      await delay(0); // Wait for text check to complete.

      assert.called(fakePDFAnchoring.documentHasText);
      const banner = getBanner();
      assert.isNotNull(banner);
      assert.include(
        banner.shadowRoot.textContent,
        'This PDF does not contain selectable text',
      );
    });

    it('makes links in the PDF open in a new tab', () => {
      const link = document.createElement('a');
      fakePDFViewerApplication.pdfViewer.viewer.appendChild(link);
      pdfIntegration = createPDFIntegration();

      const event = new Event('click', { bubbles: true, cancelable: true });
      link.dispatchEvent(event);

      assert.equal(link.target, 'blank');
      assert.isFalse(event.defaultPrevented);
    });

    it('prevents default behavior when a link is clicked that is part of a highlight', () => {
      const link = document.createElement('a');
      fakePDFViewerApplication.pdfViewer.viewer.appendChild(link);
      fakeHighlighter.getHighlightsFromPoint.returns([
        document.createElement('dummy-highlight'),
      ]);
      pdfIntegration = createPDFIntegration();

      const event = new Event('click', { bubbles: true, cancelable: true });
      link.dispatchEvent(event);

      assert.isTrue(event.defaultPrevented);
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
          region: document.createRange(),
        };
        fakeAnnotator.anchors.push(anchor);
        return anchor;
      }

      it('re-anchors annotations whose highlights are no longer in the page', async () => {
        const anchor = createAnchor();
        pdfIntegration = createPDFIntegration();

        await triggerUpdate();

        assert.equal(anchor.highlights.length, 0);
        assert.isUndefined(anchor.region);
        assert.calledWith(fakeAnnotator.anchor, anchor.annotation);
      });

      it('does not re-anchor annotations whose highlights are still in the page', async () => {
        const anchor = createAnchor();
        pdfIntegration = createPDFIntegration();

        document.body.appendChild(anchor.highlights[0]);

        try {
          await triggerUpdate();

          assert.equal(anchor.highlights.length, 1);
          assert.ok(anchor.region);
          assert.notCalled(fakeAnnotator.anchor);
        } finally {
          anchor.highlights[0].remove();
        }
      });
    });

    describe('#contentContainer', () => {
      let container;
      afterEach(() => {
        container?.remove();
      });

      it('returns main PDF viewer content element', () => {
        container = document.createElement('div');
        container.id = 'viewerContainer';
        document.body.appendChild(container);

        pdfIntegration = createPDFIntegration();

        assert.equal(pdfIntegration.contentContainer(), container);
      });
    });

    describe('#fitSideBySide', () => {
      const sandbox = sinon.createSandbox();
      afterEach(() => {
        sandbox.restore();
      });

      function pdfContainer() {
        return fakePDFViewerApplication.appConfig.appContainer;
      }

      it('resizes and activates side-by-side mode when sidebar expanded', () => {
        sandbox.stub(window, 'innerWidth').value(1350);
        pdfIntegration = createPDFIntegration();
        assert.isFalse(pdfIntegration.sideBySideActive());

        const active = pdfIntegration.fitSideBySide({
          expanded: true,
          width: 428,
          height: 728,
        });

        assert.isTrue(active);
        assert.isTrue(pdfIntegration.sideBySideActive());
        assert.calledOnce(fakePDFViewerApplication.pdfViewer.update);
        assert.equal(pdfContainer().style.width, 'calc(100% - 428px)');
      });

      /**
       * For each of the relative zoom modes supported by PDF.js, PDFSidebar
       * should re-set the `currentScale` value, which will prompt PDF.js
       * to re-calculate the zoom/viewport. Then, `pdfViewer.update()` will
       * re-render the PDF pages as needed for the dirtied viewport/scaling.
       * These tests are primarily for test coverage of these zoom modes.
       */
      ['auto', 'page-fit', 'page-width'].forEach(zoomMode => {
        it('activates side-by-side mode for each relative zoom mode', () => {
          fakePDFViewerApplication.pdfViewer.currentScaleValue = zoomMode;
          sandbox.stub(window, 'innerWidth').value(1350);
          pdfIntegration = createPDFIntegration();

          const active = pdfIntegration.fitSideBySide({
            expanded: true,
            width: 428,
            height: 728,
          });

          assert.isTrue(active);
          assert.isTrue(pdfIntegration.sideBySideActive());
          assert.calledOnce(fakePDFViewerApplication.pdfViewer.update);
          assert.equal(pdfContainer().style.width, 'calc(100% - 428px)');
        });
      });

      it('deactivates side-by-side mode when sidebar collapsed', () => {
        sandbox.stub(window, 'innerWidth').value(1350);
        pdfIntegration = createPDFIntegration();

        const active = pdfIntegration.fitSideBySide({
          expanded: false,
          width: 428,
          height: 728,
          toolbarWidth: 115,
        });

        assert.isFalse(active);
        assert.isFalse(pdfIntegration.sideBySideActive());
        assert.equal(pdfContainer().style.width, 'calc(100% - 115px)');
      });

      it('does not activate side-by-side mode if there is not enough room', () => {
        sandbox.stub(window, 'innerWidth').value(800);
        pdfIntegration = createPDFIntegration();

        const active = pdfIntegration.fitSideBySide({
          expanded: true,
          width: 428,
          height: 728,
          toolbarWidth: 115,
        });

        assert.isFalse(active);
        assert.isFalse(pdfIntegration.sideBySideActive());
        assert.calledOnce(fakePDFViewerApplication.pdfViewer.update);
        assert.equal(pdfContainer().style.width, 'calc(100% - 115px)');
      });
    });

    describe('#scrollToAnchor', () => {
      it('scrolls to first highlight of anchor', async () => {
        const highlight = document.createElement('div');
        const offset = 42;
        const integration = createPDFIntegration();
        fakeScrollUtils.computeScrollOffset
          .withArgs(integration.contentContainer(), highlight, {
            position: 'center',
          })
          .returns(offset);

        const anchor = { highlights: [highlight] };
        await integration.scrollToAnchor(anchor);

        assert.calledOnce(fakeScrollUtils.scrollElement);
        assert.calledWith(
          fakeScrollUtils.scrollElement,
          integration.contentContainer(),
          offset,
        );
      });

      it('does not scroll if anchor has no highlights', async () => {
        const integration = createPDFIntegration();
        const anchor = {};

        await integration.scrollToAnchor(anchor);

        assert.notCalled(fakeScrollUtils.scrollElement);
      });

      /**
       * Create an anchor whose highlight is inside a placeholder for a non-rendered
       * PDF page.
       */
      function createPlaceholderHighlight() {
        const container = document.createElement('div');
        const placeholder = createPlaceholder(container);
        const highlight = document.createElement('div');
        placeholder.append(highlight);
        return highlight;
      }

      it('waits for anchors in placeholders to be re-anchored and scrolls to final highlight', async () => {
        const placeholderHighlight = createPlaceholderHighlight();
        const integration = createPDFIntegration();
        fakeScrollUtils.computeScrollOffset
          .withArgs(integration.contentContainer(), placeholderHighlight)
          .returns(50);
        const annotation = { $tag: 'tag1' };
        const anchor = { annotation, highlights: [placeholderHighlight] };

        // Check that the PDF content was scrolled to the approximate position of
        // the anchor, indicated by the placeholder.
        const scrollDone = integration.scrollToAnchor(anchor);
        assert.calledWith(
          fakeScrollUtils.scrollElement,
          integration.contentContainer(),
          50,
        );

        // Simulate a delay while rendering of the text layer for the page happens
        // and re-anchoring completes.
        await delay(5);

        // Create a new anchor for the annotation created by re-anchoring.
        const finalHighlight = document.createElement('div');
        fakeScrollUtils.scrollElement.resetHistory();
        fakeAnnotator.anchors.push({
          annotation,
          highlights: [finalHighlight],
        });
        fakeScrollUtils.computeScrollOffset
          .withArgs(integration.contentContainer(), finalHighlight)
          .returns(150);

        await scrollDone;

        // Check that we scrolled to the location of the final highlight.
        assert.calledWith(
          fakeScrollUtils.scrollElement,
          integration.contentContainer(),
          150,
        );
      });

      it('skips scrolling to final anchor if re-anchoring does not complete within timeout', async () => {
        const highlight = createPlaceholderHighlight();
        const integration = createPDFIntegration({ reanchoringMaxWait: 10 });
        const annotation = { $tag: 'tag1' };
        const anchor = { annotation, highlights: [highlight] };

        const scrollDone = integration.scrollToAnchor(anchor);
        await delay(5); // Simulate delay in re-anchoring
        fakeScrollUtils.scrollElement.resetHistory();

        // Wait until the re-anchoring timeout expires.
        await scrollDone;

        assert.notCalled(fakeScrollUtils.scrollElement);
      });

      it('skips scrolling to final anchor if re-anchoring fails', async () => {
        const placeholderHighlight = createPlaceholderHighlight();
        const integration = createPDFIntegration();
        const annotation = { $tag: 'tag1' };
        const anchor = { annotation, highlights: [placeholderHighlight] };

        const scrollDone = integration.scrollToAnchor(anchor);
        await delay(5);
        fakeScrollUtils.scrollElement.resetHistory();

        // Simulate re-anchoring failing (anchor has no `highlights` field). The
        // PDF should remain scrolled to the location of the placeholder highlight.
        fakeAnnotator.anchors.push({ annotation });
        await scrollDone;

        assert.notCalled(fakeScrollUtils.scrollElement);
      });
    });

    describe('#supportedTools', () => {
      it('returns "selection" if `pdf_image_annotation` flag is disabled', () => {
        pdfIntegration = createPDFIntegration();
        assert.deepEqual(pdfIntegration.supportedTools(), ['selection']);
      });

      it('returns "selection" and "rect" if `pdf_image_annotation` flag is enabled', () => {
        const features = new FeatureFlags(['pdf_image_annotation']);
        pdfIntegration = createPDFIntegration({ features });
        features.update({ pdf_image_annotation: true });
        assert.deepEqual(pdfIntegration.supportedTools(), [
          'selection',
          'rect',
          'point',
        ]);
      });

      it('emits "supportedToolsChanged" flag when tools change', () => {
        const features = new FeatureFlags(['pdf_image_annotation']);
        pdfIntegration = createPDFIntegration({ features });
        const supportedToolsChanged = sinon.stub();
        pdfIntegration.on('supportedToolsChanged', supportedToolsChanged);

        features.update({ pdf_image_annotation: true });

        assert.calledWith(supportedToolsChanged, [
          'selection',
          'rect',
          'point',
        ]);
      });
    });

    describe('#renderToBitmap', () => {
      const pageIndex = 1;

      const rectShapeSelector = {
        type: 'ShapeSelector',
        shape: {
          type: 'rect',
          left: 0,
          top: 100,
          bottom: 0,
          right: 100,
        },
      };

      const pointShapeSelector = {
        type: 'ShapeSelector',
        shape: {
          type: 'point',
          x: 50,
          y: 50,
        },
      };

      const pageSelector = {
        type: 'PageSelector',
        index: pageIndex,
      };

      const createShapeSelector = (type, coords) => {
        return {
          type: 'ShapeSelector',
          shape: {
            type,
            ...coords,
          },
        };
      };

      it('rejects if anchor has no shape selector', async () => {
        pdfIntegration = createPDFIntegration();
        const anchor = {
          target: {
            selector: [],
          },
        };
        let err;
        try {
          await pdfIntegration.renderToBitmap(anchor, {});
        } catch (e) {
          err = e;
        }
        assert.instanceOf(err, Error);
        assert.equal(
          err.message,
          'Can only render bitmaps for anchors with shapes',
        );
      });

      it('rejects if shape type is unknown', async () => {
        pdfIntegration = createPDFIntegration();
        const anchor = {
          target: {
            selector: [
              pageSelector,
              {
                type: 'ShapeSelector',
                shape: {
                  type: 'star',
                },
              },
            ],
          },
        };
        let err;
        try {
          await pdfIntegration.renderToBitmap(anchor, {});
        } catch (e) {
          err = e;
        }
        assert.instanceOf(err, Error);
        assert.equal(err.message, 'Unsupported shape type');
      });

      it('rejects if page index is invalid', async () => {
        pdfIntegration = createPDFIntegration();
        fakePDFViewerApplication.pdfViewer.getPageView = () => undefined;
        const invalidPageSelector = {
          type: 'PageSelector',
          index: 500,
        };
        const anchor = {
          target: {
            selector: [rectShapeSelector, invalidPageSelector],
          },
        };
        let err;
        try {
          await pdfIntegration.renderToBitmap(anchor, {});
        } catch (e) {
          err = e;
        }
        assert.instanceOf(err, Error);
        assert.equal(err.message, 'Failed to get page view');
      });

      [
        // Rendering with no options
        {
          shapeSelector: rectShapeSelector,
          renderOptions: {},
          expectedViewport: {
            rotation: 0,
            scale: 96 / 72,
            userUnit: 1 / 72,
            viewBox: [0, 0, 100, 100],
          },
        },
        {
          shapeSelector: pointShapeSelector,
          renderOptions: {},
          expectedViewport: {
            rotation: 0,
            scale: 96 / 72,
            userUnit: 1 / 72,
            viewBox: [40, 40, 60, 60],
          },
        },
        // Rendering on a HiDPI display
        {
          shapeSelector: rectShapeSelector,
          renderOptions: {
            devicePixelRatio: 2,
          },
          expectedViewport: {
            rotation: 0,
            scale: (96 / 72) * 2,
            userUnit: 1 / 72,
            viewBox: [0, 0, 100, 100],
          },
        },
        // Rendering with max width that is half of the natural width
        {
          shapeSelector: rectShapeSelector,
          renderOptions: {
            maxWidth: 50,
          },
          expectedViewport: {
            rotation: 0,
            scale: 0.5,
            userUnit: 1 / 72,
            viewBox: [0, 0, 100, 100],
          },
        },
        // Empty rectangle
        {
          shapeSelector: createShapeSelector('rect', {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }),
          expectedViewport: {
            rotation: 0,
            scale: 96 / 72,
            userUnit: 1 / 72,
            viewBox: [0, 0, 1, 1],
          },
        },
        // Rectangle with negative width and height
        {
          shapeSelector: createShapeSelector('rect', {
            left: 100,
            right: 0,
            top: 0,
            bottom: 100,
          }),
          expectedViewport: {
            rotation: 0,
            scale: 96 / 72,
            userUnit: 1 / 72,
            viewBox: [0, 0, 100, 100],
          },
        },
        // Rectangle with a very wide aspect ratio, such that after scaling
        // the thumbnail to fit `maxWidth`, the height is zero.
        {
          shapeSelector: createShapeSelector('rect', {
            left: 0,
            right: 101,
            top: 0,
            bottom: 0,
          }),
          renderOptions: {
            maxWidth: 100,
          },
          expectedViewport: {
            rotation: 0,
            scale: sinon.match.number,
            userUnit: 1 / 72,
            viewBox: [0, 0, 101, 1],
          },
        },
        // Rotated page
        {
          shapeSelector: rectShapeSelector,
          renderOptions: {},
          pageRotation: 90,
          expectedViewport: {
            rotation: 90,
            scale: 96 / 72,
            userUnit: 1 / 72,
            viewBox: [0, 0, 100, 100],
          },
        },
      ].forEach(
        ({
          renderOptions = {},
          shapeSelector,
          expectedViewport,
          pageRotation = 0,
        }) => {
          it('renders bitmap with given options', async () => {
            pdfIntegration = createPDFIntegration();
            const anchor = {
              target: {
                selector: [shapeSelector, pageSelector],
              },
            };
            const pageView =
              fakePDFViewerApplication.pdfViewer.getPageView(pageIndex);
            pageView.pdfPage.rotate = pageRotation;

            const renderSpy = sinon.spy(pageView.pdfPage, 'render');

            const bitmap = await pdfIntegration.renderToBitmap(
              anchor,
              renderOptions,
            );

            assert.instanceOf(bitmap, ImageBitmap);
            assert.calledOnce(renderSpy);
            const renderArgs = renderSpy.lastCall.args[0];
            assert.instanceOf(
              renderArgs.canvasContext,
              OffscreenCanvasRenderingContext2D,
            );
            assert.match(renderArgs.viewport, sinon.match(expectedViewport));
          });
        },
      );
    });
  });
});
