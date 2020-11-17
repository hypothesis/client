import debounce from 'lodash.debounce';
import { Fragment, createElement, render } from 'preact';

import * as pdfAnchoring from '../anchoring/pdf';
import Delegator from '../delegator';
import RenderingStates from '../pdfjs-rendering-states';

import PDFMetadata from './pdf-metadata';
import SvgIcon from '../../shared/components/svg-icon';

/**
 * @typedef {import('../../types/annotator').Anchor} Anchor
 * @typedef {import('../../types/annotator').Annotator} Annotator
 * @typedef {import('../../types/annotator').HypothesisWindow} HypothesisWindow
 */

/**
 * A banner shown at the top of the PDF viewer if the PDF cannot be annotated
 * by Hypothesis.
 */
function WarningBanner() {
  return (
    <Fragment>
      <div className="annotator-pdf-warning-banner__type">
        <SvgIcon
          name="caution"
          className="annotator-pdf-warning-banner__icon"
        />
      </div>
      <div className="annotator-pdf-warning-banner__message">
        <strong>This PDF does not contain selectable text:</strong>{' '}
        <a
          target="_blank"
          rel="noreferrer"
          href="https://web.hypothes.is/help/how-to-ocr-optimize-pdfs/"
        >
          Learn how to fix this
        </a>{' '}
        in order to annotate with Hypothesis.
      </div>
    </Fragment>
  );
}

export default class PDF extends Delegator {
  /**
   * @param {Annotator} annotator
   */
  constructor(element, config, annotator) {
    super(element, config);

    this.annotator = annotator;
    annotator.anchoring = pdfAnchoring;

    const window_ = /** @type {HypothesisWindow} */ (window);
    this.pdfViewer = window_.PDFViewerApplication.pdfViewer;
    this.pdfViewer.viewer.classList.add('has-transparent-text-layer');

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

    document.addEventListener(
      'selectionchange',
      this._updateAnnotationLayerVisibility
    );
  }

  destroy() {
    document.removeEventListener(
      'selectionchange',
      this._updateAnnotationLayerVisibility
    );
    this.pdfViewer.viewer.classList.remove('has-transparent-text-layer');
    this.observer.disconnect();
  }

  uri() {
    return this.pdfMetadata.getUri();
  }

  getMetadata() {
    return this.pdfMetadata.getMetadata();
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

    try {
      const hasText = await pdfAnchoring.documentHasText();
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
    if (!showWarning) {
      this._warningBanner?.remove();
      this._warningBanner = null;
      return;
    }

    // Get a reference to the root element of the main content area in
    // PDF.js.
    const mainContainer = /** @type {HTMLElement} */ (document.querySelector(
      '#mainContainer'
    ));

    // Update the position of the warning banner and `mainContainer` element
    // below it when the size of the banner changes, eg. due to a window resize.
    const updateBannerHeight = () => {
      /* istanbul ignore next */
      if (!this._warningBanner) {
        return;
      }
      const rect = this._warningBanner.getBoundingClientRect();
      mainContainer.style.top = rect.height + 'px';
      this._warningBanner.style.top = -rect.height + 'px';
    };

    this._warningBanner = document.createElement('div');
    this._warningBanner.className =
      'annotator-pdf-warning-banner annotator-pdf-warning-banner--notice';
    mainContainer.appendChild(this._warningBanner);
    render(<WarningBanner />, this._warningBanner);

    // nb. In browsers that don't support `ResizeObserver` the banner height
    // will simply be static and not adjust if the window is resized.
    //
    // @ts-expect-error - TS is missing `ResizeObserver`
    if (typeof ResizeObserver !== 'undefined') {
      // Update the banner when the window is resized or the Hypothesis
      // sidebar is opened.
      // @ts-ignore
      new ResizeObserver(updateBannerHeight).observe(this._warningBanner);
    }
    updateBannerHeight();
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
}
