import type {
  PageSelector,
  Selector,
  TextQuoteSelector,
} from '../../types/api';
import { anchor as htmlAnchor } from './html';
import { TextRange } from './text-range';
import { TextQuoteAnchor } from './types';

/**
 * Return the text layer element of the PDF page containing `node`.
 */
function getNodeTextLayer(node: Node | Element): HTMLElement | null {
  const el = 'closest' in node ? node : node.parentElement;
  return el?.closest('.BRtextLayer') ?? null;
}

/**
 * Prepare a DOM range for generating selectors and find the containing text layer.
 *
 * @throws If the range cannot be annotated
 */
function getTextLayerForRange(range: Range): [Range, HTMLElement] {
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

/**
 * Convert a DOM Range object into a set of selectors.
 *
 * Converts a DOM `Range` object into a `[quote, pageSelector]` tuple of selectors
 * which can be saved with an annotation and later passed to `anchor` to
 * convert the selectors back to a `Range`.
 */
export async function describe(
  root: HTMLElement,
  range: Range,
): Promise<Selector[]> {
  const [textRange, textLayer] = getTextLayerForRange(range);

  const quote = TextQuoteAnchor.fromRange(root, textRange).toSelector();

  const pageContainer: HTMLElement = textLayer.closest('.BRpagecontainer')!;
  const pageIndex = parseFloat(pageContainer.dataset.index!);
  const pageLabel = pageContainer.dataset.label!;

  const pageSelector: PageSelector = {
    type: 'PageSelector',
    index: pageIndex,
    label: pageLabel || `n${pageIndex}`,
  };

  return [quote, pageSelector];
}

/**
 * Anchor a set of selectors to a DOM Range.
 *
 * `selectors` must include a `TextQuoteSelector` and may include other selector
 * types.
 */
export async function anchor(
  root: HTMLElement,
  selectors: Selector[],
): Promise<Range> {
  const quote = selectors.find(s => s.type === 'TextQuoteSelector') as
    | TextQuoteSelector
    | undefined;

  // The quote selector is required in order to check that text position
  // selector results are still valid.
  if (!quote) {
    throw new Error('No quote selector found');
  }

  const pageSelector = selectors.find(s => s.type === 'PageSelector') as
    | PageSelector
    | undefined;

  if (!pageSelector) {
    throw new Error('No page selector found');
  }

  // This will behave very similarly to the HTML; the only
  // difference is the page might not be rendered yet, but for
  // not let's assume it is.

  const pageIndex = pageSelector.index;
  const pageContainer = root.querySelector(
    `.BookReader:not(.BRmodeThumb) .BRpagecontainer[data-index="${pageIndex}"]`,
  );

  if (!pageContainer) {
    console.warn('Page not found:', pageIndex);
    // It's off-screen ; create a placeholder
    const placeholder = document.createElement('div');
    placeholder.classList.add('BRannotationPlaceholder');
    placeholder.style.display = 'none';
    placeholder.textContent = quote.exact;
    root.appendChild(placeholder);
    const range = document.createRange();
    range.selectNodeContents(placeholder);
    return range;
  }

  // Wait for any animations/etc
  const textLayer = await pollUntilTruthy(
    () => pageContainer.querySelector('.BRtextLayer'),
    { timeout: 5000 },
  );

  return await htmlAnchor(textLayer!, selectors);
}

/**
 * Helper method that polls the provided function until it returns a truthy
 * value or the timeout is reached.
 */
async function pollUntilTruthy<T>(
  fn: () => T,
  { timeout = 1000 },
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const val = fn();
      if (val) {
        clearInterval(interval);
        resolve(val);
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        resolve(undefined);
      }
    }, 100);
  });
}
