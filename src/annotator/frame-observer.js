import debounce from 'lodash.debounce';

export const DEBOUNCE_WAIT = 40;

/** @typedef {(frame: HTMLIFrameElement) => void} FrameCallback */

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
    /** @type {Set<HTMLIFrameElement>} */
    this._handledFrames = new Set();

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
  async _addFrame(frame) {
    if (isAccessible(frame)) {
      await onDocumentReady(frame);
      const frameWindow = /** @type {Window} */ (frame.contentWindow);
      frameWindow.addEventListener('unload', () => {
        this._removeFrame(frame);
      });
      this._handledFrames.add(frame);
      this._onFrameAdded(frame);
    } else {
      // Could warn here that frame was not cross origin accessible
    }
  }

  /**
   * @param {HTMLIFrameElement} frame
   */
  _removeFrame(frame) {
    this._onFrameRemoved(frame);
    this._handledFrames.delete(frame);
  }

  _discoverFrames() {
    let frames = findFrames(this._element);

    for (let frame of frames) {
      if (!this._handledFrames.has(frame)) {
        this._addFrame(frame);
      }
    }

    for (let frame of this._handledFrames) {
      if (!frames.has(frame)) {
        this._removeFrame(frame);
      }
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
 * Resolves a Promise when the iframe's DOM is ready (loaded and parsed)
 *
 * @param {HTMLIFrameElement} iframe
 * @return {Promise<void>}
 */
export function onDocumentReady(iframe) {
  return new Promise(resolve => {
    const iframeDocument = /** @type {Document} */ (iframe.contentDocument);
    if (iframeDocument.readyState === 'loading') {
      iframeDocument.addEventListener('DOMContentLoaded', () => {
        resolve();
      });
    } else {
      resolve();
    }
  });
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
 * @return {Set<HTMLIFrameElement>}
 */
export function findFrames(container) {
  return new Set(container.querySelectorAll('iframe[enable-annotation]'));
}
