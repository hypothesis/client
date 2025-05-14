import { rectIntersects, rectsOverlapVertically } from '../util/geometry';

/**
 * Return the DOM text that intersects a given rect.
 *
 * The text nodes under {@link root} are split into words and the bounding
 * rectangle of each word is intersected with {@link rect}. If the intersection
 * is non-empty, the text of that word is added to the output string.
 *
 * @param root - Root element of the DOM tree to search
 * @param rect - Client coordinates of the region
 */
export function textInDOMRect(root: Element, rect: DOMRect): string {
  const iter = root.ownerDocument!.createNodeIterator(
    root,
    NodeFilter.SHOW_TEXT,
  );

  // Pieces of text that intersect the rect.
  const textChunks = [];

  // Rect for previous text chunk which was included in the output.
  let prevChunkRect;

  let currentNode;
  while ((currentNode = iter.nextNode())) {
    const textNode = currentNode as Text;

    // We split on word boundaries here rather than spaces, so inter-word spaces
    // are included in the "words".
    const words = textNode.data.split(/\b/);
    let offset = 0;

    for (const word of words) {
      const range = new Range();
      range.setStart(textNode, offset);
      const endOffset = offset + word.length;
      range.setEnd(textNode, endOffset);
      const wordRect = range.getBoundingClientRect();

      if (rectIntersects(wordRect, rect)) {
        // We assume that spaces are included in the text between words on a
        // line, but not between lines.
        const newLine =
          prevChunkRect && !rectsOverlapVertically(prevChunkRect, wordRect);
        if (newLine) {
          textChunks.push(' ');
        }

        textChunks.push(word);
        prevChunkRect = wordRect;
      }

      offset = endOffset;
    }
  }

  return textChunks.join('');
}
