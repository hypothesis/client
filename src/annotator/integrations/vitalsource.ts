import { TinyEmitter } from 'tiny-emitter';

import { documentCFI } from '../../shared/cfi';
import { ListenerCollection } from '../../shared/listener-collection';
import { FeatureFlags } from '../features';
import { onDocumentReady } from '../frame-observer';
import { HTMLIntegration } from './html';
import { preserveScrollPosition } from './html-side-by-side';
import { ImageTextLayer } from './image-text-layer';
import { injectClient } from '../hypothesis-injector';

import type {
  Anchor,
  AnnotationData,
  Integration,
  SegmentInfo,
  SidebarLayout,
} from '../../types/annotator';
import type {
  ContentFrameGlobals,
  MosaicBookElement,
} from '../../types/vitalsource';
import type { EPUBContentSelector, Selector } from '../../types/api';
import type { InjectConfig } from '../hypothesis-injector';

// When activating side-by-side mode for VitalSource PDF documents, make sure
// at least this much space (in pixels) is left for the PDF document. Any
// smaller and it feels unreadable or too-zoomed-out
const MIN_CONTENT_WIDTH = 480;

/**
 * Return the custom DOM element that contains the book content iframe.
 */
function findBookElement(document_ = document): MosaicBookElement | null {
  return document_.querySelector('mosaic-book') as MosaicBookElement | null;
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
        if (err) {
          return;
        }

        // If `err` is null, then `document_` will be set.
        const body = document_!.body;

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
          injectClient(frame, config, 'vitalsource-content');
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
 * Return a copy of URL with the origin removed.
 *
 * eg. "https://jigsaw.vitalsource.com/books/123/chapter.html?foo" =>
 * "/books/123/chapter.html"
 */
function stripOrigin(url: string) {
  // Resolve input URL in case it doesn't already have an origin.
  const parsed = new URL(url, document.baseURI);
  return parsed.pathname + parsed.search;
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
  private _bookElement: MosaicBookElement;
  private _htmlIntegration: HTMLIntegration;
  private _listeners: ListenerCollection;
  private _textLayer?: ImageTextLayer;

  constructor(
    /* istanbul ignore next - defaults are overridden in tests */
    container: HTMLElement = document.body,
    /* istanbul ignore next - defaults are overridden in tests */
    options: {
      // Test seam
      bookElement?: MosaicBookElement;
    } = {}
  ) {
    super();

    const bookElement =
      options.bookElement ?? findBookElement(window.parent.document);
    if (!bookElement) {
      /* istanbul ignore next */
      throw new Error(
        'Failed to find <mosaic-book> element in container frame'
      );
    }
    this._bookElement = bookElement;

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

    const pageData = (window as ContentFrameGlobals).innerPageData;

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

  getAnnotatableRange(range: Range) {
    return this._htmlIntegration.getAnnotatableRange(range);
  }

  destroy() {
    this._textLayer?.destroy();
    this._listeners.removeAll();
    this._htmlIntegration.destroy();
  }

  anchor(root: HTMLElement, selectors: Selector[]) {
    return this._htmlIntegration.anchor(root, selectors);
  }

  async describe(root: HTMLElement, range: Range) {
    const selectors: Selector[] = this._htmlIntegration.describe(root, range);

    const {
      cfi,
      index: pageIndex,
      page: pageLabel,
      title,
      url,
    } = await this._getPageInfo(true /* includeTitle */);

    // We generate an "EPUBContentSelector" with a CFI for all VS books,
    // although for PDF-based books the CFI is a string generated from the
    // page number.
    const extraSelectors: Selector[] = [
      {
        type: 'EPUBContentSelector',
        cfi,
        url,
        title,
      },
    ];

    // If this is a PDF-based book, add a page selector. PDFs always have page
    // numbers available. EPUB-based books _may_ have information about how
    // content maps to page numbers in a printed edition of the book. We
    // currently limit page number selectors to PDFs until more is understood
    // about when EPUB page numbers are reliable/likely to remain stable.
    const bookInfo = this._bookElement.getBookInfo();
    if (bookInfo.format === 'pbk') {
      extraSelectors.push({
        type: 'PageSelector',
        index: pageIndex,
        label: pageLabel,
      });
    }

    selectors.push(...extraSelectors);

    return selectors;
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
    const bookInfo = this._bookElement.getBookInfo();
    return {
      title: bookInfo.title,
      link: [],
    };
  }

  navigateToSegment(ann: AnnotationData) {
    const selector = ann.target[0].selector?.find(
      s => s.type === 'EPUBContentSelector'
    ) as EPUBContentSelector | undefined;
    if (selector?.cfi) {
      this._bookElement.goToCfi(selector.cfi);
    } else if (selector?.url) {
      this._bookElement.goToURL(stripOrigin(selector.url));
    } else {
      throw new Error('No segment information available');
    }
  }

  persistFrame() {
    // Hint to the sidebar that it should not unload annotations when the
    // guest frame using this integration unloads.
    return true;
  }

  /**
   * Retrieve information about the currently displayed content document or
   * page.
   *
   * @param includeTitle - Whether to fetch the title. This involves some extra
   *   work so should be skipped when not required.
   */
  async _getPageInfo(includeTitle: boolean) {
    const [pageInfo, toc] = await Promise.all([
      this._bookElement.getCurrentPage(),
      includeTitle ? this._bookElement.getTOC() : undefined,
    ]);

    // If changes in VitalSource ever mean that critical chapter/page metadata
    // fields are missing, fail loudly. Otherwise we might create annotations
    // that cannot be re-anchored in future.
    const expectedFields = ['absoluteURL', 'cfi', 'index', 'page'];
    for (const field of expectedFields) {
      // nb. We intentionally allow properties anywhere on the prototype chain,
      // rather than requiring `hasOwnProperty`.
      if (!(field in pageInfo)) {
        throw new Error(`Chapter metadata field "${field}" is missing`);
      }
    }

    let title;

    if (toc) {
      title = pageInfo.chapterTitle;

      // Find the first table of contents entry that corresponds to the current page,
      // and use its title instead of `pageInfo.chapterTitle`. This works around
      // https://github.com/hypothesis/client/issues/4986.
      const pageCFI = documentCFI(pageInfo.cfi);
      const tocEntry = toc.data?.find(
        entry => documentCFI(entry.cfi) === pageCFI
      );
      if (tocEntry) {
        title = tocEntry.title;
      }
    }

    return {
      cfi: pageInfo.cfi,
      index: pageInfo.index,
      page: pageInfo.page,
      title,

      // The `pageInfo.absoluteURL` URL is an absolute path that does not
      // include the origin of VitalSource's CDN.
      url: new URL(pageInfo.absoluteURL, document.baseURI).toString(),
    };
  }

  async segmentInfo(): Promise<SegmentInfo> {
    const { cfi, url } = await this._getPageInfo(false /* includeTitle */);
    return { cfi, url };
  }

  async uri() {
    const bookInfo = this._bookElement.getBookInfo();
    const bookId = bookInfo.isbn;
    if (!bookId) {
      throw new Error('Unable to get book ID from VitalSource');
    }
    return `https://bookshelf.vitalsource.com/reader/books/${bookId}`;
  }

  async scrollToAnchor(anchor: Anchor) {
    return this._htmlIntegration.scrollToAnchor(anchor);
  }
}
