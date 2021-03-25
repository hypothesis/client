import debounce from 'lodash.debounce';
import { render } from 'preact';

import { anchor, describe, documentHasText } from '../anchoring/pdf';
import WarningBanner from '../components/WarningBanner';
import RenderingStates from '../pdfjs-rendering-states';
import { createShadowRoot } from '../util/shadow-root';
import { ListenerCollection } from '../util/listener-collection';

import { PDFMetadata } from './pdf-metadata';

/**
 * @typedef {import('../../types/annotator').Anchor} Anchor
 * @typedef {import('../../types/annotator').Annotator} Annotator
 * @typedef {import('../../types/annotator').HypothesisWindow} HypothesisWindow
 * @typedef {import('../../types/api').Selector} Selector
 * @typedef {import('../sidebar').LayoutState} LayoutState
 */

// The viewport and controls for PDF.js start breaking down below about 670px
// of available space, so only render PDF and sidebar side-by-side if there
// is enough room. Otherwise, allow sidebar to overlap PDF
const MIN_PDF_WIDTH = 680;

export class PDFIntegration {
  /**
   * @param {Annotator} annotator
   */
  constructor(annotator) {
    this.annotator = annotator;

    const window_ = /** @type {HypothesisWindow} */ (window);
    this.pdfViewer = window_.PDFViewerApplication.pdfViewer;
    this.pdfViewer.viewer.classList.add('has-transparent-text-layer');

    // Get the element that contains all of the PDF.js UI. This is typically
    // `document.body`.
    this.pdfContainer = window_.PDFViewerApplication?.appConfig?.appContainer;

    this.pdfMetadata = new PDFMetadata(window_.PDFViewerApplication);

    this.observer = new MutationObserver(debounce(() => this._update(), 100));
    this.observer.observe(this.pdfViewer.viewer, {
      attributes: true,
      attributeFilter: ['data-loaded'],
      childList: true,
      subtree: true,
    });

    /**
     * A banner shown at the top of the PDF viewer warning the user if the PDF
     * is not suitable for use with Hypothesis.
     *
     * @type {HTMLElement|null}
     */
    this._warningBanner = null;
    this._checkForSelectableText();

    // Hide annotation layer when the user is making a selection. The annotation
    // layer appears above the invisible text layer and can interfere with text
    // selection. See https://github.com/hypothesis/client/issues/1464.
    this._updateAnnotationLayerVisibility = () => {
      const selection = /** @type {Selection} */ (window_.getSelection());

      // Add CSS class to indicate whether there is a selection. Annotation
      // layers are then hidden by a CSS rule in `pdfjs-overrides.scss`.
      this.pdfViewer.viewer.classList.toggle(
        'is-selecting',
        !selection.isCollapsed
      );
    };

    this._listeners = new ListenerCollection();
    this._listeners.add(
      document,
      'selectionchange',
      this._updateAnnotationLayerVisibility
    );

    // A flag that indicates whether `destroy` has been called. Used to handle
    // `destroy` being called during async code elsewhere in the class.
    this._destroyed = false;
  }

  destroy() {
    this._listeners.removeAll();
    this.pdfViewer.viewer.classList.remove('has-transparent-text-layer');
    this.observer.disconnect();
    this._destroyed = true;
  }

  /**
   * Return the URL of the currently loaded PDF document.
   */
  uri() {
    return this.pdfMetadata.getUri();
  }

  /**
   * Return the metadata (eg. title) for the currently loaded PDF document.
   */
  getMetadata() {
    return this.pdfMetadata.getMetadata();
  }

  /**
   * Resolve serialized `selectors` from an annotation to a range.
   *
   * @param {HTMLElement} root
   * @param {Selector[]} selectors
   * @return {Promise<Range>}
   */
  anchor(root, selectors) {
    // nb. The `root` argument is not really used by `anchor`. It existed for
    // consistency between HTML and PDF anchoring and could be removed.
    return anchor(root, selectors);
  }

  /**
   * Generate selectors for the text in `range`.
   *
   * @param {HTMLElement} root
   * @param {Range} range
   * @return {Promise<Selector[]>}
   */
  describe(root, range) {
    // nb. The `root` argument is not really used by `anchor`. It existed for
    // consistency between HTML and PDF anchoring and could be removed.
    return describe(root, range);
  }

  /**
   * Check whether the PDF has selectable text and show a warning if not.
   */
  async _checkForSelectableText() {
    // Wait for PDF to load.
    try {
      await this.uri();
    } catch (e) {
      return;
    }

    // Handle `PDF` instance being destroyed while URI is fetched. This is only
    // expected to happen in synchronous tests.
    if (this._destroyed) {
      return;
    }

    try {
      const hasText = await documentHasText();
      this._showNoSelectableTextWarning(!hasText);
    } catch (err) {
      /* istanbul ignore next */
      console.warn('Unable to check for text in PDF:', err);
    }
  }

  /**
   * Set whether the warning about a PDF's suitability for use with Hypothesis
   * is shown.
   *
   * @param {boolean} showWarning
   */
  _showNoSelectableTextWarning(showWarning) {
    // Get a reference to the top-level DOM element associated with the PDF.js
    // viewer.
    const outerContainer = /** @type {HTMLElement} */ (document.querySelector(
      '#outerContainer'
    ));

    if (!showWarning) {
      this._warningBanner?.remove();
      this._warningBanner = null;

      // Undo inline styles applied when the banner is shown. The banner will
      // then gets its normal 100% height set by PDF.js's CSS.
      outerContainer.style.height = '';

      return;
    }

    this._warningBanner = document.createElement('hypothesis-banner');
    document.body.prepend(this._warningBanner);

    const warningBannerContent = createShadowRoot(this._warningBanner);
    render(<WarningBanner />, warningBannerContent);

    const bannerHeight = this._warningBanner.getBoundingClientRect().height;

    // The `#outerContainer` element normally has height set to 100% of the body.
    //
    // Reduce this by the height of the banner so that it doesn't extend beyond
    // the bottom of the viewport.
    //
    // We don't currently handle the height of the banner changing here.
    outerContainer.style.height = `calc(100% - ${bannerHeight}px)`;
  }

  // This method (re-)anchors annotations when pages are rendered and destroyed.
  _update() {
    // A list of annotations that need to be refreshed.
    const refreshAnnotations = [];

    const pageCount = this.pdfViewer.pagesCount;
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const page = this.pdfViewer.getPageView(pageIndex);
      if (!page.textLayer?.renderingDone) {
        continue;
      }

      // Detect what needs to be done by checking the rendering state.
      switch (page.renderingState) {
        case RenderingStates.INITIAL:
          // This page has been reset to its initial state so its text layer
          // is no longer valid. Null it out so that we don't process it again.
          page.textLayer = null;
          break;
        case RenderingStates.FINISHED:
          // This page is still rendered. If it has a placeholder node that
          // means the PDF anchoring module anchored annotations before it was
          // rendered. Remove this, which will cause the annotations to anchor
          // again, below.
          {
            const placeholder = page.div.querySelector(
              '.annotator-placeholder'
            );
            placeholder?.parentNode.removeChild(placeholder);
          }
          break;
      }
    }

    // Find all the anchors that have been invalidated by page state changes.
    for (let anchor of this.annotator.anchors) {
      // Skip any we already know about.
      if (anchor.highlights) {
        if (refreshAnnotations.includes(anchor.annotation)) {
          continue;
        }

        // If the highlights are no longer in the document it means that either
        // the page was destroyed by PDF.js or the placeholder was removed above.
        // The annotations for these anchors need to be refreshed.
        for (let index = 0; index < anchor.highlights.length; index++) {
          const hl = anchor.highlights[index];
          if (!document.body.contains(hl)) {
            anchor.highlights.splice(index, 1);
            delete anchor.range;
            refreshAnnotations.push(anchor.annotation);
            break;
          }
        }
      }
    }

    refreshAnnotations.map(annotation => this.annotator.anchor(annotation));
  }

  /**
   * Return the scrollable element which contains the document content.
   *
   * @return {HTMLElement}
   */
  contentContainer() {
    return /** @type {HTMLElement} */ (document.querySelector(
      '#viewerContainer'
    ));
  }

  /**
   * Attempt to make the PDF viewer and the sidebar fit side-by-side without
   * overlap if there is enough room in the viewport to do so reasonably.
   * Resize the PDF viewer container element to leave the right amount of room
   * for the sidebar, and prompt PDF.js to re-render the PDF pages to scale
   * within that resized container.
   *
   * @param {LayoutState} sidebarLayout
   * @return {boolean} - True if side-by-side mode was activated
   */
  fitSideBySide(sidebarLayout) {
    const maximumWidthToFit = window.innerWidth - sidebarLayout.width;
    const active = sidebarLayout.expanded && maximumWidthToFit >= MIN_PDF_WIDTH;

    this.pdfContainer.style.width = active ? maximumWidthToFit + 'px' : 'auto';
    this.pdfContainer.classList.toggle('hypothesis-side-by-side', active);

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

    return active;
  }
}
