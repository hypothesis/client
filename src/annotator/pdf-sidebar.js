import Sidebar from './sidebar';

/**
 * @typedef {import('../types/annotator').HypothesisWindow} HypothesisWindow
 * @typedef {import('./sidebar').LayoutState} LayoutState
 */

const defaultConfig = {
  PDF: {},
  BucketBar: {
    container: '.annotator-frame',
    scrollables: ['#viewerContainer'],
  },
};

// The viewport and controls for PDF.js start breaking down below about 670px
// of available space, so only render PDF and sidebar side-by-side if there
// is enough room. Otherwise, allow sidebar to overlap PDF
const MIN_PDF_WIDTH = 680;

export default class PdfSidebar extends Sidebar {
  constructor(element, config) {
    super(element, { ...defaultConfig, ...config });

    this._lastSidebarLayoutState = {
      expanded: false,
      width: 0,
      height: 0,
    };

    this.window = /** @type {HypothesisWindow} */ (window);
    this.pdfViewer = this.window.PDFViewerApplication?.pdfViewer;
    this.pdfContainer = this.window.PDFViewerApplication?.appConfig?.appContainer;

    // Is the PDF currently displayed side-by-side with the sidebar?
    this.sideBySideActive = false;

    this.subscribe('sidebarLayoutChanged', state => this.fitSideBySide(state));
    this.window.addEventListener('resize', () => this.fitSideBySide());
  }

  /**
   * Set the PDF.js container element to the designated `width` and
   * activate side-by-side mode.
   *
   * @param {number} width - in pixels
   */
  activateSideBySide(width) {
    this.sideBySideActive = true;
    this.closeSidebarOnDocumentClick = false;
    this.pdfContainer.style.width = width + 'px';
    this.pdfContainer.classList.add('hypothesis-side-by-side');
  }

  /**
   * Deactivate side-by-side mode and allow PDF.js pages to render at
   * whatever width the current full-page viewport allows.
   */
  deactivateSideBySide() {
    this.sideBySideActive = false;
    this.closeSidebarOnDocumentClick = true;
    this.pdfContainer.style.width = 'auto';
    this.pdfContainer.classList.remove('hypothesis-side-by-side');
  }

  /**
   * Attempt to make the PDF viewer and the sidebar fit side-by-side without
   * overlap if there is enough room in the viewport to do so reasonably.
   * Resize the PDF viewer container element to leave the right amount of room
   * for the sidebar, and prompt PDF.js to re-render the PDF pages to scale
   * within that resized container.
   *
   * @param {LayoutState} [sidebarLayoutState]
   */
  fitSideBySide(sidebarLayoutState) {
    if (!sidebarLayoutState) {
      sidebarLayoutState = /** @type {LayoutState} */ (this
        ._lastSidebarLayoutState);
    }
    const maximumWidthToFit = this.window.innerWidth - sidebarLayoutState.width;
    if (sidebarLayoutState.expanded && maximumWidthToFit >= MIN_PDF_WIDTH) {
      this.activateSideBySide(maximumWidthToFit);
    } else {
      this.deactivateSideBySide();
    }

    // The following logic is pulled from PDF.js `webViewerResize`
    const currentScaleValue = this.pdfViewer.currentScaleValue;
    if (
      currentScaleValue === 'auto' ||
      currentScaleValue === 'page-fit' ||
      currentScaleValue === 'page-width'
    ) {
      // NB: There is logic within the setter for `currentScaleValue`
      // Setting this scale value will prompt PDF.js to recalculate viewport
      this.pdfViewer.currentScaleValue = currentScaleValue;
    }
    // This will cause PDF pages to re-render if their scaling has changed
    this.pdfViewer.update();

    this._lastSidebarLayoutState = sidebarLayoutState;
  }
}
