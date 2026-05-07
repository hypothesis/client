/**
 * Tags whose boundaries should produce a whitespace break in the rendered
 * text, even though the boundary itself is not represented as a character in
 * the DOM's `textContent`. Mirrors the visible whitespace a user perceives
 * when they read the rendered page or copy a selection out to a single-line
 * input.
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
  /**
   * Rendered/normalized text of the root: collapsed whitespace, with a single
   * space inserted at each `<br>` and block-tag boundary.
   */
  text: string;
  /**
   * For each raw offset i (0..rawText.length, treated as a position between
   * characters), the position in `text` where rawText[i] first contributes
   * (or, for synthesized spaces, where the space is inserted at that
   * boundary). Undefined entries indicate raw chars that were suppressed
   * (e.g., a whitespace char that collapsed into a previous space) —
   * `toNormalized` scans backwards to the nearest defined entry.
   */
  rawToNormalized: (number | undefined)[];
  /** For each output position, the raw offset that produced it. */
  normalizedToRaw: number[];
};

type BuildState = {
  output: string;
  rawToNormalized: (number | undefined)[];
  normalizedToRaw: number[];
  rawPosition: number;
};

/**
 * Append `character` (originating at `fromRaw` in raw text) to `state.output`,
 * collapsing whitespace runs and updating the raw↔normalized maps in place.
 */
function append(state: BuildState, character: string, fromRaw: number) {
  if (/\s/.test(character)) {
    if (state.output.length === 0 || state.output.endsWith(' ')) {
      return;
    }
    character = ' ';
  }
  state.output += character;
  state.normalizedToRaw.push(fromRaw);
  if (state.rawToNormalized[fromRaw] === undefined) {
    state.rawToNormalized[fromRaw] = state.normalizedToRaw.length - 1;
  }
}

function walk(node: Node, state: BuildState) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    for (let i = 0; i < text.length; i++) {
      append(state, text[i], state.rawPosition);
      state.rawPosition += 1;
    }
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const el = node as Element;
  if (el.tagName === 'BR') {
    append(state, ' ', state.rawPosition);
    return;
  }

  const block = BLOCK_TAGS.has(el.nodeName);
  if (block) {
    append(state, ' ', state.rawPosition);
  }
  for (const child of Array.from(node.childNodes)) {
    walk(child, state);
  }
  if (block) {
    append(state, ' ', state.rawPosition);
  }
}

/**
 * Walk `root`'s DOM subtree and produce its rendered text along with offset
 * maps between raw `textContent` and the rendered output.
 *
 * Whitespace runs (including the synthesized boundary spaces) are collapsed
 * to a single ASCII space, and leading/consecutive whitespace is suppressed —
 * matching what a user sees when they read the page or paste a selection
 * into a single-line input.
 */
export function renderedTextOf(root: Element): RenderedText {
  const rawText = root.textContent ?? '';
  const state: BuildState = {
    output: '',
    rawToNormalized: new Array(rawText.length + 1).fill(undefined),
    normalizedToRaw: [],
    rawPosition: 0,
  };

  walk(root, state);

  // End-of-string sentinel so callers can pass rawText.length / output.length
  // without going out of bounds.
  if (state.rawToNormalized[state.rawPosition] === undefined) {
    state.rawToNormalized[state.rawPosition] = state.normalizedToRaw.length;
  }
  state.normalizedToRaw.push(state.rawPosition);

  return {
    text: state.output,
    rawToNormalized: state.rawToNormalized,
    normalizedToRaw: state.normalizedToRaw,
  };
}

/** Translate a raw `textContent` offset into a position in the rendered text. */
export function toNormalized(
  rawToNormalized: (number | undefined)[],
  rawOffset: number,
): number {
  if (rawOffset < 0) {
    return 0;
  }
  const clamped = Math.min(rawOffset, rawToNormalized.length - 1);
  for (let i = clamped; i >= 0; i--) {
    const value = rawToNormalized[i];
    if (value !== undefined) {
      return value;
    }
  }
  return 0;
}

/** Translate a position in the rendered text back to a raw `textContent` offset. */
export function toRaw(
  normalizedToRaw: number[],
  normalizedOffset: number,
): number {
  if (normalizedOffset <= 0) {
    return 0;
  }
  const clamped = Math.min(normalizedOffset, normalizedToRaw.length - 1);
  return normalizedToRaw[clamped];
}
