import { textNodes } from '../../../test-util/compare-dom';
import { TextRange } from '../text-range';
import { trimRange } from '../trim-range';

describe('annotator/anchoring/trim-range', () => {
  let container;

  const htmlContent = `
  <div id="A">
    <div id="B">&#8233;z<p id="C"><span id="D">&nbsp; charm&nbsp;</span> a </p> </div>
    <div id="E">
      <p id="F"> <span id="G">&nbsp;<span id="H"><!-- comment -->f </span></span></p>
    </div>
    <div id="I"></div>
  </div>
  <div id="J"> <span id="K"> t </span><div id="L"></div><div id="M">&nbsp;<div> </div>
        `;

  afterEach(() => {
    container?.remove();
  });

  const addContent = innerHTML => {
    container = document.createElement('div');
    container.innerHTML = innerHTML;
    document.body.appendChild(container);
    return container;
  };

  const addTextContent = text => {
    const wrappingNode = document.createElement('p');
    wrappingNode.innerHTML = text;
    document.body.appendChild(wrappingNode);
    return wrappingNode;
  };

  /**
   * Return a Range that selects text content in `container` from `startOffset`
   * to `endOffset`. Will select entire textContent of `container` if no offsets
   * are provided.
   *
   * @param {Element} container
   * @param {number} [startOffset] - or 0 if not present
   * @param {number} [endOffset] - or length of text content if not present
   */
  const rangeFromOffsets = (container, startOffset, endOffset) => {
    return TextRange.fromOffsets(
      container,
      startOffset ?? 0,
      endOffset ?? container.textContent.length
    ).toRange();
  };

  /**
   * Return a Range that starts before `startElement` and ends after
   * `endElement`. The returned Range will start and end on a Text node.
   */
  const textRangeBetween = (startElement, endElement) => {
    const range = new Range();
    range.setStartBefore(startElement);
    range.setEndAfter(endElement);
    return TextRange.fromRange(range).toRange();
  };

  describe('Trimming by adjusting offsets within existing start and end containers', () => {
    [
      ['Non-whitespace', 0, 0],
      ['&nbsp;One whitespace', 0, 1],
      ['&nbsp;&#8194;Multiple whitespace', 0, 2],
      ['Internal whitespace', 8, 9],
      ['Internal&#5760; whitespace', 8, 10],
    ].forEach(([testContent, initialStartOffset, expectedTrimmedOffset]) => {
      it('trims start offset forward until following character is non-whitespace', () => {
        container = addTextContent(testContent);
        const textRange = rangeFromOffsets(container, initialStartOffset);

        const trimmedRange = trimRange(textRange);

        assert.equal(textRange.startContainer, trimmedRange.startContainer);
        assert.equal(trimmedRange.startOffset, expectedTrimmedOffset);
      });
    });

    [
      ['End', 3, 3],
      ['End ', 4, 3],
      ['End &nbsp;&#8197; ', 6, 3],
      ['Mid space', 4, 3],
      ['Mid &nbsp;&#8197;spaces', 6, 3],
    ].forEach(([testContent, initialEndOffset, trimmedEndOffset]) => {
      it('trims end offset back until preceding character is non-whitespace', () => {
        container = addTextContent(testContent);
        const textRange = rangeFromOffsets(container, 0, initialEndOffset);

        const trimmedRange = trimRange(textRange);

        assert.equal(textRange.endContainer, trimmedRange.endContainer);
        assert.equal(trimmedRange.endOffset, trimmedEndOffset);
      });
    });
  });

  describe('Trimming by changing start or end containers and their offsets', () => {
    [
      {
        range: { from: '#A' },
        expected: { start: '#B', offset: 1, char: 'z' },
      },
      {
        range: { from: '#B' },
        expected: { start: '#B', offset: 1, char: 'z' },
      },
      {
        range: { from: '#C' },
        expected: { start: '#D', offset: 2, char: 'c' },
      },
      {
        range: { from: '#D' },
        expected: { start: '#D', offset: 2, char: 'c' },
      },
      {
        range: { from: '#E' },
        expected: { start: '#H', offset: 0, char: 'f' },
      },
      {
        range: { from: '#F' },
        expected: { start: '#H', offset: 0, char: 'f' },
      },
      {
        range: { from: '#G' },
        expected: { start: '#H', offset: 0, char: 'f' },
      },
      {
        range: { from: '#I', to: '#J' },
        expected: { start: '#K', offset: 1, char: 't' },
      },
      {
        range: { from: '#I', to: '#L' },
        expected: { start: '#K', offset: 1, char: 't' },
      },
    ].forEach(({ range, expected }) => {
      it('moves start position forward to first non-whitespace character in range', () => {
        container = addContent(htmlContent);

        const textRange = textRangeBetween(
          document.querySelector(range.from),
          document.querySelector(range.to ?? range.from)
        );

        const trimmedRange = trimRange(textRange);

        assert.equal(
          trimmedRange.startContainer,
          textNodes(document.querySelector(expected.start))[0],
          `Trimmed startContainer is first text node inside of ${expected.start}`
        );

        assert.equal(trimmedRange.startOffset, expected.offset);
        assert.equal(
          trimmedRange.startContainer.textContent.charAt(
            trimmedRange.startOffset
          ),
          expected.char,
          `First character at trimmed start position is ${expected.char}`
        );
      });
    });

    [
      {
        range: { from: '#A' },
        expected: { end: '#H', offset: 1, char: 'f' },
      },
      {
        range: { from: '#B' },
        expected: { end: '#C', offset: 2, char: 'a' },
      },
      {
        range: { from: '#C' },
        expected: { end: '#C', offset: 2, char: 'a' },
      },
      {
        range: { from: '#D' },
        expected: { end: '#D', offset: 7, char: 'm' },
      },
      {
        range: { from: '#E' },
        expected: { end: '#H', offset: 1, char: 'f' },
      },
      {
        range: { from: '#F' },
        expected: { end: '#H', offset: 1, char: 'f' },
      },
      {
        range: { from: '#G' },
        expected: { end: '#H', offset: 1, char: 'f' },
      },
      {
        range: { from: '#H' },
        expected: { end: '#H', offset: 1, char: 'f' },
      },
      {
        range: { from: '#A', to: '#J' },
        expected: { end: '#K', offset: 2, char: 't' },
      },
    ].forEach(({ range, expected }) => {
      it('moves end position backward to nearest non-whitespace character', () => {
        container = addContent(htmlContent);

        const textRange = textRangeBetween(
          document.querySelector(range.from),
          document.querySelector(range.to ?? range.from)
        );

        const trimmedRange = trimRange(textRange);

        const endTextNodes = textNodes(document.querySelector(expected.end));

        assert.equal(
          trimmedRange.endContainer,
          endTextNodes[endTextNodes.length - 1],
          `Trimmed endContainer is last text node inside of ${expected.end}`
        );

        assert.equal(trimmedRange.endOffset, expected.offset);
        assert.equal(
          trimmedRange.endContainer.textContent.charAt(
            trimmedRange.endOffset - 1
          ),
          expected.char,
          `Character before trimmed end position is ${expected.char}`
        );
      });
    });
  });

  it('throws if the range contains no non-whitespace text content', () => {
    container = addContent('<p id="empty">&nbsp;&nbsp;<p>');

    const textRange = textRangeBetween(
      document.querySelector('#empty'),
      document.querySelector('#empty')
    );

    assert.throws(
      () => trimRange(textRange),
      RangeError,
      'Range contains no non-whitespace text'
    );
  });

  it('throws if the range does not start or end on a text node', () => {
    container = addContent('<p id="notText">Some text<p>');
    const pElement = document.querySelector('p#notText');

    const range = new Range();
    range.setStartBefore(pElement);
    range.setEndAfter(pElement);
    assert.throws(
      () => trimRange(range),
      RangeError,
      'Range startContainer is not a text node'
    );

    const pTextNode = textNodes(pElement)[0];
    range.setStart(pTextNode, 0);
    assert.throws(
      () => trimRange(range),
      RangeError,
      'Range endContainer is not a text node'
    );
  });
});
