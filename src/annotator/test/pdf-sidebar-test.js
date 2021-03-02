import PdfSidebar from '../pdf-sidebar';
import Delegator from '../delegator';

import { mockBaseClass } from '../../test-util/mock-base';

class FakeSidebar extends Delegator {
  constructor(element, guest, config) {
    super(element, config);
    this.guest = guest;
  }

  _registerEvent(target, event, callback) {
    target.addEventListener(event, callback);
  }
}

describe('PdfSidebar', () => {
  const sandbox = sinon.createSandbox();

  let fakeGuest;
  let fakePDFViewerApplication;
  let fakePDFContainer;
  let fakePDFViewerUpdate;

  const createPdfSidebar = config => {
    const element = document.createElement('div');
    return new PdfSidebar(element, fakeGuest, config);
  };

  let unmockSidebar;

  beforeEach(() => {
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

    fakeGuest = {
      closeSidebarOnDocumentClick: true,
    };

    unmockSidebar = mockBaseClass(PdfSidebar, FakeSidebar);
  });

  afterEach(() => {
    delete window.PDFViewerApplication;
    sandbox.restore();
    unmockSidebar();
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

      it('disables closing sidebar on document click when side-by-side is active', () => {
        const sidebar = createPdfSidebar();
        sidebar.activateSideBySide();
        assert.isFalse(fakeGuest.closeSidebarOnDocumentClick);
      });

      it('enables closing sidebar on document click when side-by-side is inactive', () => {
        const sidebar = createPdfSidebar();
        sidebar.deactivateSideBySide();
        assert.isTrue(fakeGuest.closeSidebarOnDocumentClick);
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
