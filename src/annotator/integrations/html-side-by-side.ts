import { rectContains, rectIntersects } from '../util/geometry';
import { nodeIsElement, nodeIsText } from '../util/node';

/**
 * CSS selectors used to find elements that are considered potentially part
 * of the main content of a page.
 */
const contentSelectors = [
  'p',

  // Paragraphs in VitalSource "Great Book" format ebooks.
  '.para',
];

/**
 * Attempt to guess the region of the page that contains the main content.
 *
 * @return The left/right content margins or `null` if they could not be determined
 */
export function guessMainContentArea(
  root: Element
): { left: number; right: number } | null {
  // Maps of (margin X coord, votes) for margin positions.
  const leftMarginVotes = new Map<number, number>();
  const rightMarginVotes = new Map<number, number>();

  // Gather data about the paragraphs of text in the document.
  //
  // In future we might want to expand this to consider other text containers,
  // since some pages, especially eg. in ebooks, may not have any paragraphs
  // (eg. instead they may only contain tables or lists or headings).
  const contentSelector = contentSelectors.join(',');
  const paragraphs = Array.from(root.querySelectorAll(contentSelector))
    .map(p => {
      // Gather some data about them.
      const rect = p.getBoundingClientRect();
      const textLength = p.textContent!.length;
      return { rect, textLength };
    })
    .filter(({ rect }) => {
      // Filter out hidden paragraphs
      return rect.width > 0 && rect.height > 0;
    })
    // Select the paragraphs containing the most text.
    .sort((a, b) => b.textLength - a.textLength)
    .slice(0, 15);

  // Let these paragraphs "vote" for what the left and right margins of the
  // main content area in the document are.
  paragraphs.forEach(({ rect }) => {
    let leftVotes = leftMarginVotes.get(rect.left) ?? 0;
    leftVotes += 1;
    leftMarginVotes.set(rect.left, leftVotes);

    let rightVotes = rightMarginVotes.get(rect.right) ?? 0;
    rightVotes += 1;
    rightMarginVotes.set(rect.right, rightVotes);
  });

  // Find the margin values with the most votes.
  if (leftMarginVotes.size === 0 || rightMarginVotes.size === 0) {
    return null;
  }

  const leftMargin = [...leftMarginVotes.entries()].sort((a, b) => b[1] - a[1]);
  const rightMargin = [...rightMarginVotes.entries()].sort(
    (a, b) => b[1] - a[1]
  );

  const [leftPos] = leftMargin[0];
  const [rightPos] = rightMargin[0];

  return { left: leftPos, right: rightPos };
}

let textRectRange: Range;

/**
 * Return the viewport-relative rect occupied by part of a text node.
 */
function textRect(text: Text, start = 0, end: number = text.data.length) {
  if (!textRectRange) {
    // Allocate a range only on the first call to avoid the overhead of
    // constructing and maintaining a large number of live ranges.
    textRectRange = document.createRange();
  }
  textRectRange.setStart(text, start);
  textRectRange.setEnd(text, end);
  return textRectRange.getBoundingClientRect();
}

function hasFixedPosition(element: Element) {
  switch (getComputedStyle(element).position) {
    case 'fixed':
    case 'sticky':
      return true;
    default:
      return false;
  }
}

/**
 * Return the bounding rect that contains the element's content. Unlike
 * `Element.getBoundingClientRect`, this includes content which overflows
 * the element's specified size.
 */
function elementContentRect(element: Element) {
  const rect = element.getBoundingClientRect();
  rect.x -= element.scrollLeft;
  rect.y -= element.scrollTop;
  rect.height = Math.max(rect.height, element.scrollHeight);
  rect.width = Math.max(rect.width, element.scrollWidth);
  return rect;
}

/**
 * Yield all the text node descendants of `root` that intersect `rect`.
 *
 * @param shouldVisit - Optional filter that determines whether to visit a subtree
 */
function* textNodesInRect(
  root: Element,
  rect: DOMRect,
  shouldVisit: (el: Element) => boolean = () => true
): Generator<Text> {
  let node: Node | null = root.firstChild;
  while (node) {
    if (nodeIsElement(node)) {
      const contentIntersectsRect = rectIntersects(
        elementContentRect(node),
        rect
      );

      // Only examine subtrees which are visible.
      if (shouldVisit(node) && contentIntersectsRect) {
        yield* textNodesInRect(node, rect, shouldVisit);
      }
    } else if (nodeIsText(node)) {
      // Skip over text nodes which are entirely outside the viewport or empty.
      if (rectIntersects(textRect(node), rect)) {
        yield node;
      }
    }
    node = node.nextSibling;
  }
}

/**
 * Find content within an element to use as an anchor when applying a layout
 * change to the document.
 *
 * @return Range to use as an anchor or `null` if a suitable range could not be found
 */
function getScrollAnchor(root: Element, viewport: DOMRect): Range | null {
  // Range representing the content whose position within the viewport we will
  // try to maintain after running the callback.
  let anchorRange: Range | null = null;

  // Find the first word (non-whitespace substring of a text node) that is fully
  // visible in the viewport.

  // Text inside fixed-position elements is ignored because its position won't
  // be affected by a layout change and so it makes a poor scroll anchor.
  const shouldVisit = (el: Element) => !hasFixedPosition(el);

  textNodeLoop: for (const textNode of textNodesInRect(
    root,
    viewport,
    shouldVisit
  )) {
    let textLen = 0;

    // Visit all the non-whitespace substrings of the text node.
    for (const word of textNode.data.split(/\b/)) {
      if (/\S/.test(word)) {
        const start = textLen;
        const end = textLen + word.length;
        const wordBox = textRect(textNode, start, end);
        if (rectContains(viewport, wordBox)) {
          anchorRange = document.createRange();
          anchorRange.setStart(textNode, start);
          anchorRange.setEnd(textNode, end);
          break textNodeLoop;
        }
      }

      textLen += word.length;
    }
  }

  return anchorRange;
}

/**
 * Apply a layout change to the document and preserve the scroll position.
 *
 * This utility selects part of the content in the viewport as an _anchor_
 * and tries to preserve the position of this content within the viewport
 * after the callback is invoked.
 *
 * @param callback - Callback that will apply the layout change
 * @param [viewport] - Area to consider "in the viewport". Defaults to the
 *   viewport of the current window.
 * @return Amount by which the scroll position was adjusted to keep the anchored
 *   content in view
 */
export function preserveScrollPosition(
  callback: () => void,
  /* istanbul ignore next */
  scrollRoot: Element = document.documentElement,
  /* istanbul ignore next */
  viewport: DOMRect = new DOMRect(0, 0, window.innerWidth, window.innerHeight)
): number {
  const anchor = getScrollAnchor(scrollRoot, viewport);
  if (!anchor) {
    callback();
    return 0;
  }

  const anchorTop = anchor.getBoundingClientRect().top;
  callback();
  const newAnchorTop = anchor.getBoundingClientRect().top;

  // Determine how far we scrolled as a result of the layout change.
  // This will be positive if the anchor element moved down or negative if it moved up.
  const scrollDelta = newAnchorTop - anchorTop;
  scrollRoot.scrollTop += scrollDelta;

  return scrollDelta;
}
