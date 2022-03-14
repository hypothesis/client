import debounce from 'lodash.debounce';

import { ListenerCollection } from '../../shared/listener-collection';
import {
  rectCenter,
  rectsOverlapHorizontally,
  rectsOverlapVertically,
  unionRects,
} from '../util/geometry';

/**
 * @typedef WordBox
 * @prop {DOMRect[]} glyphs
 * @prop {string} text
 * @prop {DOMRect} rect - Bounding rectangle of all glyphs in word
 */

/**
 * @typedef LineBox
 * @prop {WordBox[]} words
 * @prop {DOMRect} rect - Bounding rectangle of all words in line
 */

/**
 * @typedef ColumnBox
 * @prop {LineBox[]} lines
 * @prop {DOMRect} rect - Bounding rectangle of all lines in column
 */

/**
 * Group characters in a page into words, lines and columns.
 *
 * The input is assumed to be _roughly_ reading order, more so at the low (word,
 * line) level. When the input is not in reading order, the output may be
 * divided into more lines / columns than expected. Downstream code is expected
 * to tolerate over-segmentation. This function should try to avoid producing
 * lines or columns that significantly intersect, as this can impair text
 * selection.
 *
 * @param {DOMRect[]} chars
 * @param {string} text
 * @return {ColumnBox[]}
 */
function analyzeLayout(chars, text) {
  /** @type {WordBox[]} */
  const words = [];

  /** @type {WordBox} */
  let currentWord = { glyphs: [], text: '', rect: new DOMRect() };

  // Group characters into words.
  const addWord = () => {
    if (currentWord.glyphs.length > 0) {
      words.push(currentWord);
      currentWord = { glyphs: [], text: '', rect: new DOMRect() };
    }
  };
  for (let [i, rect] of chars.entries()) {
    const char = text[i];
    const isSpace = /\s/.test(char);

    currentWord.glyphs.push(rect);
    currentWord.rect = unionRects(currentWord.rect, rect);

    // To simplify downstream logic, normalize whitespace.
    currentWord.text += isSpace ? ' ' : char;

    if (isSpace) {
      addWord();
    }
  }
  addWord();

  /** @type {LineBox[]} */
  const lines = [];

  /** @type {LineBox} */
  let currentLine = { words: [], rect: new DOMRect() };

  // Group words into lines.
  const addLine = () => {
    if (currentLine.words.length > 0) {
      lines.push(currentLine);
      currentLine = { words: [], rect: new DOMRect() };
    }
  };
  for (let word of words) {
    const prevWord = currentLine.words[currentLine.words.length - 1];
    if (prevWord) {
      const prevCenter = rectCenter(prevWord.rect);
      const currentCenter = rectCenter(word.rect);
      const xDist = currentCenter.x - prevCenter.x;
      if (
        !rectsOverlapVertically(prevWord.rect, word.rect) ||
        // Break line if current word is left of previous word
        xDist < 0
      ) {
        addLine();
      }
    }
    currentLine.words.push(word);
    currentLine.rect = unionRects(currentLine.rect, word.rect);
  }
  addLine();

  /** @type {ColumnBox[]} */
  const columns = [];

  /** @type {ColumnBox} */
  let currentColumn = { lines: [], rect: new DOMRect() };

  // Group lines into columns.
  const addColumn = () => {
    if (currentColumn.lines.length > 0) {
      columns.push(currentColumn);
      currentColumn = { lines: [], rect: new DOMRect() };
    }
  };
  for (let line of lines) {
    const prevLine = currentColumn.lines[currentColumn.lines.length - 1];

    if (prevLine) {
      const prevCenter = rectCenter(prevLine.rect);
      const currentCenter = rectCenter(line.rect);
      const yDist = currentCenter.y - prevCenter.y;

      if (
        !rectsOverlapHorizontally(prevLine.rect, line.rect) ||
        rectsOverlapVertically(prevLine.rect, line.rect) ||
        // Break column if current line is above previous line.
        //
        // In the case of a two column layout for example, this happens when
        // moving from the bottom of one column to the top of the next.
        yDist < 0 ||
        // Break column if there is a large gap between the previous and current lines.
        //
        // This helps to avoid generating intersecting columns if there happens
        // to be other content between the lines that comes later in the input.
        yDist > line.rect.height * 4
      ) {
        addColumn();
      }
    }
    currentColumn.lines.push(line);
    currentColumn.rect = unionRects(currentColumn.rect, line.rect);
  }
  addColumn();

  return columns;
}

/**
 * ImageTextLayer maintains a transparent text layer on top of an image
 * which contains text. This enables the text in the image to be selected
 * and highlighted.
 *
 * This is similar to the one that PDF.js creates for us in our standard PDF
 * viewer.
 */
export class ImageTextLayer {
  /**
   * Create a text layer which is displayed on top of `image`.
   *
   * @param {Element} image - Rendered image on which to overlay the text layer.
   *   The text layer will be inserted into the DOM as the next sibling of `image`.
   * @param {DOMRect[]} charBoxes - Bounding boxes for characters in the image.
   *   Coordinates should be in the range [0-1], where 0 is the top/left corner
   *   of the image and 1 is the bottom/right.
   * @param {string} text - Characters in the image corresponding to `charBoxes`
   */
  constructor(image, charBoxes, text) {
    if (charBoxes.length !== text.length) {
      throw new Error('Char boxes length does not match text length');
    }

    // Create container for text layer and position it above the image.
    const containerParent = /** @type {HTMLElement} */ (image.parentNode);
    const container = document.createElement('hypothesis-text-layer');
    containerParent.insertBefore(container, image.nextSibling);

    // Position text layer over image. We assume the image's top-left corner
    // aligns with the top-left corner of its container.
    containerParent.style.position = 'relative';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.color = 'transparent';

    // Prevent inherited text alignment from affecting positioning.
    // VitalSource sets `text-align: center` for example.
    container.style.textAlign = 'left';

    // Use multiply blending to make text in the image more readable when
    // the corresponding text in the text layer is selected or highlighted.
    // We apply a similar effect in PDF.js.
    container.style.mixBlendMode = 'multiply';

    // Set a fixed font style on the container and create a canvas using the same
    // font which we can use to measure the "natural" size of the text. This is
    // later used when scaling the text to fit the underlying part of the image.
    const fontSize = 16;
    const fontFamily = 'sans-serif';
    container.style.fontSize = fontSize + 'px';
    container.style.fontFamily = fontFamily;
    const canvas = document.createElement('canvas');
    const context = /** @type {CanvasRenderingContext2D} */ (
      canvas.getContext('2d')
    );
    context.font = `${fontSize}px ${fontFamily}`;

    /**
     * Generate a CSS value that scales with the `--x-scale` or `--y-scale` CSS variables.
     *
     * @param {'x'|'y'} dimension
     * @param {number} value
     * @param {string} unit
     */
    const scaledValue = (dimension, value, unit = 'px') =>
      `calc(var(--${dimension}-scale) * ${value}${unit})`;

    // Group characters into words, lines and columns. Then use the result to
    // create a hierarchical DOM structure in the text layer:
    //
    // 1. Columns are positioned absolutely
    // 2. Columns stack lines vertically using a block layout
    // 3. Lines arrange words horizontally using an inline layout
    //
    // This allows the browser to select the expected text when the cursor is
    // in-between lines or words.
    const columns = analyzeLayout(charBoxes, text);

    for (let column of columns) {
      const columnEl = document.createElement('hypothesis-text-column');
      columnEl.style.display = 'block';
      columnEl.style.position = 'absolute';
      columnEl.style.left = scaledValue('x', column.rect.left);
      columnEl.style.top = scaledValue('y', column.rect.top);

      let prevLine = null;
      for (let line of column.lines) {
        const lineEl = document.createElement('hypothesis-text-line');
        lineEl.style.display = 'block';
        lineEl.style.marginLeft = scaledValue(
          'x',
          line.rect.left - column.rect.left
        );
        lineEl.style.height = scaledValue('y', line.rect.height);

        if (prevLine) {
          lineEl.style.marginTop = scaledValue(
            'y',
            line.rect.top - prevLine.rect.bottom
          );
        }
        prevLine = line;

        // Prevent line breaks if the word elements don't quite fit the line.
        lineEl.style.whiteSpace = 'nowrap';

        let prevWord = null;
        for (let word of line.words) {
          const wordEl = document.createElement('hypothesis-text-word');
          wordEl.style.display = 'inline-block';
          wordEl.style.transformOrigin = 'top left';
          wordEl.textContent = word.text;

          if (prevWord) {
            wordEl.style.marginLeft = scaledValue(
              'x',
              word.rect.left - prevWord.rect.right
            );
          }
          prevWord = word;

          // Set the size of this box used for layout. This does not affect the
          // rendered size of the content.
          wordEl.style.width = scaledValue('x', word.rect.width);
          wordEl.style.height = scaledValue('y', word.rect.height);

          // Don't collapse whitespace at end of words, so it remains visible
          // in selected text. Also prevent line breaks due to overflows.
          wordEl.style.whiteSpace = 'pre';

          // Scale content using a transform. This affects the rendered size
          // of the text, used by text selection and
          // `Element.getBoundingClientRect`, but not layout.
          const metrics = context.measureText(word.text);
          const xScale = scaledValue('x', word.rect.width / metrics.width, '');
          const yScale = scaledValue('y', word.rect.height / fontSize, '');
          wordEl.style.transform = `scale(${xScale}, ${yScale})`;

          lineEl.append(wordEl);
        }

        columnEl.append(lineEl);
      }

      container.append(columnEl);
    }

    const updateTextLayerSize = () => {
      const { width: imageWidth, height: imageHeight } =
        image.getBoundingClientRect();
      container.style.width = imageWidth + 'px';
      container.style.height = imageHeight + 'px';

      container.style.setProperty('--x-scale', `${imageWidth}`);
      container.style.setProperty('--y-scale', `${imageHeight}`);
    };

    updateTextLayerSize();

    /**
     * Container element for the text layer.
     *
     * This is exposed so that callers can tweak the style if needed (eg.
     * to set a z-index value).
     */
    this.container = container;

    this._updateTextLayerSize = debounce(updateTextLayerSize, { maxWait: 50 });
    this._listeners = new ListenerCollection();

    if (typeof ResizeObserver !== 'undefined') {
      this._imageSizeObserver = new ResizeObserver(() => {
        this._updateTextLayerSize();
      });
      this._imageSizeObserver.observe(image);
    }

    // Fallback for browsers that don't support ResizeObserver (Safari < 13.4).
    // Due to the debouncing, we can register this listener in all browsers for
    // simplicity, without downsides.
    this._listeners.add(window, 'resize', this._updateTextLayerSize);
  }

  /**
   * Synchronously update the text layer to match the size and position of
   * the image.
   *
   * Normally the text layer is resized automatically but asynchronously when
   * the image size changes (eg. due to the window being resized) and updates
   * are debounced. This method can be used to force an immediate update if
   * needed.
   */
  updateSync() {
    this._updateTextLayerSize();
    this._updateTextLayerSize.flush();
  }

  destroy() {
    this.container.remove();
    this._listeners.removeAll();
    this._updateTextLayerSize.cancel();
    this._imageSizeObserver?.disconnect();
  }
}
