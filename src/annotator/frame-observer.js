import debounce from 'lodash.debounce';

export const DEBOUNCE_WAIT = 40;

/** @typedef {(frame: HTMLIFrameElement) => void} FrameCallback */

/**
 * FrameObserver detects iframes added and deleted from the document.
 *
 * To enable annotation, an iframe must be opted-in by adding the
 * `enable-annotation` attribute.
 *
 * We require the `enable-annotation` attribute to avoid the overhead of loading
 * the client into frames which are not useful to annotate. See
 * https://github.com/hypothesis/client/issues/530
 */
export class FrameObserver {
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
    this._annotatableFrames = new Set();
    this._isDisconnected = false;

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
    this._isDisconnected = true;
    this._mutationObserver.disconnect();
  }

  /**
   * @param {HTMLIFrameElement} frame
   */
  async _addFrame(frame) {
    this._annotatableFrames.add(frame);
    try {
      await onDocumentReady(frame);
      if (this._isDisconnected) {
        return;
      }
      const frameWindow = frame.contentWindow;
      // @ts-expect-error
      // This line raises an exception if the iframe is from a different origin
      frameWindow.addEventListener('unload', () => {
        this._removeFrame(frame);
      });
      this._onFrameAdded(frame);
    } catch (e) {
      console.warn(
        `Unable to inject the Hypothesis client (from '${document.location.href}' into a cross-origin frame '${frame.src}')`
      );
    }
  }

  /**
   * @param {HTMLIFrameElement} frame
   */
  _removeFrame(frame) {
    this._annotatableFrames.delete(frame);
    this._onFrameRemoved(frame);
  }

  _discoverFrames() {
    const frames = new Set(
      /** @type {NodeListOf<HTMLIFrameElement> } */ (
        this._element.querySelectorAll('iframe[enable-annotation]')
      )
    );

    for (let frame of frames) {
      if (!this._annotatableFrames.has(frame)) {
        this._addFrame(frame);
      }
    }

    for (let frame of this._annotatableFrames) {
      if (!frames.has(frame)) {
        this._removeFrame(frame);
      }
    }
  }
}

/**
 * Resolves a Promise when the iframe's document is ready (loaded and parsed)
 *
 * @param {HTMLIFrameElement} frame
 * @return {Promise<void>}
 * @throws {Error} if trying to access a document from a cross-origin iframe
 */
export function onDocumentReady(frame, counter = 0) {
  return new Promise((resolve, reject) => {
    // @ts-expect-error
    const frameDocument = frame.contentWindow.document;
    const { readyState, location } = frameDocument;

    // Web browsers initially load a blank document before the final document.
    // This blank document is (1) accessible, (2) has an empty body and head,
    // and (3) has a 'complete' readyState, on Chrome and Safari, and an
    // 'uninitialized' readyState on Firefox. If a blank document is detected and
    // there is a 'src' attribute, it is expected that the blank document will be
    // replaced by the final document.
    if (
      location.href === 'about:blank' &&
      frame.hasAttribute('src') &&
      frame.src !== 'about:blank'
    ) {
      setTimeout(() => {
        // If `onDocumentReady` is recursively called more than 100 times
        // (10ms * 100 = 1s) exit.
        if (counter >= 99) {
          reject(new Error('Annotatable iframe took too long to load'));
          return;
        }

        onDocumentReady(frame, counter + 1)
          .then(resolve)
          .catch(reject);
      }, 10);

      return;
    }

    if (readyState === 'loading') {
      frameDocument.addEventListener('DOMContentLoaded', () => resolve());
      return;
    }

    // State is 'interactive' or 'complete';
    resolve();
  });
}
