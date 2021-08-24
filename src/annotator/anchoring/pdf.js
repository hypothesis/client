/* global PDFViewerApplication */

import warnOnce from '../../shared/warn-once';
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
 * @prop {Object} anchor
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
 * @type {Record<number,Promise<string> | undefined>}
 */
let pageTextCache = {};

/**
 * A cache that maps a `(quote, text offset in document)` key to a specific
 * location in the document.
 *
 * The components of the key come from an annotation's selectors. This is used
 * to speed up re-anchoring an annotation that was previously anchored in the
 * current session.
 *
 * @type {Map<string, { pageIndex: number, start: number, end: number }>}
 */
const quotePositionCache = new Map();

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
 * The page text returned by this function should match the `textContent` of the
 * text layer element that PDF.js creates for rendered pages. This allows
 * offsets computed in the text to be reused as offsets within the text layer
 * element's content. This is important to create correct Ranges for anchored
 * selectors.
 *
 * @param {number} pageIndex
 * @return {Promise<string>}
 */
function getPageTextContent(pageIndex) {
  // If we already have or are fetching the text for this page, return the
  // existing result.
  const cachedText = pageTextCache[pageIndex];
  if (cachedText) {
    return cachedText;
  }

  const getPageText = async () => {
    const pageView = await getPageView(pageIndex);
    const textContent = await pageView.pdfPage.getTextContent({
      normalizeWhitespace: true,
    });
    let items = textContent.items;

    // Versions of PDF.js < v2.9.359 did not create elements in the text layer for
    // text items that contained all-whitespace strings. Newer versions (after
    // https://github.com/mozilla/pdf.js/pull/13257) do. The same commit also
    // introduced the `hasEOL` property to text items, so we use the absence
    // of this property to determine if we need to filter out whitespace-only strings.
    const excludeEmpty = items.length > 0 && !('hasEOL' in items[0]);
    if (excludeEmpty) {
      items = items.filter(it => /\S/.test(it.str));
    }

    return items.map(it => it.str).join('');
  };

  // This function synchronously populates the cache with a promise so that
  // multiple calls don't call `PDFPageProxy.getTextContent` twice.
  const pageText = getPageText();
  pageTextCache[pageIndex] = pageText;
  return pageText;
}

/**
 * Find the offset within the document's text at which a page's text begins.
 *
 * @param {number} pageIndex
 * @return {Promise<number>} - Character offset of start of within document text
 */
async function getPageOffset(pageIndex) {
  const viewer = getPdfViewer();
  if (pageIndex >= viewer.pagesCount) {
    /* istanbul ignore next - This should never be triggered */
    throw new Error('Invalid page index');
  }
  let pageOffset = 0;
  for (let i = 0; i < pageIndex; i++) {
    const text = await getPageTextContent(i);
    pageOffset += text.length;
  }
  return pageOffset;
}

/**
 * @typedef PageOffset
 * @prop {number} index - Page index
 * @prop {number} offset - Character offset of start of page within document text
 * @prop {string} text - Text of page
 */

/**
 * Find the page containing a given text `offset` within the document.
 *
 * @param {number} offset
 * @return {Promise<PageOffset>}
 */
async function findPageByOffset(offset) {
  const viewer = getPdfViewer();
  let pageEndOffset = 0;
  for (let i = 0; i < viewer.pagesCount; i++) {
    const text = await getPageTextContent(i);
    const pageStartOffset = pageEndOffset;
    pageEndOffset += text.length;

    if (pageEndOffset >= offset) {
      return { index: i, offset: pageStartOffset, text };
    }
  }
  throw new Error('Offset is beyond end of document');
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
    const root = page.textLayer.textLayerDiv;

    // Do a sanity check to verify that the page text extracted by `getPageTextContent`
    // matches the transparent text layer.
    //
    // See https://github.com/hypothesis/client/issues/3674.
    if (pageText !== root.textContent) {
      /* istanbul ignore next */
      warnOnce(
        'PDF text layer content does not match page text. This will cause anchoring misalignment.'
      );
    }

    const startPos = new TextPosition(root, start);
    const endPos = new TextPosition(root, end);
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
 * Return an array filled with numbers from start (inclusive) to end (exlusive).
 *
 * @param {number} start
 * @param {number} end
 */
function range(start, end) {
  return Array(end - start)
    .fill(0)
    .map((_, i) => start + i);
}

/**
 * @param {TextQuoteSelector} quote
 * @param {number} position
 */
function quotePositionCacheKey(quote, position) {
  return `${quote.exact}:${position}`;
}

/**
 * Search for a quote in the PDF text.
 *
 * @param {TextQuoteSelector} quoteSelector
 * @param {number} [positionHint] - Expected offset of quote. This is used to
 *   choose between equally good matches.
 * @return {Promise<Range>}
 */
async function findQuote(quoteSelector, positionHint) {
  const viewer = getPdfViewer();
  const pageIndexes = range(0, viewer.pagesCount);
  const pageTexts = await Promise.all(
    pageIndexes.map(i => getPageTextContent(i))
  );
  const pageOffsets = [0];
  let maxOffset = 0;
  for (let i = 0; i < pageTexts.length; i++) {
    maxOffset += pageTexts[i].length;
    pageOffsets.push(maxOffset);
  }

  // Find the best match for this quote across the entire document.
  const documentText = pageTexts.join('');
  const match = matchQuote(documentText, quoteSelector.exact, {
    prefix: quoteSelector.prefix,
    suffix: quoteSelector.suffix,
    hint: positionHint,
  });

  if (!match) {
    throw new Error('Quote not found');
  }

  const pageIndex = pageOffsets.findIndex(
    (offset, i, offsets) =>
      match.start >= offset && match.start < offsets[i + 1]
  );

  // Get offsets of match within the page. If the match spans multiple pages
  // we currently truncate at the page boundary. It would be useful to support
  // cross-page matches, but that involves many other changes as anchoring would
  // need to return multiple ranges.
  const start = match.start - pageOffsets[pageIndex];
  const end = Math.min(
    match.end - pageOffsets[pageIndex],
    pageOffsets[pageIndex + 1]
  );

  if (positionHint) {
    const cacheKey = quotePositionCacheKey(quoteSelector, positionHint);
    quotePositionCache.set(cacheKey, { pageIndex, start, end });
  }

  return anchorByPosition(pageIndex, start, end);
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
      const length = end - start;

      const matchedText = text.substr(start, length);
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
      const cacheKey = quotePositionCacheKey(quote, position.start);
      const cachedPosition = quotePositionCache.get(cacheKey);
      if (cachedPosition) {
        const { pageIndex, start, end } = cachedPosition;
        const range = await anchorByPosition(pageIndex, start, end);
        return range;
      }
    } catch {
      // Fall back to uncached quote selector match
    }
  }

  return findQuote(quote, position?.start);
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

  const startPos = TextPosition.fromPoint(
    range.startContainer,
    range.startOffset
  ).relativeTo(startTextLayer);

  const endPos = TextPosition.fromPoint(
    range.endContainer,
    range.endOffset
  ).relativeTo(endTextLayer);

  const startPageIndex = getSiblingIndex(
    /** @type {Node} */ (startTextLayer.parentNode)
  );
  const pageOffset = await getPageOffset(startPageIndex);

  /** @type {TextPositionSelector} */
  const position = {
    type: 'TextPositionSelector',
    start: pageOffset + startPos.offset,
    end: pageOffset + endPos.offset,
  };

  const quote = TextQuoteAnchor.fromRange(root, range).toSelector();

  return [position, quote];
}

/**
 * Clear this module's internal caches.
 *
 * This exists mainly as a helper for use in tests.
 */
export function purgeCache() {
  pageTextCache = {};
  quotePositionCache.clear();
}
