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
