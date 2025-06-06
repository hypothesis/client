/* global PDFViewerApplication */
import { warnOnce } from '../../shared/warn-once';
import type { Shape, ShapeAnchor } from '../../types/annotator';
import type {
  PageSelector,
  TextPositionSelector,
  TextQuoteSelector,
  Selector,
  ShapeSelector,
} from '../../types/api';
import type {
  PDFPageProxy,
  PDFPageView,
  PDFViewer,
  TextLayer,
} from '../../types/pdfjs';
import { translateOffsets } from '../util/normalize';
import { matchQuote } from './match-quote';
import { createPlaceholder } from './placeholder';
import { textInDOMRect } from './text-in-rect';
import { TextPosition, TextRange } from './text-range';
import { TextQuoteAnchor } from './types';

type PDFTextRange = {
  pageIndex: number;
  anchor: {
    /** Start character offset within the page's text. */
    start: number;
    /** End character offset within the page's text. */
    end: number;
  };
};

/**
 * Enum values for page rendering states (IRenderableView#renderingState)
 * in PDF.js. Taken from web/pdf_rendering_queue.js in the PDF.js library.
 *
 * Reproduced here because this enum is not exported consistently across
 * different versions of PDF.js
 */
export const RenderingStates = {
  INITIAL: 0,
  RUNNING: 1,
  PAUSED: 2,
  FINISHED: 3,
};

// Caches for performance.

/**
 * Map of page index to page text content.
 */
const pageTextCache = new Map<number, Promise<string>>();

/**
 * A cache that maps a `{quote}:{offset}` key to a specific
 * location in the document.
 *
 * The components of the key come from an annotation's selectors. This is used
 * to speed up re-anchoring an annotation that was previously anchored in the
 * current session.
 */
const quotePositionCache = new Map<string, PDFTextRange>();

/**
 * Return a cache key for lookups in `quotePositionCache`.
 *
 * @param [pos] - Offset in document text
 */
function quotePositionCacheKey(quote: string, pos?: number) {
  return `${quote}:${pos}`;
}

/**
 * Return the text layer element of the PDF page containing `node`.
 */
function getNodeTextLayer(node: Node | Element): Element | null {
  const el = 'closest' in node ? node : node.parentElement;
  return el?.closest('.textLayer') ?? null;
}

/**
 * Get the PDF.js viewer application.
 */
function getPDFViewer(): PDFViewer {
  // @ts-ignore - TS doesn't know about PDFViewerApplication global.
  return PDFViewerApplication.pdfViewer;
}

/**
 * Returns the view into which a PDF page is drawn.
 *
 * If called while the PDF document is still loading, this will delay until
 * the document loading has progressed far enough for a `PDFPageView` and its
 * associated `PDFPage` to be ready.
 */
async function getPageView(pageIndex: number): Promise<PDFPageView> {
  const pdfViewer = getPDFViewer();
  let pageView = pdfViewer.getPageView(pageIndex);

  if (!pageView || !pageView.pdfPage) {
    // If the document is still loading, wait for the `pagesloaded` event.
    //
    // Note that loading happens in several stages. Initially the page view
    // objects do not exist (`pageView` will be nullish), then after the
    // "pagesinit" event, the page view exists but it does not have a `pdfPage`
    // property set, then finally after the "pagesloaded" event, it will have
    // a "pdfPage" property.
    pageView = await new Promise(resolve => {
      const onPagesLoaded = () => {
        if (pdfViewer.eventBus) {
          pdfViewer.eventBus.off('pagesloaded', onPagesLoaded);
        } else {
          document.removeEventListener('pagesloaded', onPagesLoaded);
        }

        resolve(pdfViewer.getPageView(pageIndex));
      };

      if (pdfViewer.eventBus) {
        pdfViewer.eventBus.on('pagesloaded', onPagesLoaded);
      } else {
        // Old PDF.js versions (< 1.6.210) use DOM events.
        document.addEventListener('pagesloaded', onPagesLoaded);
      }
    });
  }

  return pageView!;
}

function getTextLayerFromPoint(x: number, y: number): HTMLElement | undefined {
  return document
    .elementsFromPoint(x, y)
    .find(el => el.classList.contains('textLayer')) as HTMLElement | undefined;
}

/**
 * Return true if the document has selectable text.
 */
export async function documentHasText() {
  const viewer = getPDFViewer();
  let hasText = false;
  for (let i = 0; i < viewer.pagesCount; i++) {
    const pageText = await getPageTextContent(i);
    if (pageText.trim().length > 0) {
      hasText = true;
      break;
    }
  }
  return hasText;
}

/**
 * Return the text of a given PDF page.
 *
 * The text returned by this function should match the `textContent` of the text
 * layer element that PDF.js creates for rendered pages, with the exception
 * that differences in whitespace are tolerated.
 */
function getPageTextContent(pageIndex: number): Promise<string> {
  // If we already have or are fetching the text for this page, return the
  // existing result.
  const cachedText = pageTextCache.get(pageIndex);
  if (cachedText) {
    return cachedText;
  }

  const getPageText = async () => {
    const pageView = await getPageView(pageIndex);
    const textContent = await pageView.pdfPage.getTextContent({
      // Deprecated option, set for compatibility with older PDF.js releases.
      normalizeWhitespace: true,
    });
    return textContent.items.map(it => it.str).join('');
  };

  // This function synchronously populates the cache with a promise so that
  // multiple calls don't call `PDFPageProxy.getTextContent` twice.
  const pageText = getPageText();
  pageTextCache.set(pageIndex, pageText);
  return pageText;
}

/**
 * Find the offset within the document's text at which a page begins.
 *
 * @return - Offset of page's text within document text
 */
async function getPageOffset(pageIndex: number): Promise<number> {
  const viewer = getPDFViewer();
  if (pageIndex >= viewer.pagesCount) {
    /* istanbul ignore next - This should never be triggered */
    throw new Error('Invalid page index');
  }
  let offset = 0;
  for (let i = 0; i < pageIndex; i++) {
    const text = await getPageTextContent(i);
    offset += text.length;
  }
  return offset;
}

type PageOffset = {
  /** Page index. */
  index: number;
  /** Character offset of start of page within document text. */
  offset: number;
  /** Text of page. */
  text: string;
};

/**
 * Find the page containing a text offset within the document.
 *
 * If the offset is invalid (less than 0 or greater than the length of the document)
 * then the nearest (first or last) page is returned.
 */
async function findPageByOffset(offset: number): Promise<PageOffset> {
  const viewer = getPDFViewer();

  let pageStartOffset = 0;
  let pageEndOffset = 0;
  let text = '';

  for (let i = 0; i < viewer.pagesCount; i++) {
    text = await getPageTextContent(i);
    pageStartOffset = pageEndOffset;
    pageEndOffset += text.length;

    if (pageEndOffset >= offset) {
      return { index: i, offset: pageStartOffset, text };
    }
  }

  // If the offset is beyond the end of the document, just pretend it was on
  // the last page.
  return { index: viewer.pagesCount - 1, offset: pageStartOffset, text };
}

/**
 * Return true if `char` is an ASCII space.
 *
 * This is more efficient than `/\s/.test(char)` but does not handle Unicode
 * spaces.
 */
function isSpace(char: string) {
  switch (char) {
    case ' ':
    case '\f':
    case '\n':
    case '\r':
    case '\t':
    case '\v':
    case '\u00a0': // nbsp
      return true;
    default:
      return false;
  }
}

const isNotSpace = (char: string) => !isSpace(char);

/**
 * Determines if provided text layer is done rendering.
 * It works on older PDF.js versions which expose a public `renderingDone` prop,
 * and newer versions as well
 */
export function isTextLayerRenderingDone(textLayer: TextLayer): boolean {
  if (textLayer.renderingDone !== undefined) {
    return textLayer.renderingDone;
  }

  if (!textLayer.div) {
    return false;
  }

  // When a Page is rendered, the div gets an element with the class
  // endOfContent appended to it. If that element exists, we can consider the
  // text layer is done rendering.
  // See https://github.com/mozilla/pdf.js/blob/1ab9ab67eed886f27127bd801bc349949af5054e/web/text_layer_builder.js#L103-L107
  return textLayer.div.querySelector('.endOfContent') !== null;
}

/**
 * Locate the DOM Range which a position selector refers to.
 *
 * If the page is off-screen it may be in an unrendered state, in which case
 * the text layer will not have been created. In that case a placeholder
 * DOM element is created and the returned range refers to that placeholder.
 * In that case, the selector will need to be re-anchored when the page is
 * scrolled into view.
 *
 * @param pageIndex - The PDF page index
 * @param start - Character offset within the page's text
 * @param end - Character offset within the page's text
 */
async function anchorByPosition(
  pageIndex: number,
  start: number,
  end: number,
): Promise<Range> {
  const [page, pageText] = await Promise.all([
    getPageView(pageIndex),
    getPageTextContent(pageIndex),
  ]);

  if (
    page.renderingState === RenderingStates.FINISHED &&
    page.textLayer &&
    isTextLayerRenderingDone(page.textLayer)
  ) {
    // The page has been rendered. Locate the position in the text layer.
    //
    // We allow for differences in whitespace between the text returned by
    // `getPageTextContent` and the text layer content. Any other differences
    // will cause mis-anchoring.

    const root = page.textLayer.textLayerDiv ?? page.textLayer.div;
    if (!root) {
      /* istanbul ignore next */
      throw new Error('Unable to find PDF.js text layer root');
    }

    const textLayerStr = root.textContent!;

    const [textLayerStart, textLayerEnd] = translateOffsets(
      pageText,
      textLayerStr,
      start,
      end,
      isNotSpace,
      // Apply normalization since the extracted text and text layer may have
      // different normalization, depending on the PDF.js version.
      { normalize: true },
    );

    const textLayerQuote = stripSpaces(
      textLayerStr.slice(textLayerStart, textLayerEnd),
    );
    const pageTextQuote = stripSpaces(pageText.slice(start, end));

    // Compare NFKD normalized-strings here to match how `translateOffsets`
    // works.
    if (textLayerQuote.normalize('NFKD') !== pageTextQuote.normalize('NFKD')) {
      warnOnce(
        'Text layer text does not match page text. Highlights will be mis-aligned.',
      );
    }

    const startPos = new TextPosition(root, textLayerStart);
    const endPos = new TextPosition(root, textLayerEnd);
    return new TextRange(startPos, endPos).toRange();
  }

  // The page has not been rendered yet. Create a placeholder element and
  // anchor to that instead.
  const placeholder = createPlaceholder(page.div);
  const range = document.createRange();
  range.setStartBefore(placeholder);
  range.setEndAfter(placeholder);
  return range;
}

/**
 * Return a string with spaces stripped.
 *
 * This function optimizes for performance of stripping the main space chars
 * that PDF.js generates over handling all kinds of whitespace that could
 * occur in a string.
 */
function stripSpaces(str: string) {
  let stripped = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (isSpace(char)) {
      continue;
    }
    stripped += char;
  }
  return stripped;
}

/**
 * Search for a quote in the given pages.
 *
 * When comparing quote selectors to document text, ASCII whitespace characters
 * are ignored. This is because text extracted from a PDF by different PDF
 * viewers, including different versions of PDF.js, can often differ in the
 * whitespace between characters and words. For a long time PDF.js in particular
 * had issues where it would often produce extra spaces between characters that
 * should not be there or omit spaces between words.
 *
 * @param [positionHint] - Expected start offset of quote
 * @return - Location of quote
 */
async function anchorQuote(
  quoteSelector: TextQuoteSelector,
  positionHint?: number,
): Promise<Range> {
  // Determine which pages to search and in what order. If we have a position
  // hint we'll try to use that. Otherwise we'll just search all pages in order.
  const pageCount = getPDFViewer().pagesCount;
  const pageIndexes = Array(pageCount)
    .fill(0)
    .map((_, i) => i);

  let expectedPageIndex;
  let expectedOffsetInPage;

  if (positionHint) {
    const { index, offset } = await findPageByOffset(positionHint);
    expectedPageIndex = index;
    expectedOffsetInPage = positionHint - offset;

    // Sort pages by distance from the page where we expect to find the quote,
    // based on the position hint.
    pageIndexes.sort((a, b) => {
      const distA = Math.abs(a - index);
      const distB = Math.abs(b - index);
      return distA - distB;
    });
  }

  // Search pages for the best match, ignoring whitespace differences.
  const strippedPrefix =
    quoteSelector.prefix !== undefined
      ? stripSpaces(quoteSelector.prefix)
      : undefined;
  const strippedSuffix =
    quoteSelector.suffix !== undefined
      ? stripSpaces(quoteSelector.suffix)
      : undefined;
  const strippedQuote = stripSpaces(quoteSelector.exact);

  let bestMatch;
  for (const page of pageIndexes) {
    const text = await getPageTextContent(page);
    const strippedText = stripSpaces(text);

    // Determine expected offset of quote in current page based on position hint.
    let strippedHint;
    if (expectedPageIndex !== undefined && expectedOffsetInPage !== undefined) {
      if (page < expectedPageIndex) {
        strippedHint = strippedText.length; // Prefer matches closer to end of page.
      } else if (page === expectedPageIndex) {
        // Translate expected offset in whitespace-inclusive version of page
        // text into offset in whitespace-stripped version of page text.
        [strippedHint] = translateOffsets(
          text,
          strippedText,
          expectedOffsetInPage,
          expectedOffsetInPage,
          isNotSpace,
          // We don't need to normalize here since both input strings are
          // derived from the same input.
          { normalize: false },
        );
      } else {
        strippedHint = 0; // Prefer matches closer to start of page.
      }
    }

    const match = matchQuote(strippedText, strippedQuote, {
      prefix: strippedPrefix,
      suffix: strippedSuffix,
      hint: strippedHint,
    });

    if (!match) {
      continue;
    }

    if (!bestMatch || match.score > bestMatch.match.score) {
      // Translate match offset from whitespace-stripped version of page text
      // back to original text.
      const [start, end] = translateOffsets(
        strippedText,
        text,
        match.start,
        match.end,
        isNotSpace,
      );
      bestMatch = {
        page,
        match: {
          start,
          end,
          score: match.score,
        },
      };

      // If we find a very good match, stop early.
      //
      // There is a tradeoff here between optimizing search performance and
      // ensuring that we have found the best match in the document.
      //
      // The current heuristics are that we require an exact match for the quote
      // and either the preceding or following context. The context matching
      // helps to avoid incorrectly stopping the search early if the quote is
      // a word or phrase that is common in the document.
      const exactQuoteMatch =
        strippedText.slice(match.start, match.end) === strippedQuote;

      const exactPrefixMatch =
        strippedPrefix !== undefined &&
        strippedText.slice(
          Math.max(0, match.start - strippedPrefix.length),
          match.start,
        ) === strippedPrefix;

      const exactSuffixMatch =
        strippedSuffix !== undefined &&
        strippedText.slice(match.end, strippedSuffix.length) === strippedSuffix;

      const hasContext =
        strippedPrefix !== undefined || strippedSuffix !== undefined;

      if (
        exactQuoteMatch &&
        (exactPrefixMatch || exactSuffixMatch || !hasContext)
      ) {
        break;
      }
    }
  }

  if (bestMatch) {
    const { page, match } = bestMatch;

    // If we found a match, optimize future anchoring of this selector in the
    // same session by caching the match location.
    if (positionHint) {
      const cacheKey = quotePositionCacheKey(quoteSelector.exact, positionHint);
      quotePositionCache.set(cacheKey, {
        pageIndex: page,
        anchor: match,
      });
    }

    // Convert the (start, end) position match into a DOM range.
    return anchorByPosition(page, match.start, match.end);
  }

  throw new Error('Quote not found');
}

/**
 * Anchor a set of selectors to a DOM Range.
 *
 * `selectors` must include a `TextQuoteSelector` and may include other selector
 * types.
 */
async function anchorRange(selectors: Selector[]): Promise<Range> {
  const quote = selectors.find(s => s.type === 'TextQuoteSelector') as
    | TextQuoteSelector
    | undefined;

  // The quote selector is required in order to check that text position
  // selector results are still valid.
  if (!quote) {
    throw new Error('No quote selector found');
  }

  const position = selectors.find(s => s.type === 'TextPositionSelector') as
    | TextPositionSelector
    | undefined;

  if (position) {
    // If we have a position selector, try using that first as it is the fastest
    // anchoring method.
    try {
      const { index, offset, text } = await findPageByOffset(position.start);
      const start = position.start - offset;
      const end = position.end - offset;

      const matchedText = text.substring(start, end);
      if (quote.exact !== matchedText) {
        throw new Error('quote mismatch');
      }

      const range = await anchorByPosition(index, start, end);
      return range;
    } catch {
      // Fall back to quote selector
    }

    // If anchoring with the position failed, check for a cached quote-based
    // match using the quote + position as a cache key.
    try {
      const cacheKey = quotePositionCacheKey(quote.exact, position.start);
      const cachedPos = quotePositionCache.get(cacheKey);
      if (cachedPos) {
        const { pageIndex, anchor } = cachedPos;
        const range = await anchorByPosition(
          pageIndex,
          anchor.start,
          anchor.end,
        );
        return range;
      }
    } catch {
      // Fall back to uncached quote selector match
    }
  }

  return anchorQuote(quote, position?.start);
}

/**
 * Anchor a set of selectors to either a DOM Range or a shape anchor.
 */
export async function anchor(
  selectors: Selector[],
): Promise<Range | ShapeAnchor> {
  const pageSelector = selectors.find(s => s.type === 'PageSelector') as
    | PageSelector
    | undefined;
  const shapeSelector = selectors.find(s => s.type === 'ShapeSelector') as
    | ShapeSelector
    | undefined;

  if (shapeSelector) {
    if (!pageSelector) {
      throw new Error('Cannot anchor a shape selector without a page');
    }
    return anchorShape(pageSelector, shapeSelector);
  } else {
    return anchorRange(selectors);
  }
}

function clamp(x: number, min: number, max: number): number {
  return Math.max(Math.min(x, max), min);
}

async function anchorShape(
  pageSelector: PageSelector,
  shapeSelector: ShapeSelector,
): Promise<ShapeAnchor> {
  const viewer = getPDFViewer();
  if (
    typeof pageSelector.index !== 'number' ||
    pageSelector.index < 0 ||
    pageSelector.index >= viewer.pagesCount
  ) {
    throw new Error('PDF page index is invalid');
  }

  const pageView = await getPageView(pageSelector.index);
  const anchor = pageView.div;
  const viewport = pageView.viewport;

  const clampCoord = (coord: number) => clamp(coord, 0, 1);

  // Map the user-space coordinates of the shape to coordinates relative to the
  // PDF page container, where the top-left is (0, 0) and the bottom right is
  // (1, 1).
  let shape: Shape;
  switch (shapeSelector.shape.type) {
    case 'rect':
      {
        const s = shapeSelector.shape;
        let [left, top] = viewport.convertToViewportPoint(s.left, s.top);
        let [right, bottom] = viewport.convertToViewportPoint(
          s.right,
          s.bottom,
        );
        if (right < left) {
          [left, right] = [right, left];
        }
        if (bottom < top) {
          [top, bottom] = [bottom, top];
        }
        shape = {
          type: 'rect',
          left: clampCoord(left / viewport.width),
          top: clampCoord(top / viewport.height),
          right: clampCoord(right / viewport.width),
          bottom: clampCoord(bottom / viewport.height),
        };
      }
      break;
    case 'point':
      {
        const s = shapeSelector.shape;
        const [x, y] = pageView.viewport.convertToViewportPoint(s.x, s.y);
        shape = {
          type: 'point',
          x: clampCoord(x / viewport.width),
          y: clampCoord(y / viewport.height),
        };
      }
      break;
    default:
      throw new Error('Unsupported shape in shape selector');
  }

  return {
    anchor,
    shape,
    coordinates: 'anchor',
  };
}

/**
 * Prepare a DOM range for generating selectors and find the containing text layer.
 *
 * @throws If the range cannot be annotated
 */
function getTextLayerForRange(range: Range): [Range, Element] {
  // "Shrink" the range so that the start and endpoints are at offsets within
  // text nodes rather than any containing nodes.
  try {
    range = TextRange.fromRange(range).toRange();
  } catch {
    throw new Error('Selection does not contain text');
  }

  const startTextLayer = getNodeTextLayer(range.startContainer);
  const endTextLayer = getNodeTextLayer(range.endContainer);

  if (!startTextLayer || !endTextLayer) {
    throw new Error('Selection is outside page text');
  }

  if (startTextLayer !== endTextLayer) {
    throw new Error('Selecting across page breaks is not supported');
  }

  return [range, startTextLayer];
}

/**
 * Return true if selectors can be generated for a range using `describe`.
 *
 * This function is faster than calling `describe` if the selectors are not
 * required.
 */
export function canDescribe(range: Range) {
  try {
    getTextLayerForRange(range);
    return true;
  } catch {
    return false;
  }
}

/** Return the index of the PDF page which contains `el`. */
function getContainingPageIndex(el: Element): number {
  const page = el.closest('.page');

  // `data-page-number` contains the 1-based page number. If the visible page
  // number is not numeric (eg. "i"), that will be stored in `data-page-label`.
  const pageNumber = parseInt(page?.getAttribute('data-page-number') ?? '');

  /* istanbul ignore next */
  if (!Number.isInteger(pageNumber)) {
    throw new Error('Unable to get page number from element');
  }

  return pageNumber - 1;
}

/**
 * Convert a DOM Range object into a set of selectors.
 *
 * Converts a DOM `Range` object into a `[position, quote]` tuple of selectors
 * which can be saved with an annotation and later passed to `anchor` to
 * convert the selectors back to a `Range`.
 *
 * @param root - The root element
 */
export async function describe(range: Range): Promise<Selector[]> {
  const [textRange, textLayer] = getTextLayerForRange(range);

  const startPos = TextPosition.fromPoint(
    textRange.startContainer,
    textRange.startOffset,
  ).relativeTo(textLayer);

  const endPos = TextPosition.fromPoint(
    textRange.endContainer,
    textRange.endOffset,
  ).relativeTo(textLayer);

  const startPageIndex = getContainingPageIndex(textLayer);
  const pageOffset = await getPageOffset(startPageIndex);

  const pageView = await getPageView(startPageIndex);

  const position = {
    type: 'TextPositionSelector',
    start: pageOffset + startPos.offset,
    end: pageOffset + endPos.offset,
  } as TextPositionSelector;

  const quote = TextQuoteAnchor.fromRange(pageView.div, textRange).toSelector();
  const pageSelector = createPageSelector(pageView, startPageIndex);

  return [position, quote, pageSelector];
}

type PDFPoint = {
  pageIndex: number;
  x: number;
  y: number;
};

/**
 * Map a point in viewport coordinates to a point in PDF user space coordinates.
 *
 * Returns `null` if the specified viewport coordinates are not in any PDF page.
 */
async function mapViewportToPDF(
  x: number,
  y: number,
): Promise<PDFPoint | null> {
  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    if (!el.classList.contains('page')) {
      continue;
    }
    const pageIndex = getContainingPageIndex(el);

    const pageStyle = getComputedStyle(el);
    const leftBorder = parseFloat(pageStyle.borderLeftWidth);
    const topBorder = parseFloat(pageStyle.borderTopWidth);

    const pageViewRect = el.getBoundingClientRect();
    const pageViewX = x - pageViewRect.left - leftBorder;
    const pageViewY = y - pageViewRect.top - topBorder;
    const pdfPageView = await getPageView(pageIndex);
    const [userX, userY] = pdfPageView.getPagePoint(pageViewX, pageViewY);

    return {
      pageIndex,
      x: userX,
      y: userY,
    };
  }
  return null;
}

function createPageSelector(
  view: PDFPageView,
  pageIndex: number,
): PageSelector {
  return {
    type: 'PageSelector',
    index: pageIndex,
    label: view.pageLabel ?? `${pageIndex + 1}`,
  };
}

export async function describeShape(shape: Shape): Promise<Selector[]> {
  const pageBoundingBox = (page: PDFPageProxy) => {
    const [viewLeft, viewBottom, viewRight, viewTop] = page.view;
    return {
      left: viewLeft,
      top: viewTop,
      right: viewRight,
      bottom: viewBottom,
    };
  };

  const textFromRect = (textLayer: HTMLElement, rect: DOMRect) => {
    // Set a limit on how much text is included in thumbnails, to avoid shape
    // selector objects becoming too large.
    const maxTextLen = 256;
    return textInDOMRect(textLayer, rect).slice(0, maxTextLen);
  };

  switch (shape.type) {
    case 'rect': {
      const [topLeft, bottomRight] = await Promise.all([
        mapViewportToPDF(shape.left, shape.top),
        mapViewportToPDF(shape.right, shape.bottom),
      ]);
      if (!topLeft) {
        throw new Error('Top-left point is not in a page');
      }
      if (!bottomRight) {
        throw new Error('Bottom-right point is not in a page');
      }

      if (topLeft.pageIndex !== bottomRight.pageIndex) {
        throw new Error('Shape must start and end on same page');
      }

      const pageView = await getPageView(topLeft.pageIndex);
      const pdfRect = {
        type: 'rect',
        left: topLeft.x,
        top: topLeft.y,
        right: bottomRight.x,
        bottom: bottomRight.y,
      } as const;

      const textLayer = getTextLayerFromPoint(shape.left, shape.top);
      let text;
      if (textLayer) {
        const rect = new DOMRect(
          shape.left,
          shape.top,
          shape.right - shape.left,
          shape.bottom - shape.top,
        );
        text = textFromRect(textLayer, rect);
      }

      return [
        createPageSelector(pageView, topLeft.pageIndex),
        {
          type: 'ShapeSelector',
          anchor: 'page',
          shape: pdfRect,
          view: pageBoundingBox(pageView.pdfPage),
          text,
        },
      ];
    }
    case 'point': {
      const point = await mapViewportToPDF(shape.x, shape.y);
      if (!point) {
        throw new Error('Point is not in a page');
      }

      const textLayer = getTextLayerFromPoint(shape.x, shape.y);
      let text;
      if (textLayer) {
        const rect = new DOMRect(shape.x, shape.y, 1, 1);
        text = textFromRect(textLayer, rect);
      }

      const pageView = await getPageView(point.pageIndex);
      return [
        createPageSelector(pageView, point.pageIndex),
        {
          type: 'ShapeSelector',
          anchor: 'page',
          shape: {
            type: 'point',
            x: point.x,
            y: point.y,
          },
          text,
          view: pageBoundingBox(pageView.pdfPage),
        },
      ];
    }
    default:
      throw new Error('Unsupported shape');
  }
}

/**
 * Clear this module's internal caches.
 *
 * This exists mainly as a helper for use in tests.
 */
export function purgeCache() {
  pageTextCache.clear();
  quotePositionCache.clear();
}
