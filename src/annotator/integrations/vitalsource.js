import { ListenerCollection } from '../../shared/listener-collection';
import { HTMLIntegration } from './html';
import { ImageTextLayer } from './image-text-layer';

/**
 * @typedef {import('../../types/annotator').Anchor} Anchor
 * @typedef {import('../../types/annotator').Annotator} Annotator
 * @typedef {import('../../types/annotator').Integration} Integration
 * @typedef {import('../../types/annotator').Selector} Selector
 */

/**
 * Return the custom DOM element that contains the book content iframe.
 */
function findBookElement(document_ = document) {
  return document_.querySelector('mosaic-book');
}

/**
 * Return the role of the current frame in the VitalSource Bookshelf reader or
 * `null` if the frame is not part of Bookshelf.
 *
 * @return {'container'|'content'|null} - `container` if this is the parent of
 *   the content frame, `content` if this is the frame that contains the book
 *   content or `null` if the document is not part of the Bookshelf reader.
 */
export function vitalSourceFrameRole(window_ = window) {
  if (findBookElement(window_.document)) {
    return 'container';
  }

  const parentDoc = window_.frameElement?.ownerDocument;
  if (parentDoc && findBookElement(parentDoc)) {
    return 'content';
  }

  return null;
}

/**
 * Integration for the container frame in VitalSource's Bookshelf ebook reader.
 *
 * This frame cannot be annotated directly. This integration serves only to
 * load the client into the frame that contains the book content.
 *
 * @implements {Integration}
 */
export class VitalSourceContainerIntegration {
  /**
   * @param {Annotator} annotator
   */
  constructor(annotator) {
    const bookElement = findBookElement();
    if (!bookElement) {
      throw new Error('Book container element not found');
    }

    /** @type {WeakSet<HTMLIFrameElement>} */
    const contentFrames = new WeakSet();

    /** @param {HTMLIFrameElement} frame */
    const injectIfContentReady = frame => {
      // Check if this frame contains decoded ebook content, as opposed to
      // invisible and encrypted book content, which is created initially after a
      // chapter navigation. These encrypted pages are replaced with the real
      // content after a form submission.
      //
      // The format of the decoded HTML can vary, but as a simple heuristic,
      // we look for a text paragraph.
      //
      // If the document has not yet finished loading, then we rely on this function
      // being called again once loading completes.
      const isBookContent = frame.contentDocument?.querySelector('p');
      if (isBookContent) {
        annotator.injectClient(frame);
      }
    };

    const shadowRoot = /** @type {ShadowRoot} */ (bookElement.shadowRoot);
    const injectClientIntoContentFrame = () => {
      const frame = shadowRoot.querySelector('iframe');
      if (!frame || contentFrames.has(frame)) {
        // Either there is no content frame or we are already watching it.
        return;
      }
      contentFrames.add(frame);

      injectIfContentReady(frame);
      frame.addEventListener('load', () => {
        injectIfContentReady(frame);
      });
    };

    injectClientIntoContentFrame();

    // Re-inject client into content frame after a chapter navigation.
    this._frameObserver = new MutationObserver(injectClientIntoContentFrame);
    this._frameObserver.observe(shadowRoot, { childList: true, subtree: true });
  }

  destroy() {
    this._frameObserver.disconnect();
  }

  canAnnotate() {
    // No part of the container frame can be annotated.
    return false;
  }

  // The methods below are all stubs. Creating annotations is not supported
  // in the container frame.
  async anchor() {
    return new Range();
  }

  /** @return {Selector[]} */
  describe() {
    throw new Error('This frame cannot be annotated');
  }
  contentContainer() {
    return document.body;
  }
  fitSideBySide() {
    return false;
  }
  async getMetadata() {
    return { title: '', link: [] };
  }
  async uri() {
    return document.location.href;
  }
  async scrollToAnchor() {}
}

/**
 * Bounding box of a single character in the page.
 *
 * Coordinates are expressed in percentage distance from the top-left corner
 * of the rendered page.
 *
 * @typedef GlyphBox
 * @prop {number} l
 * @prop {number} r
 * @prop {number} t
 * @prop {number} b
 */

/**
 * @typedef PDFGlyphData
 * @prop {GlyphBox[]} glyphs
 */

/**
 * Data that the VitalSource book reader renders into the page about the
 * content and location of text in the image.
 *
 * @typedef PDFTextData
 * @prop {PDFGlyphData} glyphs - Locations of each text character in the page
 * @prop {string} words - The text in the page
 */

/**
 * Integration for the content frame in VitalSource's Bookshelf ebook reader.
 *
 * This integration delegates to the standard HTML integration for most
 * functionality, but it adds logic to:
 *
 *  - Customize the document URI and metadata that is associated with annotations
 *  - Prevent VitalSource's built-in selection menu from getting in the way
 *    of the adder.
 *
 * @implements {Integration}
 */
export class VitalSourceContentIntegration {
  /**
   * @param {HTMLElement} container
   */
  constructor(container = document.body) {
    this._htmlIntegration = new HTMLIntegration(container);

    this._listeners = new ListenerCollection();

    // Prevent mouse events from reaching the window. This prevents VitalSource
    // from showing its native selection menu, which obscures the client's
    // annotation toolbar.
    //
    // VitalSource only checks the selection on the `mouseup` and `mouseout` events,
    // but we also need to stop `mousedown` to prevent the client's `SelectionObserver`
    // from thinking that the mouse is held down when a selection change occurs.
    // This has the unwanted side effect of allowing the adder to appear while
    // dragging the mouse.
    const stopEvents = ['mousedown', 'mouseup', 'mouseout'];
    for (let event of stopEvents) {
      this._listeners.add(document.documentElement, event, e => {
        e.stopPropagation();
      });
    }

    // If this is a PDF, create the hidden text layer above the rendered PDF
    // image.
    const bookImage = document.querySelector('#pbk-page');

    /** @type {PDFTextData|undefined} */
    const pageData = /** @type {any} */ (window).innerPageData;

    if (bookImage && pageData) {
      this._textLayer = new ImageTextLayer(
        bookImage,
        pageData.glyphs.glyphs.map(glyph => ({
          left: glyph.l / 100,
          right: glyph.r / 100,
          top: glyph.t / 100,
          bottom: glyph.b / 100,
        })),
        pageData.words
      );

      // VitalSource has several DOM elements in the page which are raised
      // above the image using z-index. One of these is used to handle VS's
      // own text selection functionality.
      //
      // Set a z-index on our text layer to raise it above VS's own one.
      this._textLayer.container.style.zIndex = '100';
    }
  }

  canAnnotate() {
    return true;
  }

  destroy() {
    this._textLayer?.destroy();
    this._listeners.removeAll();
    this._htmlIntegration.destroy();
  }

  /**
   * @param {HTMLElement} root
   * @param {Selector[]} selectors
   */
  anchor(root, selectors) {
    return this._htmlIntegration.anchor(root, selectors);
  }

  /**
   * @param {HTMLElement} root
   * @param {Range} range
   */
  describe(root, range) {
    return this._htmlIntegration.describe(root, range);
  }

  contentContainer() {
    return this._htmlIntegration.contentContainer();
  }

  fitSideBySide() {
    // Not yet implemented
    return false;
  }

  async getMetadata() {
    // Return minimal metadata which includes only the information we really
    // want to include.
    return {
      title: document.title,
      link: [],
    };
  }

  async uri() {
    // An example of a typical URL for the chapter content in the Bookshelf reader is:
    //
    // https://jigsaw.vitalsource.com/books/9781848317703/epub/OPS/xhtml/chapter_001.html#cfi=/6/10%5B;vnd.vst.idref=chap001%5D!/4
    //
    // Where "9781848317703" is the VitalSource book ID ("vbid"), "chapter_001.html"
    // is the location of the HTML page for the current chapter within the book
    // and the `#cfi` fragment identifies the scroll location.
    //
    // Note that this URL is typically different than what is displayed in the
    // iframe's `src` attribute.

    // Strip off search parameters and fragments.
    const uri = new URL(document.location.href);
    uri.search = '';
    return uri.toString();
  }

  /**
   * @param {Anchor} anchor
   */
  async scrollToAnchor(anchor) {
    return this._htmlIntegration.scrollToAnchor(anchor);
  }
}
