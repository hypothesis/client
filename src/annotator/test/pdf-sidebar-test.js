import PdfSidebar from '../pdf-sidebar';
import { $imports } from '../pdf-sidebar';

describe('PdfSidebar', () => {
  const sandbox = sinon.createSandbox();
  let CrossFrame;
  let fakeCrossFrame;

  let fakePDFViewerApplication;
  let fakePDFContainer;
  let fakePDFViewerUpdate;
  const sidebarConfig = { pluginClasses: {} };

  const createPdfSidebar = config => {
    config = { ...sidebarConfig, ...config };

    const element = document.createElement('div');
    return new PdfSidebar(element, config);
  };

  beforeEach(() => {
    sandbox.stub(PdfSidebar.prototype, '_setupGestures');
    fakePDFContainer = document.createElement('div');
    fakePDFViewerUpdate = sinon.stub();

    fakePDFViewerApplication = {
      appConfig: {
        appContainer: fakePDFContainer,
      },
      pdfViewer: {
        currentScaleValue: 'auto',
        update: fakePDFViewerUpdate,
      },
    };
    // See https://github.com/sinonjs/sinon/issues/1537
    // Can't stub an undefined property in a sandbox
    window.PDFViewerApplication = fakePDFViewerApplication;

    // From `Sidebar.js` tests
    fakeCrossFrame = {};
    fakeCrossFrame.onConnect = sandbox.stub().returns(fakeCrossFrame);
    fakeCrossFrame.on = sandbox.stub().returns(fakeCrossFrame);
    fakeCrossFrame.call = sandbox.spy();
    fakeCrossFrame.destroy = sandbox.stub();

    const fakeBucketBar = {};
    fakeBucketBar.element = document.createElement('div');
    fakeBucketBar.destroy = sandbox.stub();

    CrossFrame = sandbox.stub();
    CrossFrame.returns(fakeCrossFrame);

    const BucketBar = sandbox.stub();
    BucketBar.returns(fakeBucketBar);

    sidebarConfig.pluginClasses.CrossFrame = CrossFrame;
    sidebarConfig.pluginClasses.BucketBar = BucketBar;
  });

  afterEach(() => {
    delete window.PDFViewerApplication;
    sandbox.restore();
    $imports.$restore();
  });

  context('side-by-side mode configured', () => {
    describe('when window is resized', () => {
      it('attempts to lay out side-by-side', () => {
        sandbox.stub(window, 'innerWidth').value(1300);
        const sidebar = createPdfSidebar();

        window.dispatchEvent(new Event('resize'));

        // PDFSidebar.fitSideBySide is invoked with no argument, so
        // `sidebar.lastSidebarLayoutState` is used. By default, the sidebar
        // is not `expanded`, so side-by-side will not activate here (it only
        // activates if sidebar is `expanded` in its layout state)
        assert.isFalse(sidebar.sideBySideActive);
        // However, the PDF container is always updated on a resize
        assert.calledOnce(fakePDFViewerUpdate);
      });

      it('resizes and activates side-by-side mode', () => {
        sandbox.stub(window, 'innerWidth').value(1300);
        const sidebar = createPdfSidebar();
        sidebar._lastSidebarLayoutState = {
          expanded: true,
          width: 428,
          height: 800,
        };

        window.dispatchEvent(new Event('resize'));

        // Since `sidebar._lastSidebarLayoutState` has `expanded: true`,
        // side-by-side mode can be activated if there is enough room...
        assert.isTrue(sidebar.sideBySideActive);
        assert.calledOnce(fakePDFViewerUpdate);
        assert.equal(fakePDFContainer.style.width, 1300 - 428 + 'px');
      });

      it('does not activate side-by-side mode if there is not enough room', () => {
        sandbox.stub(window, 'innerWidth').value(800);
        const sidebar = createPdfSidebar();
        sidebar._lastSidebarLayoutState = {
          expanded: true,
          width: 428,
          height: 800,
        };

        window.dispatchEvent(new Event('resize'));

        // Since `sidebar._lastSidebarLayoutState` has `expanded: true`,
        // side-by-side mode can be activated if there is enough room...
        assert.isFalse(sidebar.sideBySideActive);
        assert.calledOnce(fakePDFViewerUpdate);
        assert.equal(fakePDFContainer.style.width, 'auto');
      });
    });

    describe('when sidebar layout state changes', () => {
      it('resizes and activates side-by-side mode when sidebar expanded', () => {
        sandbox.stub(window, 'innerWidth').value(1350);
        const sidebar = createPdfSidebar();

        sidebar.publish('sidebarLayoutChanged', [
          { expanded: true, width: 428, height: 728 },
        ]);

        assert.isTrue(sidebar.sideBySideActive);
        assert.calledOnce(fakePDFViewerUpdate);
        assert.equal(fakePDFContainer.style.width, 1350 - 428 + 'px');
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
          const sidebar = createPdfSidebar();

          sidebar.publish('sidebarLayoutChanged', [
            { expanded: true, width: 428, height: 728 },
          ]);

          assert.isTrue(sidebar.sideBySideActive);
          assert.calledOnce(fakePDFViewerUpdate);
          assert.equal(fakePDFContainer.style.width, 1350 - 428 + 'px');
        });
      });

      it('deactivates side-by-side mode when sidebar collapsed', () => {
        sandbox.stub(window, 'innerWidth').value(1350);
        const sidebar = createPdfSidebar();

        sidebar.publish('sidebarLayoutChanged', [
          { expanded: false, width: 428, height: 728 },
        ]);

        assert.isFalse(sidebar.sideBySideActive);
        assert.equal(fakePDFContainer.style.width, 'auto');
      });

      it('does not activate side-by-side mode if there is not enough room', () => {
        sandbox.stub(window, 'innerWidth').value(800);
        const sidebar = createPdfSidebar();

        sidebar.publish('sidebarLayoutChanged', [
          { expanded: true, width: 428, height: 728 },
        ]);

        assert.isFalse(sidebar.sideBySideActive);
        assert.calledOnce(fakePDFViewerUpdate);
        assert.equal(fakePDFContainer.style.width, 'auto');
      });
    });
  });
});
