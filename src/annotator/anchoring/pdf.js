/* global PDFViewerApplication */

import { warnOnce } from '../../shared/warn-once';
import { translateOffsets } from '../util/normalize';
import { matchQuote } from './match-quote';
import { createPlaceholder } from './placeholder';
import { TextPosition, TextRange } from './text-range';
import { TextQuoteAnchor } from './types';

/**
 * @typedef {import('../../types/api').TextPositionSelector} TextPositionSelector
 * @typedef {import('../../types/api').TextQuoteSelector} TextQuoteSelector
 * @typedef {import('../../types/api').Selector} Selector
 *
 * @typedef {import('../../types/pdfjs').PDFPageView} PDFPageView
 * @typedef {import('../../types/pdfjs').PDFViewer} PDFViewer
 */

/**
 * @typedef PdfTextRange
 * @prop {number} pageIndex
 * @prop {object} anchor
 * @prop {number} anchor.start - Start character offset within the page's text
 * @prop {number} anchor.end - End character offset within the page's text
 */

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
 *
 * @type {Map<number, Promise<string>>}
 */
const pageTextCache = new Map();

/**
 * A cache that maps a `{quote}:{offset}` key to a specific
 * location in the document.
 *
 * The components of the key come from an annotation's selectors. This is used
 * to speed up re-anchoring an annotation that was previously anchored in the
 * current session.
 *
 * @type {Map<string, PdfTextRange>}
 */
const quotePositionCache = new Map();

/**
 * Return a cache key for lookups in `quotePositionCache`.
 *
 * @param {string} quote
 * @param {number} [pos] - Offset in document text
 */
function quotePositionCacheKey(quote, pos) {
  return `${quote}:${pos}`;
}

/**
 * Return offset of `node` among its siblings
 *
 * @param {Node} node
 */
function getSiblingIndex(node) {
  let index = 0;
  while (node.previousSibling) {
    ++index;
    node = node.previousSibling;
  }
  return index;
}

/**
 * Return the text layer element of the PDF page containing `node`.
 *
 * @param {Node|Element} node
 * @return {Element|null}
 */
function getNodeTextLayer(node) {
  const el = 'closest' in node ? node : node.parentElement;
  return el?.closest('.textLayer') ?? null;
}

/**
 * Get the PDF.js viewer application.
 *
 * @return {PDFViewer}
 */
function getPdfViewer() {
  // @ts-ignore - TS doesn't know about PDFViewerApplication global.
  return PDFViewerApplication.pdfViewer;
}

/**
 * Returns the view into which a PDF page is drawn.
 *
 * If called while the PDF document is still loading, this will delay until
 * the document loading has progressed far enough for a `PDFPageView` and its
 * associated `PDFPage` to be ready.
 *
 * @param {number} pageIndex
 * @return {Promise<PDFPageView>}
 */
async function getPageView(pageIndex) {
  const pdfViewer = getPdfViewer();
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

  return /** @type {PDFPageView} */ (pageView);
}

/**
 * Return true if the document has selectable text.
 */
export async function documentHasText() {
  const viewer = getPdfViewer();
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
 *
 * @param {number} pageIndex
 * @return {Promise<string>}
 */
function getPageTextContent(pageIndex) {
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
 * @param {number} pageIndex
 * @return {Promise<number>} - Offset of page's text within document text
 */
async function getPageOffset(pageIndex) {
  const viewer = getPdfViewer();
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

/**
 * @typedef PageOffset
 * @prop {number} index - Page index
 * @prop {number} offset - Character offset of start of page within document text
 * @prop {string} text - Text of page
 */

/**
 * Find the page containing a text offset within the document.
 *
 * If the offset is invalid (less than 0 or greater than the length of the document)
 * then the nearest (first or last) page is returned.
 *
 * @param {number} offset
 * @return {Promise<PageOffset>}
 */
async function findPageByOffset(offset) {
  const viewer = getPdfViewer();

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
 *
 * @param {string} char
 */
function isSpace(char) {
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

/** @param {string} char */
const isNotSpace = char => !isSpace(char);

/**
 * Locate the DOM Range which a position selector refers to.
 *
 * If the page is off-screen it may be in an unrendered state, in which case
 * the text layer will not have been created. In that case a placeholder
 * DOM element is created and the returned range refers to that placeholder.
 * In that case, the selector will need to be re-anchored when the page is
 * scrolled into view.
 *
 * @param {number} pageIndex - The PDF page index
 * @param {number} start - Character offset within the page's text
 * @param {number} end - Character offset within the page's text
 * @return {Promise<Range>}
 */
async function anchorByPosition(pageIndex, start, end) {
  const [page, pageText] = await Promise.all([
    getPageView(pageIndex),
    getPageTextContent(pageIndex),
  ]);

  if (
    page.renderingState === RenderingStates.FINISHED &&
    page.textLayer &&
    page.textLayer.renderingDone
  ) {
    // The page has been rendered. Locate the position in the text layer.
    //
    // We allow for differences in whitespace between the text returned by
    // `getPageTextContent` and the text layer content. Any other differences
    // will cause mis-anchoring.

    const root = page.textLayer.textLayerDiv;
    const textLayerStr = /** @type {string} */ (root.textContent);

    const [textLayerStart, textLayerEnd] = translateOffsets(
      pageText,
      textLayerStr,
      start,
      end,
      isNotSpace
    );

    const textLayerQuote = stripSpaces(
      textLayerStr.slice(textLayerStart, textLayerEnd)
    );
    const pageTextQuote = stripSpaces(pageText.slice(start, end));
    if (textLayerQuote !== pageTextQuote) {
      warnOnce(
        'Text layer text does not match page text. Highlights will be mis-aligned.'
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
 *
 * @param {string} str
 */
function stripSpaces(str) {
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
 * @param {TextQuoteSelector} quoteSelector
 * @param {number} [positionHint] - Expected start offset of quote
 * @return {Promise<Range>} Location of quote
 */
async function anchorQuote(quoteSelector, positionHint) {
  // Determine which pages to search and in what order. If we have a position
  // hint we'll try to use that. Otherwise we'll just search all pages in order.
  const pageCount = getPdfViewer().pagesCount;
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
  for (let page of pageIndexes) {
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
          isNotSpace
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
        isNotSpace
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
          match.start
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
 *
 * @param {HTMLElement} root
 * @param {Selector[]} selectors
 * @return {Promise<Range>}
 */
export async function anchor(root, selectors) {
  const quote = /** @type {TextQuoteSelector|undefined} */ (
    selectors.find(s => s.type === 'TextQuoteSelector')
  );

  // The quote selector is required in order to check that text position
  // selector results are still valid.
  if (!quote) {
    throw new Error('No quote selector found');
  }

  const position = /** @type {TextPositionSelector|undefined} */ (
    selectors.find(s => s.type === 'TextPositionSelector')
  );

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
          anchor.end
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
 * Prepare a DOM range for generating selectors and find the containing text layer.
 *
 * @param {Range} range
 * @return {[Range, Element]}
 * @throws If the range cannot be annotated
 */
function getTextLayerForRange(range) {
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
 *
 * @param {Range} range
 */
export function canDescribe(range) {
  try {
    getTextLayerForRange(range);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a DOM Range object into a set of selectors.
 *
 * Converts a DOM `Range` object into a `[position, quote]` tuple of selectors
 * which can be saved with an annotation and later passed to `anchor` to
 * convert the selectors back to a `Range`.
 *
 * @param {HTMLElement} root - The root element
 * @param {Range} range
 * @return {Promise<Selector[]>}
 */
export async function describe(root, range) {
  const [textRange, textLayer] = getTextLayerForRange(range);

  const startPos = TextPosition.fromPoint(
    textRange.startContainer,
    textRange.startOffset
  ).relativeTo(textLayer);

  const endPos = TextPosition.fromPoint(
    textRange.endContainer,
    textRange.endOffset
  ).relativeTo(textLayer);

  const startPageIndex = getSiblingIndex(
    /** @type {Node} */ (textLayer.parentNode)
  );
  const pageOffset = await getPageOffset(startPageIndex);

  /** @type {TextPositionSelector} */
  const position = {
    type: 'TextPositionSelector',
    start: pageOffset + startPos.offset,
    end: pageOffset + endPos.offset,
  };

  const quote = TextQuoteAnchor.fromRange(root, textRange).toSelector();

  return [position, quote];
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
