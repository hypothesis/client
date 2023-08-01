import { delay } from '../../../test-util/wait';
import { ImageTextLayer } from '../image-text-layer';

// Sizes and spacing between character bounding boxes in these tests, expressed
// as fractions of the image size.
const charWidth = 0.04;
const charHeight = 0.08;
const charSpacing = 0.05;
const lineSpacing = 0.1;

/**
 * Create character bounding box data for text in an image.
 *
 * Lines are broken after new-line chars and also before any indicies in
 * `breakPositions`.
 */
function createCharBoxes(text, breakPositions = []) {
  const charBoxes = [];
  let lineIndex = 0;
  let charIndex = 0;

  for (let i = 0; i < text.length; i++) {
    if (breakPositions.includes(i)) {
      charIndex = 0;
      ++lineIndex;
    }

    const char = text[i];
    charBoxes.push({
      left: charIndex * charSpacing,
      right: charIndex * charSpacing + charWidth,
      top: lineIndex * lineSpacing,
      bottom: lineIndex * lineSpacing + charHeight,
    });

    if (char === '\n') {
      charIndex = 0;
      ++lineIndex;
    } else {
      ++charIndex;
    }
  }
  return charBoxes;
}

/**
 * Return the bounding rectangle of an element, discounting changes to the
 * width and height resulting from CSS transforms.
 *
 * This is useful when checking the position/size of elements generated by
 * CSS layout, ignoring scaling transformations which affect the visual result,
 * but not layout.
 */
function untransformedBoundingRect(element) {
  // We assume `transform` is a string that DOMMatrix can parse, either
  // "matrix(a b c ...)" or "none".
  const transform = getComputedStyle(element).transform;
  const mat = new DOMMatrix(transform);
  const scaleX = mat.a;
  const scaleY = mat.d;
  const rect = element.getBoundingClientRect();
  return new DOMRect(rect.x, rect.y, rect.width / scaleX, rect.height / scaleY);
}

/**
 * Return a `[left, top, width, height]` tuple of the expected position of
 * a word in the text layer.
 */
function expectedBoxOffsetAndSize(
  imageWidth,
  imageHeight,
  lineIndex,
  charIndex,
  text,
) {
  const width =
    (text.length - 1) * charSpacing * imageWidth + charWidth * imageWidth;
  const height = charHeight * imageHeight;

  return [
    charSpacing * charIndex * imageWidth,
    lineSpacing * lineIndex * imageHeight,
    width,
    height,
  ].map(coord => Math.round(coord));
}

function waitForResize(element) {
  return new Promise(resolve => {
    const observer = new ResizeObserver(() => {
      observer.disconnect();
      resolve();
    });
    observer.observe(element);
  });
}

describe('ImageTextLayer', () => {
  let containers;
  let textLayers;

  function createPageImage() {
    const container = document.createElement('div');
    const image = document.createElement('img');

    // Image size chosen so 1% == 5px, to make the math easy.
    image.style.width = '500px';
    image.style.height = '500px';

    container.append(image);

    document.body.append(container);
    containers.push(container);

    return { container, image };
  }

  function createTextLayer(image, charBoxes, text) {
    const textLayer = new ImageTextLayer(image, charBoxes, text);
    textLayers.push(textLayer);
    return textLayer;
  }

  function getWordBoxes(textLayer) {
    return [...textLayer.container.querySelectorAll('hypothesis-text-word')];
  }

  beforeEach(() => {
    containers = [];
    textLayers = [];
  });

  afterEach(() => {
    containers.forEach(c => c.remove());
    textLayers.forEach(tl => tl.destroy());
  });

  it('creates a <hypothesis-text-layer> element above the image', () => {
    const { container, image } = createPageImage();

    // nb. Text starts with a space to exercise an extra code path in the text
    // layer builder.
    const imageText = ' some text in the image';

    createTextLayer(image, createCharBoxes(imageText), imageText);

    const textLayerEl = container.querySelector('hypothesis-text-layer');
    assert.instanceOf(textLayerEl, HTMLElement);
    assert.equal(image.nextSibling, textLayerEl);
    assert.equal(container.style.position, 'relative');
    assert.equal(textLayerEl.style.position, 'absolute');
    assert.equal(textLayerEl.style.mixBlendMode, 'multiply');

    const imageBox = image.getBoundingClientRect();
    const textLayerBox = textLayerEl.getBoundingClientRect();
    assert.equal(imageBox.left, textLayerBox.left);
    assert.equal(imageBox.top, textLayerBox.top);
    assert.equal(imageBox.width, textLayerBox.width);
    assert.equal(imageBox.height, textLayerBox.height);
  });

  it('throws if char box array and text have different lengths', () => {
    const { image } = createPageImage();
    const imageText = 'some text in the image';

    assert.throws(() => {
      const charBoxes = createCharBoxes(imageText).slice(0, -1);
      createTextLayer(image, charBoxes, imageText);
    }, 'Char boxes length does not match text length');
  });

  it('creates elements in the text layer for each word in the image', () => {
    const { image } = createPageImage();
    const imageText = 'first line\nsecond line';
    const textLayer = createTextLayer(
      image,
      createCharBoxes(imageText),
      imageText,
    );

    assert.equal(textLayer.container.textContent, 'first line second line');
    const wordBoxes = getWordBoxes(textLayer);
    assert.equal(wordBoxes.length, imageText.split(/\s+/).length);
    assert.deepEqual(
      wordBoxes.map(ws => ws.textContent),
      ['first ', 'line ', 'second ', 'line'],
    );

    const imageBox = image.getBoundingClientRect();
    const wordBoxPositions = wordBoxes.map(wordEl => {
      const rect = untransformedBoundingRect(wordEl);
      return [
        rect.left - imageBox.left,
        rect.top - imageBox.top,
        rect.width,
        rect.height,
      ].map(coord => Math.round(coord));
    });

    const imageWidth = parseInt(image.style.width);
    const imageHeight = parseInt(image.style.height);

    const expectedPositions = [
      expectedBoxOffsetAndSize(imageWidth, imageHeight, 0, 0, 'first '),
      expectedBoxOffsetAndSize(imageWidth, imageHeight, 0, 6, 'line '),
      expectedBoxOffsetAndSize(imageWidth, imageHeight, 1, 0, 'second '),
      expectedBoxOffsetAndSize(imageWidth, imageHeight, 1, 7, 'line'),
    ];
    assert.deepEqual(wordBoxPositions, expectedPositions);
  });

  it('breaks words when characters do not overlap vertically', () => {
    const { image } = createPageImage();
    const imageText = 'first linesecond line';
    const textLayer = createTextLayer(
      image,
      createCharBoxes(imageText, [imageText.indexOf('second')]),
      imageText,
    );

    assert.equal(textLayer.container.textContent, 'first linesecond line');
    const wordBoxes = getWordBoxes(textLayer);
    assert.deepEqual(
      wordBoxes.map(ws => ws.textContent),
      ['first ', 'line', 'second ', 'line'],
    );
  });

  it('creates lines and columns in the text layer', () => {
    const { image } = createPageImage();
    const textLayer = createTextLayer(
      image,
      [
        // Create two sets of char boxes which overlap. This will cause each
        // set to be assigned to a separate column.
        ...createCharBoxes('first line\nsecond line\n'),
        ...createCharBoxes('third line\nfourth line'),
      ],
      'first line\nsecond line\nthird line\nfourth line',
    );

    const columns = textLayer.container.querySelectorAll(
      'hypothesis-text-column',
    );
    assert.equal(columns.length, 2);
    assert.equal(columns[0].textContent, 'first line second line ');
    assert.equal(columns[1].textContent, 'third line fourth line');

    const col1Lines = columns[0].querySelectorAll('hypothesis-text-line');
    assert.equal(col1Lines.length, 2);
    assert.equal(col1Lines[0].textContent, 'first line ');
    assert.equal(col1Lines[1].textContent, 'second line ');

    const col2Lines = columns[1].querySelectorAll('hypothesis-text-line');
    assert.equal(col2Lines.length, 2);
    assert.equal(col2Lines[0].textContent, 'third line ');
    assert.equal(col2Lines[1].textContent, 'fourth line');
  });

  it('updates size and position of text layer when page image is resized', async () => {
    const { container, image } = createPageImage();
    const imageText = 'some text in the image';

    const clock = sinon.useFakeTimers();
    try {
      const textLayer = createTextLayer(
        image,
        createCharBoxes(imageText),
        imageText,
      );
      const textLayerEl = container.querySelector('hypothesis-text-layer');

      const originalBoxes = getWordBoxes(textLayer).map(box =>
        untransformedBoundingRect(box),
      );

      // Rescale image to 3/5 of original size.
      image.style.width = '300px';
      image.style.height = '300px';

      await waitForResize(textLayerEl);
      clock.tick(100);

      // Check that text layer was resized to fit new image size.
      const imageBox = image.getBoundingClientRect();
      const textLayerBox = textLayerEl.getBoundingClientRect();
      assert.equal(imageBox.left, textLayerBox.left);
      assert.equal(imageBox.top, textLayerBox.top);
      assert.equal(imageBox.width, textLayerBox.width);
      assert.equal(imageBox.height, textLayerBox.height);

      // Check that the positions and sizes of each text box were changed to
      // reflect the new scale of the image.
      const ratio = 3 / 5;
      const newBoxes = getWordBoxes(textLayer).map(box =>
        untransformedBoundingRect(box),
      );

      const tolerance = 0.01;
      assert.equal(originalBoxes.length, newBoxes.length);
      for (let [i, originalBox] of originalBoxes.entries()) {
        const newBox = newBoxes[i];

        const leftGap = originalBox.left - imageBox.left;
        const newLeftGap = newBox.left - imageBox.left;
        assert.approximately(leftGap * ratio, newLeftGap, tolerance);

        const topGap = originalBox.top - imageBox.top;
        const newTopGap = newBox.top - imageBox.top;
        assert.approximately(topGap * ratio, newTopGap, tolerance);

        assert.approximately(
          newBox.width,
          originalBox.width * ratio,
          tolerance,
        );
        assert.approximately(
          newBox.height,
          originalBox.height * ratio,
          tolerance,
        );
      }
    } finally {
      clock.restore();
    }
  });

  it('debounces text layer size updates', async () => {
    const { image } = createPageImage();
    const imageText = 'some text in the image';

    createTextLayer(image, createCharBoxes(imageText), imageText);

    // Spy on logic that is invoked each time a resize event is handled.
    const measureImageSpy = sinon.spy(image, 'getBoundingClientRect');

    // Resize the image twice in quick succession. The text layer should only
    // be resized once.
    const imageResized = waitForResize(image);
    image.style.width = '250px';
    image.style.height = '250px';
    await imageResized;

    // Waiting one event loop turn between resizes is necessary to avoid a
    // "ResizeObserver loop limit exceeded" error.
    await delay(0);

    const imageResizedAgain = waitForResize(image);
    image.style.width = '300px';
    image.style.height = '300px';
    await imageResizedAgain;

    assert.calledOnce(measureImageSpy);
  });

  describe('#updateSync', () => {
    it('flushes text layer size updates immediately', () => {
      const { image } = createPageImage();
      const imageText = 'some text in the image';

      const textLayer = createTextLayer(
        image,
        createCharBoxes(imageText),
        imageText,
      );

      // Spy on logic that is invoked each time a resize event is handled.
      const measureImageSpy = sinon.spy(image, 'getBoundingClientRect');

      image.style.width = '250px';
      image.style.height = '250px';
      textLayer.updateSync();

      assert.calledOnce(measureImageSpy);
    });
  });

  describe('#destroy', () => {
    it('removes the <hypothesis-text-layer> element', () => {
      const { container, image } = createPageImage();
      const imageText = 'some text in the image';
      const textLayer = createTextLayer(
        image,
        createCharBoxes(imageText),
        imageText,
      );

      textLayer.destroy();

      const textLayerEl = container.querySelector('hypothesis-text-layer');
      assert.isNull(textLayerEl);
    });

    it('stops responding to window resize events', () => {
      const { image } = createPageImage();
      const imageText = 'some text in the image';
      const textLayer = createTextLayer(
        image,
        createCharBoxes(imageText),
        imageText,
      );

      // Trigger an error if ImageTextLayer's resize logic is run.
      sinon
        .stub(image, 'getBoundingClientRect')
        .throws(new Error('Should not be called'));

      const clock = sinon.useFakeTimers();
      try {
        window.dispatchEvent(new Event('resize'));
        textLayer.destroy();
        window.dispatchEvent(new Event('resize'));

        // Trigger any active debounced event handlers.
        clock.tick(300);
      } finally {
        clock.restore();
      }
    });
  });
});
