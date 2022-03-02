import scrollIntoView from 'scroll-into-view';

/**
 * Return a promise that resolves on the next animation frame.
 */
function nextAnimationFrame() {
  return new Promise(resolve => {
    requestAnimationFrame(resolve);
  });
}

/**
 * Linearly interpolate between two values.
 *
 * @param {number} a
 * @param {number} b
 * @param {number} fraction - Value in [0, 1]
 */
function interpolate(a, b, fraction) {
  return a + fraction * (b - a);
}

/**
 * Return the offset of `element` from the top of a positioned ancestor `parent`.
 *
 * @param {HTMLElement} element
 * @param {HTMLElement} parent - Positioned ancestor of `element`
 * @return {number}
 */
export function offsetRelativeTo(element, parent) {
  let offset = 0;
  while (element !== parent && parent.contains(element)) {
    offset += element.offsetTop;
    element = /** @type {HTMLElement} */ (element.offsetParent);
  }
  return offset;
}

/**
 * Scroll `element` until its `scrollTop` offset reaches a target value.
 *
 * @param {Element} element - Container element to scroll
 * @param {number} offset - Target value for the scroll offset
 * @param {object} options
 *   @param {number} [options.maxDuration]
 * @return {Promise<void>} - A promise that resolves once the scroll animation
 *   is complete
 */
export async function scrollElement(
  element,
  offset,
  /* istanbul ignore next - defaults are overridden in tests */
  { maxDuration = 500 } = {}
) {
  const startOffset = element.scrollTop;
  const endOffset = offset;
  const scrollStart = Date.now();

  // Choose a scroll duration proportional to the scroll distance, but capped
  // to avoid it being too slow.
  const pixelsPerMs = 3;
  const scrollDuration = Math.min(
    Math.abs(endOffset - startOffset) / pixelsPerMs,
    maxDuration
  );

  let scrollFraction = 0.0;
  while (scrollFraction < 1.0) {
    await nextAnimationFrame();
    scrollFraction = Math.min(1.0, (Date.now() - scrollStart) / scrollDuration);
    element.scrollTop = interpolate(startOffset, endOffset, scrollFraction);
  }
}

/**
 * Smoothly scroll an element into view.
 *
 * @param {HTMLElement} element
 * @param {object} options
 *   @param {number} [options.maxDuration]
 */
export async function scrollElementIntoView(
  element,
  /* istanbul ignore next - defaults are overridden in tests */
  { maxDuration = 500 } = {}
) {
  // Make the body's `tagName` return an upper-case string in XHTML documents
  // like it does in HTML documents. This is a workaround for
  // `scrollIntoView`'s detection of the <body> element. See
  // https://github.com/KoryNunn/scroll-into-view/issues/101.
  const body = element.closest('body');
  if (body && body.tagName !== 'BODY') {
    Object.defineProperty(body, 'tagName', {
      value: 'BODY',
      configurable: true,
    });
  }

  await new Promise(resolve =>
    scrollIntoView(element, { time: maxDuration }, resolve)
  );
}
