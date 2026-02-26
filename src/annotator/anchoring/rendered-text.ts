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
  'PRE',
  'SECTION',
  'TABLE',
  'TD',
  'TH',
  'TR',
  'UL',
]);

const SPACE = ' ';

/** Collapse any run of whitespace (including newlines) to a single space. */
export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, SPACE);
}

function isBlock(node: Node): boolean {
  return node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(node.nodeName);
}

type RenderedText = {
  text: string;
  rawToNorm: number[];
  normToRaw: number[];
};

function appendNormalizedChar(
  ch: string,
  rawIndex: number,
  state: {
    output: string;
    rawToNorm: number[];
    normToRaw: number[];
  },
) {
  const isWs = /\s/.test(ch);
  if (isWs) {
    if (state.output.length === 0 || state.output.endsWith(SPACE)) {
      return;
    }
    ch = SPACE;
  }

  state.output += ch;
  state.normToRaw.push(rawIndex);
  if (state.rawToNorm[rawIndex] === undefined) {
    state.rawToNorm[rawIndex] = state.normToRaw.length - 1;
  }
}

function buildRenderedText(root: Element): RenderedText {
  const rawText = root.textContent ?? '';
  const state = {
    output: '',
    rawToNorm: Array(rawText.length + 1).fill(undefined) as number[],
    normToRaw: [] as number[],
  };

  let rawPos = 0;

  const appendSpace = () => {
    appendNormalizedChar(SPACE, rawPos, state);
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      for (let i = 0; i < text.length; i++) {
        appendNormalizedChar(text[i], rawPos, state);
        rawPos += 1;
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;

      if (el.tagName === 'BR') {
        appendSpace();
        return;
      }

      const block = isBlock(el);
      if (block) appendSpace();

      for (const child of Array.from(node.childNodes)) {
        walk(child);
      }

      if (block) appendSpace();
    }
  };

  walk(root);

  // Map end-of-string raw offset.
  if (state.rawToNorm[rawPos] === undefined) {
    state.rawToNorm[rawPos] = state.normToRaw.length;
  }
  state.normToRaw.push(rawPos);

  const text = state.output; // Already normalized/collapsed
  return { text, rawToNorm: state.rawToNorm, normToRaw: state.normToRaw };
}

function translateRawToNorm(rawToNorm: number[], rawOffset: number): number {
  if (rawOffset < 0) return 0;
  const clamped = Math.min(rawOffset, rawToNorm.length - 1);
  for (let i = clamped; i >= 0; i--) {
    const val = rawToNorm[i];
    if (val !== undefined) return val;
  }
  return 0;
}

function translateNormToRaw(normToRaw: number[], normOffset: number): number {
  if (normOffset <= 0) return 0;
  const clamped = Math.min(normOffset, normToRaw.length - 1);
  return normToRaw[clamped];
}

export function renderedTextFromRange(range: Range): string {
  const container = range.cloneContents();
  const div = document.createElement('div');
  div.appendChild(container);
  const { text } = buildRenderedText(div);
  return text;
}

export function renderedTextWithOffsets(root: Element): {
  text: string;
  rawToNorm: number[];
  normToRaw: number[];
  toNorm: (rawOffset: number) => number;
  toRaw: (normOffset: number) => number;
} {
  const rendered = buildRenderedText(root);
  return {
    ...rendered,
    toNorm: rawOffset => translateRawToNorm(rendered.rawToNorm, rawOffset),
    toRaw: normOffset => translateNormToRaw(rendered.normToRaw, normOffset),
  };
}
