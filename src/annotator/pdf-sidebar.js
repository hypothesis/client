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

    this.window = /** @type {HypothesisWindow} */ (window);
    this.pdfViewer = this.window.PDFViewerApplication?.pdfViewer;
    this.pdfContainer = this.window.PDFViewerApplication?.appConfig?.appContainer;
  }

  /**
   * Return the minimum width that the PDF viewer requires to be usable.
   * This determines whether opening the sidebar activates side-by-side mode
   */
  minSideBySideWidth() {
    return MIN_PDF_WIDTH;
  }

  /**
   * Set the PDF.js container element to the designated `width` and
   * activate side-by-side mode.
   *
   * @param {number} sidebarWidth - in pixels
   */
  activateSideBySide(sidebarWidth) {
    const width = window.innerWidth - sidebarWidth;
    this.pdfContainer.style.width = width + 'px';
    this.pdfContainer.classList.add('hypothesis-side-by-side');

    this._updateViewerAfterResize();
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

    this._updateViewerAfterResize();
  }

  _updateViewerAfterResize() {
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
  }
}
