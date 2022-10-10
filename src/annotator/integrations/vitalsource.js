import { TinyEmitter } from 'tiny-emitter';

import { ListenerCollection } from '../../shared/listener-collection';
import { FeatureFlags } from '../features';
import { onDocumentReady } from '../frame-observer';
import { HTMLIntegration } from './html';
import { preserveScrollPosition } from './html-side-by-side';
import { ImageTextLayer } from './image-text-layer';
import { injectClient } from '../hypothesis-injector';

/**
 * @typedef {import('../../types/annotator').Anchor} Anchor
 * @typedef {import('../../types/annotator').Annotator} Annotator
 * @typedef {import('../../types/annotator').Integration} Integration
 * @typedef {import('../../types/annotator').Selector} Selector
 * @typedef {import('../../types/annotator').SidebarLayout} SidebarLayout
 * @typedef {import('../hypothesis-injector').InjectConfig} InjectConfig
 */

// When activating side-by-side mode for VitalSource PDF documents, make sure
// at least this much space (in pixels) is left for the PDF document. Any
// smaller and it feels unreadable or too-zoomed-out
const MIN_CONTENT_WIDTH = 480;

/**
 * Metadata about a segment in a VitalSource book.
 *
 * Depending on the book type (PDF/fixed or EPUB/reflowable) and publisher,
 * a segment may represent a single page, a whole chapter, or something inbetween.
 * In the case of an EPUB, each content HTML file is a separate segment.
 *
 * In the case of "fixed" VitalSource books which are generated from PDFs,
 * a segment is a single page.
 *
 * @typedef SegmentInfo
 * @prop {string} absoluteURL - Path of the resource within the book that
 *   contain's the segment's resources. eg. If the current content frame has
 *   the URL "https://jigsaw.vitalsource.com/books/9780132119177/epub/OEBPS/html/ch06.html"
 *   then the corresponding `absoluteURL` entry would be
 *   "/books/9780132119177/epub/OEBPS/html/ch06.html".
 * @prop {string} cfi - Identifies the entry in the EPUB's table of contents
 *   for the current segment. See https://idpf.org/epub/linking/cfi/#sec-path-res.
 *
 *   For fixed/PDF books, VitalSource creates a synthetic CFI which is the page
 *   index (eg. "/1" for the second page).
 * @prop {string} page - Displayed page number for the first page of the segment
 * @prop {number} index - Index of the current segment within the sequence of
 *   pages or content documents that make up the book
 * @prop {string} chapterTitle - Title of the entry in the table of contents
 *   that refers to the current segment. Note that for PDF-based books, all
 *   pages within a given section will have the same "chapter title".
 */

/**
 * Metadata about a VitalSource book.
 *
 * @typedef BookInfo
 * @prop {'epub'|'pbk'} format - Indicates the type of book. "epub" indicates
 *   a reflowable EPUB. "pbk" indicates a fixed-layout book created from a PDF.
 * @prop {string} isbn - VitalSource Book ID (VBID). This is _usually_ the book's
 *   ISBN identifier, hence the field name, since VS recommend publishers should
 *   re-use the ISBN as the VBID. However there are cases where this field value
 *   is not actually a valid ISBN.
 * @prop {string} title
 */

/**
 * API of the `<mosaic-book>` element in the VitalSource container frame,
 * excluding the standard HTML element API.
 *
 * This only includes a subset of the API that the client actually uses.
 *
 * @typedef MosaicBookElementExtensions
 * @prop {() => Promise<SegmentInfo>} getCurrentPage
 * @prop {() => BookInfo} getBookInfo
 * @prop {(url: string) => void} goToURL
 */

/** @typedef {MosaicBookElementExtensions & HTMLElement} MosaicBookElement */

/**
 * Return the custom DOM element that contains the book content iframe.
 *
 * This element also provides methods to query metadata associated with the
 * book, query the current location in the book and navigate the book.
 *
 * @return {MosaicBookElement|null}
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
 * VitalSourceInjector runs in the book container frame and loads the client into
 * book content frames.
 *
 * The frame structure of the VitalSource book reader looks like this:
 *
 * [VitalSource top frame - bookshelf.vitalsource.com]
 *   |
 *   [Book container frame - jigsaw.vitalsource.com]
 *     |
 *     [Book content frame - jigsaw.vitalsource.com]
 *
 * The Hypothesis client can be initially loaded in the container frame or the
 * content frame. As the user navigates around the book, the container frame
 * remains the same but the content frame is swapped out. When used in the
 * container frame, this class handles initial injection of the client as a
 * guest in the current content frame, and re-injecting the client into new
 * content frames when they are created.
 */
export class VitalSourceInjector {
  /**
   * @param {InjectConfig} config - Configuration for injecting the client into
   *   book content frames
   */
  constructor(config) {
    const bookElement = findBookElement();
    if (!bookElement) {
      throw new Error('Book container element not found');
    }

    /** @type {WeakSet<HTMLIFrameElement>} */
    const contentFrames = new WeakSet();

    const shadowRoot = /** @type {ShadowRoot} */ (bookElement.shadowRoot);
    const injectClientIntoContentFrame = () => {
      const frame = shadowRoot.querySelector('iframe');
      if (!frame || contentFrames.has(frame)) {
        // Either there is no content frame or we are already watching it.
        return;
      }
      contentFrames.add(frame);
      onDocumentReady(frame, (err, document_) => {
        const body = document_?.body;
        const isBookContent =
          body &&
          // Check that this is not the temporary page containing encrypted and
          // invisible book content, which is replaced with the real content after
          // a form submission. These pages look something like:
          //
          // ```
          // <html>
          //   <title>content</title>
          //   <body><div id="page-content">{ Base64 encoded data }</div></body>
          // </html>
          // ```
          !body.querySelector('#page-content');

        if (isBookContent) {
          injectClient(frame, config);
        }
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

function getPDFPageImage() {
  return /** @type {HTMLImageElement|null} */ (
    document.querySelector('img#pbk-page')
  );
}

/**
 * Fix how a VitalSource book content frame scrolls, so that various related
 * Hypothesis behaviors (the bucket bar, scrolling annotations into view) work
 * as intended.
 *
 * Some VitalSource books (PDFs) make content scrolling work by making the
 * content iframe really tall and having the parent frame scroll. This stops the
 * Hypothesis bucket bar and scrolling annotations into view from working.
 *
 * @param {HTMLIFrameElement} frame
 */
function makeContentFrameScrollable(frame) {
  if (frame.getAttribute('scrolling') !== 'no') {
    // This is a book (eg. EPUB) where the workaround is not required.
    return;
  }

  // Override inline styles of iframe (hence `!important`). The iframe lives
  // in Shadow DOM, so the element styles won't affect the rest of the app.
  const style = document.createElement('style');
  style.textContent = `iframe { height: 100% !important; }`;
  frame.insertAdjacentElement('beforebegin', style);

  const removeScrollingAttr = () => frame.removeAttribute('scrolling');
  removeScrollingAttr();

  // Sometimes the attribute gets re-added by VS. Remove it if that
  // happens.
  const attrObserver = new MutationObserver(removeScrollingAttr);
  attrObserver.observe(frame, { attributes: true });
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
 *  - Create a hidden text layer in PDF-based books, so the user can select text
 *    in the PDF image. This is similar to what PDF.js does for us in PDFs.
 *
 * @implements {Integration}
 */
export class VitalSourceContentIntegration extends TinyEmitter {
  /**
   * @param {HTMLElement} container
   * @param {FeatureFlags} [features]
   */
  constructor(container = document.body, features) {
    super();

    this._features = features;

    const htmlFeatures = new FeatureFlags();

    // Forcibly enable the side-by-side feature for VS books. This feature is
    // only behind a flag for regular web pages, which are typically more
    // complex and varied than EPUB books.
    htmlFeatures.update({ html_side_by_side: true });

    this._htmlIntegration = new HTMLIntegration({
      container,
      features: htmlFeatures,
    });

    this._listeners = new ListenerCollection();

    // Prevent mouse events from reaching the window. This prevents VitalSource
    // from showing its native selection menu, which obscures the client's
    // annotation toolbar.
    //
    // To avoid interfering with the client's own selection handling, this
    // event blocking must happen at the same level or higher in the DOM tree
    // than where SelectionObserver listens.
    const stopEvents = ['mouseup', 'mousedown', 'mouseout'];
    for (let event of stopEvents) {
      this._listeners.add(document.documentElement, event, e => {
        e.stopPropagation();
      });
    }

    // Install scrolling workaround for PDFs. We do this in the content frame
    // so that it works whether Hypothesis is loaded directly into the content
    // frame or injected by VitalSourceInjector from the parent frame.
    const frame = /** @type {HTMLIFrameElement|null} */ (window.frameElement);
    if (frame) {
      makeContentFrameScrollable(frame);
    }

    // If this is a PDF, create the hidden text layer above the rendered PDF
    // image.
    const bookImage = getPDFPageImage();

    /** @type {PDFTextData|undefined} */
    const pageData = /** @type {any} */ (window).innerPageData;

    if (bookImage && pageData) {
      const charRects = pageData.glyphs.glyphs.map(glyph => {
        const left = glyph.l / 100;
        const right = glyph.r / 100;
        const top = glyph.t / 100;
        const bottom = glyph.b / 100;
        return new DOMRect(left, top, right - left, bottom - top);
      });

      this._textLayer = new ImageTextLayer(
        bookImage,
        charRects,
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

  /**
   * Find the `<mosaic-book>` element in the parent frame which provides APIs
   * to get book metadata.
   */
  _getBookElement() {
    const bookElement = findBookElement(window.parent.document);
    if (!bookElement) {
      throw new Error(
        'Failed to find <mosaic-book> element in container frame'
      );
    }
    return bookElement;
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
  async describe(root, range) {
    /** @type {Selector[]} */
    const selectors = this._htmlIntegration.describe(root, range);

    const bookElement = this._getBookElement();
    const bookInfo = bookElement.getBookInfo();
    const segmentInfo = await bookElement.getCurrentPage();

    /** @type {Selector[]} */
    const extraSelectors = [
      {
        type: 'EPUBContentSelector',
        cfi: segmentInfo.cfi,
        title: segmentInfo.chapterTitle,
        url: segmentInfo.absoluteURL,
      },
    ];

    if (bookInfo.format === 'pbk') {
      extraSelectors.push({
        type: 'PageSelector',
        index: segmentInfo.index,
        label: segmentInfo.page,
        title: segmentInfo.chapterTitle,
      });
    }

    selectors.push(...extraSelectors);

    return selectors;
  }

  contentContainer() {
    return this._htmlIntegration.contentContainer();
  }

  /**
   * @param {SidebarLayout} layout
   */
  fitSideBySide(layout) {
    // For PDF books, handle side-by-side mode in this integration. For EPUBs,
    // delegate to the HTML integration.
    const bookImage = getPDFPageImage();
    if (bookImage && this._textLayer) {
      const bookContainer = /** @type {HTMLElement} */ (
        bookImage.parentElement
      );
      const textLayer = this._textLayer;

      // Update the PDF image size and alignment to fit alongside the sidebar.
      // `ImageTextLayer` will handle adjusting the text layer to match.
      const newWidth = window.innerWidth - layout.width;

      preserveScrollPosition(() => {
        if (layout.expanded && newWidth > MIN_CONTENT_WIDTH) {
          // The VS book viewer sets `text-align: center` on the <body> element
          // by default, which centers the book image in the page. When the sidebar
          // is open we need the image to be left-aligned.
          bookContainer.style.textAlign = 'left';
          bookImage.style.width = `${newWidth}px`;
        } else {
          bookContainer.style.textAlign = '';
          bookImage.style.width = '';
        }

        // Update text layer to match new image dimensions immediately. This
        // is needed so that `preserveScrollPosition` can see how the content
        // has shifted when this callback returns.
        textLayer.updateSync();
      });

      return layout.expanded;
    } else {
      return this._htmlIntegration.fitSideBySide(layout);
    }
  }

  /**
   * @param {string} url
   */
  goToSegment(url) {
    this._getBookElement().goToURL(url);
  }

  /** @return {Promise<import('../../types/annotator').SegmentInfo>} */
  async segmentInfo() {
    const pageInfo = await this._getBookElement().getCurrentPage();
    return {
      cfi: pageInfo.cfi,
      page: pageInfo.page,
      title: pageInfo.chapterTitle,
      url: pageInfo.absoluteURL,
    };
  }

  async getMetadata() {
    const bookElement = this._getBookElement();
    const bookInfo = bookElement.getBookInfo();
    return {
      title: bookInfo.title,
      link: [],
    };
  }

  async uri() {
    const bookElement = this._getBookElement();
    const bookId = bookElement.getBookInfo().isbn;
    return `https://bookshelf.vitalsource.com/books/reader/${bookId}`;
  }

  /**
   * @param {Anchor} anchor
   */
  async scrollToAnchor(anchor) {
    return this._htmlIntegration.scrollToAnchor(anchor);
  }
}
