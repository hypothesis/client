import debounce from 'lodash.debounce';

/** @typedef {(frame: HTMLIFrameElement) => void} FrameCallback */

// Find difference of two arrays
let difference = (arrayA, arrayB) => {
  return arrayA.filter(x => !arrayB.includes(x));
};

export const DEBOUNCE_WAIT = 40;

export default class FrameObserver {
  /**
   * @param {Element} element - root of the DOM subtree to watch for the addition
   *   and removal of annotatable iframes
   * @param {FrameCallback} onFrameAdded - callback fired when an annotatable iframe is added
   * @param {FrameCallback} onFrameRemoved - callback triggered when the annotatable iframe is removed
   */
  constructor(element, onFrameAdded, onFrameRemoved) {
    this._element = element;
    this._onFrameAdded = onFrameAdded;
    this._onFrameRemoved = onFrameRemoved;
    /** @type {HTMLIFrameElement[]} */
    this._handledFrames = [];

    this._mutationObserver = new MutationObserver(
      debounce(() => {
        this._discoverFrames();
      }, DEBOUNCE_WAIT)
    );
    this._discoverFrames();
    this._mutationObserver.observe(this._element, {
      childList: true,
      subtree: true,
      attributeFilter: ['enable-annotation'],
    });
  }

  disconnect() {
    this._mutationObserver.disconnect();
  }

  /**
   * @param {HTMLIFrameElement} frame
   */
  _addFrame(frame) {
    if (isAccessible(frame)) {
      isDocumentReady(frame, () => {
        const frameWindow = /** @type {Window} */ (frame.contentWindow);
        frameWindow.addEventListener('unload', () => {
          this._removeFrame(frame);
        });
        this._handledFrames.push(frame);
        this._onFrameAdded(frame);
      });
    } else {
      // Could warn here that frame was not cross origin accessible
    }
  }

  /**
   * @param {HTMLIFrameElement} frame
   */
  _removeFrame(frame) {
    this._onFrameRemoved(frame);

    // Remove the frame from our list
    this._handledFrames = this._handledFrames.filter(x => x !== frame);
  }

  _discoverFrames() {
    let frames = findFrames(this._element);

    for (let frame of frames) {
      if (!this._handledFrames.includes(frame)) {
        this._addFrame(frame);
      }
    }

    for (let frame of difference(this._handledFrames, frames)) {
      this._removeFrame(frame);
    }
  }
}

/**
 * Check if we can access this iframe's document
 *
 * @param {HTMLIFrameElement} iframe
 */
function isAccessible(iframe) {
  try {
    return !!iframe.contentDocument;
  } catch (e) {
    return false;
  }
}

/**
 * @param {HTMLIFrameElement} iframe
 * @param {() => void} callback
 */
export function isDocumentReady(iframe, callback) {
  const iframeDocument = /** @type {Document} */ (iframe.contentDocument);
  if (iframeDocument.readyState === 'loading') {
    iframeDocument.addEventListener('DOMContentLoaded', () => {
      callback();
    });
  } else {
    callback();
  }
}

/**
 * Return all `<iframe>` elements under `container` which are annotate-able.
 *
 * To enable annotation, an iframe must be opted-in by adding the
 * `enable-annotation` attribute.
 *
 * Eventually we may want annotation to be enabled by default for iframes that
 * pass certain tests. However we need to resolve a number of issues before we
 * can do that. See https://github.com/hypothesis/client/issues/530
 *
 * @param {Element} container
 * @return {HTMLIFrameElement[]}
 */
export function findFrames(container) {
  return Array.from(container.querySelectorAll('iframe[enable-annotation]'));
}
