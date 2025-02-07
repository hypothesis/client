import { getCaretCoordinates } from '../textarea-caret-position';

describe('getCaretCoordinates', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
  });

  function getCharWidth(fontName, size) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${size} ${fontName}`;
    return ctx.measureText('x').width;
  }

  [
    // Text area content and expected caret position. The caret position
    // is expressed a multiple of the char width (X) and line height (Y).
    //
    // The reported caret position is at the bottom of the line, hence a caret
    // at the start of the textarea has position `[0, 1]`.

    // Caret at start of textarea
    {
      content: '@',
      expectedCoords: [0, 1],
    },

    // Caret at end of first line
    {
      content: 'ab@',
      expectedCoords: [2, 1],
    },

    // Caret in middle of first line
    {
      content: 'a@b',
      expectedCoords: [1, 1],
    },

    // Caret at start of subsequent line
    {
      content: '\n\n@',
      expectedCoords: [0, 3],
    },

    // Caret at start of line below scrollable area
    {
      content: 'one\ntwo\nthree\n@',
      expectedCoords: [0, 4],
    },

    // Textarea scrolled one line down, so caret Y position is reduced
    // accordingly.
    {
      content: 'one\ntwo\nthree\n@',
      scrollTop: 1,
      expectedCoords: [0, 3],
    },

    // Text area offset from top
    {
      content: '@',
      expectedCoords: [0, 1],
      style: { top: '150px' },
    },

    // Text area offset from left
    {
      content: '@',
      expectedCoords: [0, 1],
      style: { left: '150px' },
    },
  ].forEach(({ content, expectedCoords, style = {}, scrollTop = 0 }) => {
    it('returns expected caret position', () => {
      const fontFamily = 'monospace';
      const fontSize = '15px';
      const lineHeight = 20;

      const textarea = document.createElement('textarea');
      textarea.style.border = 'none';
      textarea.style.fontSize = fontSize;
      textarea.style.fontFamily = fontFamily;
      textarea.style.lineHeight = `${lineHeight}px`;
      textarea.style.height = `${lineHeight * 3}px`;
      Object.assign(textarea.style, style);

      container.append(textarea);

      textarea.value = content.replace('@', '');
      textarea.selectionStart = content.indexOf('@');
      textarea.scrollTop = scrollTop * lineHeight;

      const caretPos = getCaretCoordinates(textarea);
      let [expectedX, expectedY] = expectedCoords;
      expectedX *= getCharWidth(fontFamily, fontSize);
      expectedX = Math.round(expectedX);
      expectedY *= lineHeight;

      assert.deepEqual(
        [Math.round(caretPos.x), caretPos.y],
        [expectedX, expectedY],
      );
    });
  });
});
