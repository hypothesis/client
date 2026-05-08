/**
 * Replace `<br>` elements in `root` with text nodes containing a single
 * space, then return the resulting `textContent`.
 *
 * `root` is mutated in place; pass a clone if the original DOM should be
 * preserved.
 */
function substituteBrs(root: Element): string {
  for (const br of Array.from(root.querySelectorAll('br'))) {
    br.replaceWith(document.createTextNode(' '));
  }
  return root.textContent ?? '';
}

/**
 * Don't collapse whitespace or block-level tags. Preserve the same behavior
 * as `root.textContent`, but add a space for `<br>` elements.
 */
export function renderedTextOf(root: Element): string {
  return substituteBrs(root.cloneNode(true) as Element);
}

/**
 * Same as {@link renderedTextOf} but operates on a `Range` rather than a
 * root element. Returns the text within the range with each `<br>` replaced
 * by a space.
 */
export function renderedTextFromRange(range: Range): string {
  const container = document.createElement('div');
  container.appendChild(range.cloneContents());
  return substituteBrs(container);
}
