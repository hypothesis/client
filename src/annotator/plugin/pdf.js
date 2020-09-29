import debounce from 'lodash.debounce';

import * as pdfAnchoring from '../anchoring/pdf';
import RenderingStates from '../pdfjs-rendering-states';
// @ts-expect-error - Plugin module is CoffeeScript
import Plugin from '../plugin';

import PDFMetadata from './pdf-metadata';

/**
 * @typedef {import('../../types/annotator').Anchor} Anchor
 * @typedef {import('../../types/annotator').Annotator} Annotator
 * @typedef {import('../../types/annotator').HypothesisWindow} HypothesisWindow
 */

export default class PDF extends Plugin {
  constructor(element, config) {
    super(element, config);

    /**
     * The `Guest` instance for the current document.
     * nb. This is initialized by `Guest` before it calls `pluginInit`.
     *
     * @type {Annotator}
     */
    this.annotator = /** @type {any} */ (null);

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
  }

  pluginInit() {
    this.annotator.anchoring = pdfAnchoring;
  }

  destroy() {
    this.pdfViewer.viewer.classList.remove('has-transparent-text-layer');
    this.observer.disconnect();
  }

  uri() {
    return this.pdfMetadata.getUri();
  }

  getMetadata() {
    return this.pdfMetadata.getMetadata();
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
