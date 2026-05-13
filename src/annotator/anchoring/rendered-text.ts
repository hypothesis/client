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

/**
 * Rendered text of `root` (with each `<br>` replaced by a space) plus the
 * positions in that rendered text where the synthesized spaces were
 * inserted. The positions are used by callers that match against the
 * rendered text and need to translate match offsets back to offsets in the
 * raw `textContent` (where `<br>` contributes no characters).
 */
type RenderedTextWithBrPositions = {
  /** Rendered text — raw textContent with each `<br>` replaced by a space. */
  text: string;
  /**
   * Offsets within `text` where a synthesized space was inserted for a
   * `<br>` element. Sorted in document order.
   */
  brPositionsInText: number[];
};

/**
 * Walk `root`'s DOM and produce its rendered text (with each `<br>`
 * replaced by a space) along with the positions of those synthesized
 * spaces. The walk is in document order so `brPositionsInText` reflects
 * each `<br>` exactly once at the offset where its space lives in `text`.
 */
export function renderedTextOf(root: Element): RenderedTextWithBrPositions {
  let text = '';
  const brPositionsInText: number[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const element = node as Element;
    if (element.tagName === 'BR') {
      brPositionsInText.push(text.length);
      text += ' ';
      return;
    }
    for (const child of Array.from(node.childNodes)) {
      walk(child);
    }
  };
  walk(root);

  return { text, brPositionsInText };
}

/**
 * Translate an offset within rendered text (produced by {@link renderedTextOf})
 * back to an offset within the raw `textContent` of the same root.
 *
 * Each `<br>` contributes one character to the rendered text and zero
 * characters to `textContent`, so the raw offset equals the rendered offset
 * minus the number of `<br>` positions that precede it.
 */
export function renderedOffsetToRaw(
  brPositionsInText: number[],
  renderedOffset: number,
): number {
  let count = 0;
  for (const brPos of brPositionsInText) {
    if (brPos < renderedOffset) {
      count += 1;
    } else {
      break;
    }
  }
  return renderedOffset - count;
}
