/**
 * Tags whose boundaries should produce a whitespace break in the rendered text,
 * even though the boundary itself is not represented as a character in the
 * DOM's `textContent`. Mirrors the visible whitespace a user perceives when
 * they read the rendered page or copy a selection out to a single-line input.
 */
const BLOCK_TAGS = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DIV',
  'DL',
  'FIELDSET',
  'FIGCAPTION',
  'FIGURE',
  'FOOTER',
  'FORM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'HR',
  'LI',
  'MAIN',
  'NAV',
  'OL',
  'P',
  'SECTION',
  'TABLE',
  'TD',
  'TH',
  'TR',
  'UL',
]);

export type RenderedText = {
  /** Rendered/normalized text of the root: collapsed whitespace, with a single
   *  space inserted at each `<br>` and block-tag boundary. */
  text: string;
  /** Translate a raw `textContent` offset to a position in `text`. */
  toNorm: (rawOffset: number) => number;
  /** Translate a position in `text` back to a raw `textContent` offset. */
  toRaw: (normOffset: number) => number;
};

/**
 * Walk `root`'s DOM subtree and produce its rendered text along with offset
 * translators between raw `textContent` and the rendered output.
 *
 * Whitespace runs (including the synthesized boundary spaces) are collapsed to
 * a single ASCII space, and leading/consecutive whitespace is suppressed —
 * matching what a user sees when they read the page or paste a selection into
 * a single-line input.
 */
export function renderedTextOf(root: Element): RenderedText {
  const rawText = root.textContent ?? '';
  let out = '';
  // For each raw offset i (0..rawText.length), the position in `out` where
  // rawText[i] first contributes (or, for synthesized spaces, where the space
  // is inserted at that boundary). Undefined entries indicate raw chars that
  // were suppressed (e.g., a whitespace char that collapsed into a previous
  // space) — translateRawToNorm scans backwards to the nearest defined entry.
  const rawToNorm: (number | undefined)[] = new Array(rawText.length + 1).fill(
    undefined,
  );
  // For each output position, the raw offset that produced it.
  const normToRaw: number[] = [];

  let rawPos = 0;

  const append = (ch: string, fromRaw: number) => {
    if (/\s/.test(ch)) {
      if (out.length === 0 || out.endsWith(' ')) {
        return;
      }
      ch = ' ';
    }
    out += ch;
    normToRaw.push(fromRaw);
    if (rawToNorm[fromRaw] === undefined) {
      rawToNorm[fromRaw] = normToRaw.length - 1;
    }
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      for (let i = 0; i < text.length; i++) {
        append(text[i], rawPos);
        rawPos += 1;
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const el = node as Element;
    if (el.tagName === 'BR') {
      append(' ', rawPos);
      return;
    }

    const block = BLOCK_TAGS.has(el.nodeName);
    if (block) {
      append(' ', rawPos);
    }
    for (const child of Array.from(node.childNodes)) {
      walk(child);
    }
    if (block) {
      append(' ', rawPos);
    }
  };

  walk(root);

  // End-of-string sentinel so callers can pass rawText.length / out.length
  // without going out of bounds.
  if (rawToNorm[rawPos] === undefined) {
    rawToNorm[rawPos] = normToRaw.length;
  }
  normToRaw.push(rawPos);

  const toNorm = (rawOffset: number): number => {
    if (rawOffset < 0) {
      return 0;
    }
    const clamped = Math.min(rawOffset, rawToNorm.length - 1);
    for (let i = clamped; i >= 0; i--) {
      const val = rawToNorm[i];
      if (val !== undefined) {
        return val;
      }
    }
    return 0;
  };

  const toRaw = (normOffset: number): number => {
    if (normOffset <= 0) {
      return 0;
    }
    const clamped = Math.min(normOffset, normToRaw.length - 1);
    return normToRaw[clamped];
  };

  return { text: out, toNorm, toRaw };
}

/** Convenience: rendered text of a Range's contents. */
export function renderedTextFromRange(range: Range): string {
  const div = document.createElement('div');
  div.appendChild(range.cloneContents());
  return renderedTextOf(div).text;
}
