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
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, SPACE);
}

function isBlock(node: Node): boolean {
  return node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(node.nodeName);
}

/**
 * Produce rendered-like text for a DOM Range by inserting spaces where the
 * browser would visually break lines.
 */
export function renderedTextFromRange(range: Range): string {
  const fragment = range.cloneContents();
  let output = '';

  const appendSpace = () => {
    if (output.length === 0 || output.endsWith(SPACE)) {
      return;
    }
    output += SPACE;
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      output += node.textContent || '';
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

  for (const child of Array.from(fragment.childNodes)) {
    walk(child);
  }

  return collapseWhitespace(output).trim();
}
