import Sidebar from './sidebar';

/**
 * @typedef {import('../types/annotator').HypothesisWindow} HypothesisWindow
 */

const defaultConfig = {
  TextSelection: {},
  PDF: {},
  BucketBar: {
    container: '.annotator-frame',
    scrollables: ['#viewerContainer'],
  },
  Toolbar: {
    container: '.annotator-frame',
  },
};

export default class PdfSidebar extends Sidebar {
  constructor(element, config) {
    super(element, { ...defaultConfig, ...config });

    this.lastSidebarLayoutState = {
      expanded: false,
      width: 0,
      height: 0,
    };

    this.window = /** @type {HypothesisWindow} */ (window);
    this.pdfViewer = this.window.PDFViewerApplication?.pdfViewer;

    if (this.plugins?.PDF && this.pdfViewer) {
      this.subscribe('sidebarLayoutChanged', state => this.pageFit(state));
      window.addEventListener('resize', () => this.pageFit());
    }
  }

  pageFit(sidebarLayoutState) {
    if (!sidebarLayoutState) {
      sidebarLayoutState = this.lastLayoutState;
    }
    const pdfContainerEl = document.getElementById('outerContainer');

    if (pdfContainerEl) {
      const maximumWidthToFit =
        this.window.innerWidth - sidebarLayoutState.width;
      pdfContainerEl.style.width = maximumWidthToFit + 'px';

      // From PDFJS `webViewerResize`
      const currentScaleValue = this.pdfViewer.currentScaleValue;
      if (
        currentScaleValue === 'auto' ||
        currentScaleValue === 'page-fit' ||
        currentScaleValue === 'page-width'
      ) {
        this.pdfViewer.currentScaleValue = currentScaleValue;
      }
      this.pdfViewer.update();
    }

    this.lastLayoutState = sidebarLayoutState;
  }
}
