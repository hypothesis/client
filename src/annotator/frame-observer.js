import debounce from 'lodash.debounce';

import * as FrameUtil from './util/frame-util';

/** @typedef {(frame: HTMLIFrameElement) => void} FrameCallback */

// Find difference of two arrays
let difference = (arrayA, arrayB) => {
  return arrayA.filter(x => !arrayB.includes(x));
};

export const DEBOUNCE_WAIT = 40;

export default class FrameObserver {
  constructor(target) {
    this._target = target;
    /** @type {HTMLIFrameElement[]} */
    this._handledFrames = [];

    this._mutationObserver = new MutationObserver(
      debounce(() => {
        this._discoverFrames();
      }, DEBOUNCE_WAIT)
    );
  }

  /**
   * Registers two listeners: the first callback is fired when an Hypothesis frame
   * is added, the second when an Hypothesis frame is removed.
   * This method is expected to be called only once.
   *
   * @param {FrameCallback} onFrameAdded
   * @param {FrameCallback} onFrameRemoved
   */
  observe(onFrameAdded, onFrameRemoved) {
    this._onFrameAdded = onFrameAdded;
    this._onFrameRemoved = onFrameRemoved;

    this._discoverFrames();
    this._mutationObserver.observe(this._target, {
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
    if (FrameUtil.isAccessible(frame)) {
      FrameUtil.isDocumentReady(frame, () => {
        const frameWindow = /** @type {Window} */ (frame.contentWindow);
        frameWindow.addEventListener('unload', () => {
          this._removeFrame(frame);
        });
        this._handledFrames.push(frame);
        // this._onFrameAdded is never undefined when reached this line
        /** @type {FrameCallback} */ (this._onFrameAdded)(frame);
      });
    } else {
      // Could warn here that frame was not cross origin accessible
    }
  }

  /**
   * @param {HTMLIFrameElement} frame
   */
  _removeFrame(frame) {
    // this._onFrameRemoved is never undefined when reached this line
    /** @type {FrameCallback} */ (this._onFrameRemoved)(frame);

    // Remove the frame from our list
    this._handledFrames = this._handledFrames.filter(x => x !== frame);
  }

  _discoverFrames() {
    let frames = FrameUtil.findFrames(this._target);

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
