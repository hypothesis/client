import debounce from 'lodash.debounce';

import { ListenerCollection } from '../../shared/listener-collection';

/**
 * @typedef Rect
 * @prop {number} left
 * @prop {number} right
 * @prop {number} top
 * @prop {number} bottom
 */

/**
 * @param {Rect|null} a
 * @param {Rect} b
 */
function mergeBoxes(a, b) {
  if (!a) {
    return b;
  }
  return {
    left: Math.min(a.left, b.left),
    right: Math.max(a.right, b.right),
    top: Math.min(a.top, b.top),
    bottom: Math.max(a.bottom, b.bottom),
  };
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
   * @param {Rect[]} charBoxes - Bounding boxes for characters in the image.
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

    // Position text layer over image. For now we assume that the image's top-left
    // corner aligns with the top-left corner of its container.
    containerParent.style.position = 'relative';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';

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

    // Split the text into words and create an element for each in the text layer.

    /** @type {Rect|null} */
    let currentWordBox = null;
    let currentWordText = '';

    /**
     * @typedef TextBox
     * @prop {HTMLElement} span
     * @prop {Rect} box
     * @prop {number} width - Natural width of the text
     * @prop {number} height - Natural height of the text
     */

    /** @type {TextBox[]} */
    const boxes = [];

    // Actual height of text boxes before scaling using CSS transforms.
    let boxHeight = 0;

    const addCurrentWordToTextLayer = () => {
      if (!currentWordBox) {
        return;
      }

      const span = document.createElement('span');
      span.style.position = 'absolute';
      span.style.color = 'transparent';
      span.style.transformOrigin = 'top left';

      span.textContent = currentWordText;

      container.append(span);
      container.append(' ');

      // Measure the initial height of text boxes. We only do this once as it
      // should be the same for all boxes, since they use the same font.
      if (!boxHeight) {
        boxHeight = span.getBoundingClientRect().height;
      }

      boxes.push({
        span,
        box: currentWordBox,
        width: context.measureText(currentWordText).width,
        height: boxHeight,
      });

      currentWordBox = null;
      currentWordText = '';
    };

    for (let i = 0; i < charBoxes.length; i++) {
      const char = text[i];
      if (/\s/.test(char)) {
        addCurrentWordToTextLayer();
        continue;
      }

      const charBox = charBoxes[i];
      currentWordBox = mergeBoxes(currentWordBox, charBox);
      currentWordText += char;
    }
    addCurrentWordToTextLayer();

    // Position and scale text boxes to fit current image size.
    const updateBoxSizes = () => {
      const { width: imageWidth, height: imageHeight } =
        image.getBoundingClientRect();
      container.style.width = imageWidth + 'px';
      container.style.height = imageHeight + 'px';

      for (let { span, box, width, height } of boxes) {
        const left = box.left * imageWidth;
        const top = box.top * imageHeight;
        const right = box.right * imageWidth;
        const bottom = box.bottom * imageHeight;

        span.style.left = left + 'px';
        span.style.top = top + 'px';

        const scaleX = (right - left) / width;
        const scaleY = (bottom - top) / height;

        span.style.transform = `scale(${scaleX}, ${scaleY})`;
      }
    };

    updateBoxSizes();

    /**
     * Container element for the text layer.
     *
     * This is exposed so that callers can tweak the style if needed (eg.
     * to set a z-index value).
     */
    this.container = container;

    this._updateBoxSizes = debounce(updateBoxSizes, { maxWait: 50 });
    this._listeners = new ListenerCollection();

    if (typeof ResizeObserver !== 'undefined') {
      this._imageSizeObserver = new ResizeObserver(() => {
        this._updateBoxSizes();
      });
      this._imageSizeObserver.observe(image);
    }

    // Fallback for browsers that don't support ResizeObserver (Safari < 13.4).
    // Due to the debouncing, we can register this listener in all browsers for
    // simplicity, without downsides.
    this._listeners.add(window, 'resize', this._updateBoxSizes);
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
    this._updateBoxSizes();
    this._updateBoxSizes.flush();
  }

  destroy() {
    this.container.remove();
    this._listeners.removeAll();
    this._updateBoxSizes.cancel();
    this._imageSizeObserver?.disconnect();
  }
}
