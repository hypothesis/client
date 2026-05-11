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
 * Return the text within `range` with each `<br>` replaced by a space.
 *
 * Same as `range.toString()` otherwise — no whitespace collapsing, no
 * block-tag handling. The `<br>` → space substitution exists so that
 * selections spanning a line break aren't reported as run-together words.
 */
export function renderedTextFromRange(range: Range): string {
  const container = document.createElement('div');
  container.appendChild(range.cloneContents());
  return substituteBrs(container);
}
