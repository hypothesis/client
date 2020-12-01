// Utilities related to resizing web pages in order to make space for the
// sidebar to be visible alongside the content.

/**
 * Attempt to guess the region of the page that contains the main content.
 *
 * @param {Element} root
 * @return {{ left: number, right: number }|null} -
 *   The left/right content margins or `null` if they could not be determined
 */
export function guessMainContentArea(root) {
  /** @type {Map<number,number>} */
  const leftMarginVotes = new Map();

  /** @type {Map<number,number>} */
  const rightMarginVotes = new Map();

  // Gather data about the paragraphs of text in the document.
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

  const [leftPos, leftVotes] = leftMargin[0];
  const [rightPos, rightVotes] = rightMargin[0];

  // If we didn't find at least `minVotes` paragraphs with the same left or
  // right edge, then we don't have enough confidence.
  const minVotes = 5;
  if (leftVotes < minVotes || rightVotes < minVotes) {
    return null;
  }

  return { left: leftPos, right: rightPos };
}

/**
 * Apply a layout change to the document and preserve the scroll position.
 *
 * This utility tries to ensure that the same part of the document remains
 * visible on screen after the content is resized.
 *
 * @param {() => any} callback - Callback that will apply the layout change
 */
export function preserveScrollPosition(callback) {
  // Element that we are going to scroll in order to keep the same content on
  // screen after the document has been resized.
  const scrollRoot = document.documentElement;

  // Find an element near the top of the screen to serve as a reference point.
  // We are currently just picking whatever element is in the middle of the screen,
  // but this should ideally be an element that will scroll together with the
  // scroll root, eg. excluding fixed elements.
  const anchorElement = document.elementFromPoint(window.innerWidth / 2, 1);
  if (!anchorElement) {
    callback();
    return;
  }

  const anchorTop = anchorElement.getBoundingClientRect().top;

  callback();

  const newAnchorTop = anchorElement.getBoundingClientRect().top;

  // Determine how far we scrolled as a result of the layout change.
  // This will be positive if the anchor element moved down or negative if it moved up.
  const scrollDelta = newAnchorTop - anchorTop;
  scrollRoot.scrollTop += scrollDelta;
}
