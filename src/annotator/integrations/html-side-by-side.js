/**
 * Attempt to guess the region of the page that contains the main content.
 *
 * @param {Element} root
 * @return {{ left: number, right: number }|null} -
 *   The left/right content margins or `null` if they could not be determined
 */
export function guessMainContentArea(root) {
  // Maps of (margin X coord, votes) for margin positions.

  /** @type {Map<number,number>} */
  const leftMarginVotes = new Map();

  /** @type {Map<number,number>} */
  const rightMarginVotes = new Map();

  // Gather data about the paragraphs of text in the document.
  //
  // In future we might want to expand this to consider other text containers,
  // since some pages, especially eg. in ebooks, may not have any paragraphs
  // (eg. instead they may only contain tables or lists or headings).
  const paragraphs = Array.from(root.querySelectorAll('p'))
    .map(p => {
      // Gather some data about them.
      const rect = p.getBoundingClientRect();
      const textLength = /** @type {string} */ (p.textContent).length;
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

/**
 * @param {DOMRect} a
 * @param {DOMRect} b
 */
function intersect(a, b) {
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.right, b.right);
  const top = Math.max(a.top, b.top);
  const bottom = Math.min(a.bottom, b.bottom);
  return new DOMRect(left, top, right - left, bottom - top);
}

/**
 * Find content within an element to use as an anchor when scrolling.
 *
 * @param {Element} scrollRoot
 * @return {Range|null} - Range to use as an anchor or `null` if a suitable
 *   range could not be found
 */
function getScrollAnchor(scrollRoot) {
  // Range representing the content whose position within the viewport we will
  // try to maintain after running the callback.
  let anchorRange = /** @type {Range|null} */ (null);

  const viewport = intersect(
    scrollRoot.getBoundingClientRect(),
    new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  );
  if (viewport.width < 0 || viewport.height < 0) {
    // Element being scrolled is outside the viewport
    return null;
  }

  // Create a range that includes the first word that is fully visible in the
  // viewport.
  //
  // This currently visits every text node in `scrollRoot` and tests every
  // possible anchor until it finds a suitable one. This could be optimized
  // by skipping over elements that are entirely outside the viewport.
  const walker = document.createTreeWalker(scrollRoot, NodeFilter.SHOW_TEXT);
  const tempRange = document.createRange();

  treeWalkLoop: while (walker.nextNode()) {
    const textNode = /** @type {Text} */ (walker.currentNode);
    let textLen = 0;

    for (let word of textNode.data.split(/\b/)) {
      if (/\S/.test(word)) {
        const start = textLen;
        const end = textLen + word.length;

        tempRange.setStart(textNode, start);
        tempRange.setEnd(textNode, end);

        const wordBox = tempRange.getBoundingClientRect();
        if (
          wordBox.left >= viewport.left &&
          wordBox.right <= viewport.right &&
          wordBox.top >= viewport.top &&
          wordBox.bottom <= viewport.bottom
        ) {
          anchorRange = tempRange.cloneRange();
          break treeWalkLoop;
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
 * @param {() => any} callback - Callback that will apply the layout change
 * @param {Element} [scrollRoot]
 * @return {number} - Amount by which the scroll position was adjusted to keep
 *   the anchored content in view
 */
export function preserveScrollPosition(
  callback,
  /* istanbul ignore next */
  scrollRoot = document.documentElement
) {
  const anchor = getScrollAnchor(scrollRoot);
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
