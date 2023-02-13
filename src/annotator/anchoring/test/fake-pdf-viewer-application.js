/**
 * Fake implementation of the parts of PDF.js that the Hypothesis client's
 * anchoring interacts with.
 *
 * This is used to create PDF anchoring tests which can execute quickly and be
 * easier to debug than the full PDF.js viewer application.
 *
 * The general structure is to have `Fake{OriginalClassName}` classes for
 * each of the relevant classes in PDF.js. The APIs of the fakes should conform
 * to the corresponding interfaces defined in `src/types/pdfjs.js`.
 */
import { TinyEmitter as EventEmitter } from 'tiny-emitter';

import { RenderingStates } from '../pdf';

/**
 * Options that control global aspects of the PDF.js fake, such as which
 * version of PDF.js is being emulated.
 *
 * @typedef PDFJSConfig
 * @prop {boolean} newTextRendering - Whether to emulate the PDF.js text rendering
 *   changes added in v2.9.359.
 */

/**
 * Create the DOM structure for a page which matches the structure produced by
 * PDF.js
 *
 * @param {string} content - The text content for the page
 * @param {boolean} rendered - True if the page should be "rendered" or false if
 *        it should be an empty placeholder for a not-yet-rendered page
 * @param {PDFJSConfig} config
 * @return {Element} - The root Element for the page
 */
function createPage(content, rendered, config) {
  const pageEl = document.createElement('div');
  pageEl.classList.add('page');

  if (!rendered) {
    return pageEl;
  }

  const textLayer = document.createElement('div');
  textLayer.classList.add('textLayer');

  content.split(/\n/).forEach(item => {
    if (!config.newTextRendering && /^\s*$/.test(item)) {
      // PDF.js releases before v2.9.359 do not create elements in the text
      // layer for whitespace-only text items.
      return;
    }
    const itemEl = document.createElement('div');
    itemEl.textContent = item;
    textLayer.appendChild(itemEl);
  });

  pageEl.appendChild(textLayer);
  return pageEl;
}

/**
 * Fake implementation of `PDFPageProxy` class.
 *
 * The original is defined at https://github.com/mozilla/pdf.js/blob/master/src/display/api.js
 */
class FakePDFPageProxy {
  /**
   * @param {string} pageText
   * @param {PDFJSConfig} config
   */
  constructor(pageText, config) {
    this.pageText = pageText;
    this._config = config;
  }

  getTextContent(params = {}) {
    if (!params.normalizeWhitespace) {
      return Promise.reject(
        new Error('Expected `normalizeWhitespace` to be true')
      );
    }

    /** @param {string} str */
    const makeTextItem = str => {
      if (this._config.newTextRendering) {
        // The `hasEOL` property was added in https://github.com/mozilla/pdf.js/pull/13257
        // and its existence is used to feature-detect whether whitespace-only
        // items need to be ignored in the `items` array.
        return { str, hasEOL: false };
      } else {
        return { str };
      }
    };

    const textContent = {
      // The way that the page text is split into items will depend on
      // the PDF and the version of PDF.js - individual text items might be
      // just symbols, words, phrases or whole lines.
      //
      // Here we split items by line which matches the typical output for a
      // born-digital PDF.
      items: this.pageText.split(/\n/).map(makeTextItem),
    };

    return Promise.resolve(textContent);
  }
}

/**
 * @typedef FakePDFPageViewOptions
 * @prop {boolean} rendered - Whether this page is "rendered", as if it were
 *   near the viewport, or not.
 * @prop {PDFJSConfig} config
 */

/**
 * Fake implementation of PDF.js `PDFPageView` class.
 *
 * The original is defined at https://github.com/mozilla/pdf.js/blob/master/web/pdf_page_view.js
 */
class FakePDFPageView {
  /**
   * @param {string} text - Text of the page
   * @param {FakePDFPageViewOptions} options
   */
  constructor(text, { rendered, config }) {
    const pageEl = createPage(text, rendered, config);
    const textLayerEl = pageEl.querySelector('.textLayer');

    this.div = pageEl;
    this.textLayer = textLayerEl
      ? { textLayerDiv: textLayerEl, renderingDone: true }
      : null;
    this.renderingState = textLayerEl
      ? RenderingStates.FINISHED
      : RenderingStates.INITIAL;
    this.pdfPage = new FakePDFPageProxy(text, config);
  }

  dispose() {
    this.div.remove();
  }
}

/**
 * Fake implementation of PDF.js' `PDFViewer` class.
 *
 * The original is defined at https://github.com/mozilla/pdf.js/blob/master/web/pdf_viewer.js
 */
class FakePDFViewer {
  /**
   * @param {Options} options
   */
  constructor({ config, container, content }) {
    this._config = config;
    this._container = container;
    this._content = content;

    /** @type {FakePDFPageView} */
    this._pages = [];

    this.viewer = this._container;

    this.eventBus = new EventEmitter();

    /** @type {'auto'|'page-fit'|'page-width'} */
    this.currentScaleValue = 'auto';

    this.update = sinon.stub();
  }

  get pagesCount() {
    return this._content.length;
  }

  /**
   * Return the `FakePDFPageView` object representing a rendered page or a
   * placeholder for one.
   *
   * During PDF.js startup when the document is still being loaded, this may
   * return a nullish value even when the PDF page index is valid.
   */
  getPageView(index) {
    this._checkBounds(index);
    return this._pages[index];
  }

  /**
   * Set the index of the page which is currently visible in the viewport.
   *
   * Pages from `index` up to and including `lastRenderedPage` will be
   * "rendered" and have a text layer available. Other pages will be "un-rendered"
   * with no text layer available, but only a placeholder element for the whole
   * page.
   */
  setCurrentPage(index, lastRenderedPage = index) {
    this._checkBounds(index);

    const pages = this._content.map(
      (text, idx) =>
        new FakePDFPageView(text, {
          rendered: idx >= index && idx <= lastRenderedPage,
          config: this._config,
        })
    );

    this._container.innerHTML = '';
    this._pages = pages;
    this._pages.forEach(page => this._container.appendChild(page.div));
  }

  dispose() {
    this._pages.forEach(page => page.dispose());
  }

  /**
   * Dispatch an event to notify observers that some event has occurred
   * in the PDF viewer.
   */
  notify(eventName, { eventDispatch = 'eventBus' } = {}) {
    if (eventDispatch === 'eventBus') {
      this.eventBus.emit(eventName);
    } else if (eventDispatch === 'dom') {
      this._container.dispatchEvent(
        new CustomEvent(eventName, { bubbles: true })
      );
    }
  }

  _checkBounds(index) {
    if (index < 0 || index >= this._content.length) {
      throw new Error('Invalid page index ' + index.toString());
    }
  }
}

/**
 * @typedef Options
 * @prop {Element} container - The container into which the fake PDF viewer
 *       should render the content
 * @prop {string[]} content - Array of strings containing the text for each
 *       page
 * @prop {PDFJSConfig} [config]
 */

/**
 * A minimal fake implementation of PDF.js' PDFViewerApplication interface.
 *
 * This emulates the parts of PDF.js that are relevant to anchoring tests.
 *
 * The original is defined at https://github.com/mozilla/pdf.js/blob/master/web/app.js
 */
export class FakePDFViewerApplication {
  /**
   * @param {Options} options
   */
  constructor(options) {
    if (!options.config) {
      options.config = { newTextRendering: true };
    }

    this.appConfig = {
      // The root element which contains all of the PDF.js UI. In the real PDF.js
      // viewer this is generally `document.body`.
      appContainer: document.createElement('div'),
    };
    this.pdfViewer = new FakePDFViewer(options);
  }

  /**
   * Remove any DOM elements, timers etc. created by the fake PDF viewer.
   */
  dispose() {
    this.pdfViewer.dispose();
  }
}
