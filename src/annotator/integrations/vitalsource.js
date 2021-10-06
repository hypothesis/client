import { ListenerCollection } from '../../shared/listener-collection';
import { HTMLIntegration } from './html';

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

    const shadowRoot = /** @type {ShadowRoot} */ (bookElement.shadowRoot);
    const injectClientIntoContentFrame = () => {
      const frame = shadowRoot.querySelector('iframe');
      if (frame) {
        annotator.injectClient(frame);
      }
    };
    this._frameObserver = new MutationObserver(injectClientIntoContentFrame);
    this._frameObserver.observe(shadowRoot, { childList: true, subtree: true });
    injectClientIntoContentFrame();
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
  }

  canAnnotate() {
    return true;
  }

  destroy() {
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
