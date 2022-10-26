import { TinyEmitter } from 'tiny-emitter';

import { ListenerCollection } from '../../shared/listener-collection';
import { FeatureFlags } from '../features';
import { onDocumentReady } from '../frame-observer';
import { HTMLIntegration } from './html';
import { preserveScrollPosition } from './html-side-by-side';
import { ImageTextLayer } from './image-text-layer';
import { injectClient } from '../hypothesis-injector';

import type {
  Anchor,
  FeatureFlags as IFeatureFlags,
  Integration,
  SidebarLayout,
} from '../../types/annotator';
import type { Selector } from '../../types/api';
import type { InjectConfig } from '../hypothesis-injector';

// When activating side-by-side mode for VitalSource PDF documents, make sure
// at least this much space (in pixels) is left for the PDF document. Any
// smaller and it feels unreadable or too-zoomed-out
const MIN_CONTENT_WIDTH = 480;

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
 * @return `container` if this is the parent of the content frame, `content` if
 *   this is the frame that contains the book content or `null` if the document is
 *   not part of the Bookshelf reader.
 */
export function vitalSourceFrameRole(
  window_ = window
): 'container' | 'content' | null {
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
  private _frameObserver: MutationObserver;

  /**
   * @param config - Configuration for injecting the client into
   *   book content frames
   */
  constructor(config: InjectConfig) {
    const bookElement = findBookElement();
    if (!bookElement) {
      throw new Error('Book container element not found');
    }

    const contentFrames = new WeakSet<HTMLIFrameElement>();

    const shadowRoot = bookElement.shadowRoot!;
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
 */
type GlyphBox = {
  l: number;
  r: number;
  t: number;
  b: number;
};

type PDFGlyphData = {
  glyphs: GlyphBox[];
};

/**
 * Data that the VitalSource book reader renders into the page about the
 * content and location of text in the image.
 */
type PDFTextData = {
  /** Locations of each text character in the page */
  glyphs: PDFGlyphData;
  /** The text in the page */
  words: string;
};

function getPDFPageImage() {
  return document.querySelector('img#pbk-page') as HTMLImageElement | null;
}

/**
 * Fix how a VitalSource book content frame scrolls, so that various related
 * Hypothesis behaviors (the bucket bar, scrolling annotations into view) work
 * as intended.
 *
 * Some VitalSource books (PDFs) make content scrolling work by making the
 * content iframe really tall and having the parent frame scroll. This stops the
 * Hypothesis bucket bar and scrolling annotations into view from working.
 */
function makeContentFrameScrollable(frame: HTMLIFrameElement) {
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
 */
export class VitalSourceContentIntegration
  extends TinyEmitter
  implements Integration
{
  private _features: IFeatureFlags;
  private _htmlIntegration: HTMLIntegration;
  private _listeners: ListenerCollection;
  private _textLayer?: ImageTextLayer;

  constructor(
    container: HTMLElement = document.body,
    options: { features: IFeatureFlags }
  ) {
    super();

    this._features = options.features;

    // If the book_as_single_document flag changed, this will change the
    // document URI returned by this integration.
    this._features.on('flagsChanged', () => {
      this.emit('uriChanged');
    });

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
    for (const event of stopEvents) {
      this._listeners.add(document.documentElement, event, e => {
        e.stopPropagation();
      });
    }

    // Install scrolling workaround for PDFs. We do this in the content frame
    // so that it works whether Hypothesis is loaded directly into the content
    // frame or injected by VitalSourceInjector from the parent frame.
    const frame = window.frameElement as HTMLIFrameElement | null;
    if (frame) {
      makeContentFrameScrollable(frame);
    }

    // If this is a PDF, create the hidden text layer above the rendered PDF
    // image.
    const bookImage = getPDFPageImage();

    const pageData = (window as any).innerPageData as PDFTextData | undefined;

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

  canAnnotate() {
    return true;
  }

  destroy() {
    this._textLayer?.destroy();
    this._listeners.removeAll();
    this._htmlIntegration.destroy();
  }

  anchor(root: HTMLElement, selectors: Selector[]) {
    return this._htmlIntegration.anchor(root, selectors);
  }

  describe(root: HTMLElement, range: Range) {
    return this._htmlIntegration.describe(root, range);
  }

  contentContainer() {
    return this._htmlIntegration.contentContainer();
  }

  fitSideBySide(layout: SidebarLayout) {
    // For PDF books, handle side-by-side mode in this integration. For EPUBs,
    // delegate to the HTML integration.
    const bookImage = getPDFPageImage();
    if (bookImage && this._textLayer) {
      const bookContainer = bookImage.parentElement as HTMLElement;
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

  async getMetadata() {
    // Return minimal metadata which includes only the information we really
    // want to include.
    return {
      title: document.title,
      link: [],
    };
  }

  async uri() {
    if (this._bookIsSingleDocument()) {
      // Dummy book ID that will in future be replaced with a real value
      // retrieved via the `<mosaic-book>` element's API.
      const bookId = '1234';
      return `https://bookshelf.vitalsource.com/reader/books/${bookId}`;
    } else {
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
  }

  async scrollToAnchor(anchor: Anchor) {
    return this._htmlIntegration.scrollToAnchor(anchor);
  }

  /**
   * Return true if the feature flag to treat books as one document is enabled,
   * as opposed to treating each chapter/segment/page as a separate document.
   */
  _bookIsSingleDocument(): boolean {
    return this._features.flagEnabled('book_as_single_document');
  }
}
