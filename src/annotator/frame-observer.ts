import debounce from 'lodash.debounce';

export const DEBOUNCE_WAIT = 40;

type FrameCallback = (frame: HTMLIFrameElement) => void;

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
  private _element: Element;
  private _onFrameAdded: FrameCallback;
  private _onFrameRemoved: FrameCallback;
  private _annotatableFrames: Set<HTMLIFrameElement>;
  private _isDisconnected: boolean;
  private _mutationObserver: MutationObserver;

  /**
   * @param element - root of the DOM subtree to watch for the addition and
   *   removal of annotatable iframes
   * @param onFrameAdded - callback fired when an annotatable iframe is added
   * @param onFrameRemoved - callback triggered when the annotatable iframe is removed
   */
  constructor(
    element: Element,
    onFrameAdded: FrameCallback,
    onFrameRemoved: FrameCallback
  ) {
    this._element = element;
    this._onFrameAdded = onFrameAdded;
    this._onFrameRemoved = onFrameRemoved;
    this._annotatableFrames = new Set<HTMLIFrameElement>();
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

  private async _addFrame(frame: HTMLIFrameElement) {
    this._annotatableFrames.add(frame);
    try {
      await onNextDocumentReady(frame);
      if (this._isDisconnected) {
        return;
      }
      const frameWindow = frame.contentWindow;
      // This line raises an exception if the iframe is from a different origin
      frameWindow!.addEventListener('unload', () => {
        this._removeFrame(frame);
      });
      this._onFrameAdded(frame);
    } catch (e) {
      console.warn(
        `Unable to inject the Hypothesis client (from '${document.location.href}' into a cross-origin frame '${frame.src}')`
      );
    }
  }

  private _removeFrame(frame: HTMLIFrameElement) {
    this._annotatableFrames.delete(frame);
    this._onFrameRemoved(frame);
  }

  private _discoverFrames() {
    const frames = new Set<HTMLIFrameElement>(
      this._element.querySelectorAll('iframe[enable-annotation]')
    );

    for (const frame of frames) {
      if (!this._annotatableFrames.has(frame)) {
        this._addFrame(frame);
      }
    }

    for (const frame of this._annotatableFrames) {
      if (!frames.has(frame)) {
        this._removeFrame(frame);
      }
    }
  }
}

/**
 * Test if this is the empty document that a new iframe has before the URL
 * specified by its `src` attribute loads.
 */
function hasBlankDocumentThatWillNavigate(frame: HTMLIFrameElement): boolean {
  return (
    frame.contentDocument?.location.href === 'about:blank' &&
    // Do we expect the frame to navigate away from about:blank?
    frame.hasAttribute('src') &&
    frame.src !== 'about:blank'
  );
}

/**
 * Wrapper around {@link onDocumentReady} which returns a promise that resolves
 * the first time that a document in `frame` becomes ready.
 *
 * See {@link onDocumentReady} for the definition of _ready_.
 */
export function onNextDocumentReady(
  frame: HTMLIFrameElement
): Promise<Document> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onDocumentReady(frame, (err, doc) => {
      unsubscribe();
      if (doc) {
        resolve(doc);
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Register a callback that is invoked when the content document
 * (`frame.contentDocument`) in a same-origin iframe becomes _ready_.
 *
 * A document is _ready_ when its `readyState` is either "interactive" or
 * "complete". It must also not be the empty document with URL "about:blank"
 * that iframes have before they navigate to the URL specified by their "src"
 * attribute.
 *
 * The callback is fired both for the document that is in the frame when
 * `onDocumentReady` is called, as well as for new documents that are
 * subsequently loaded into the same frame.
 *
 * If at any time the frame navigates to an iframe that is cross-origin,
 * the callback will fire with an error. It will fire again for subsequent
 * navigations, but due to platform limitations, it will only fire after the
 * next document fully loads (ie. when the frame's `load` event fires).
 *
 * @return Callback that unsubscribes from future changes
 */
export function onDocumentReady(
  frame: HTMLIFrameElement,
  callback: (err: Error | null, document?: Document) => void,
  { pollInterval = 10 }: { pollInterval?: number } = {}
): () => void {
  let pollTimer: number | undefined;
  // eslint-disable-next-line prefer-const
  let pollForDocumentChange: () => void;

  // Visited documents for which we have fired the callback or are waiting
  // to become ready.
  const documents = new WeakSet();

  const cancelPoll = () => {
    clearTimeout(pollTimer);
    pollTimer = undefined;
  };

  // Begin polling for a document change when the current document is about
  // to go away.
  const pollOnUnload = () => {
    if (frame.contentDocument) {
      frame.contentWindow?.addEventListener('unload', pollForDocumentChange);
    }
  };

  const checkForDocumentChange = () => {
    const currentDocument = frame.contentDocument;

    // `contentDocument` may be null if the frame navigated to a URL that is
    // cross-origin, or if the `<iframe>` was removed from the document.
    if (!currentDocument) {
      cancelPoll();
      const errorMessage = frame.isConnected
        ? 'Frame is cross-origin'
        : 'Frame is disconnected';
      callback(new Error(errorMessage));
      return;
    }

    if (documents.has(currentDocument)) {
      return;
    }
    documents.add(currentDocument);
    cancelPoll();

    if (!hasBlankDocumentThatWillNavigate(frame)) {
      const isReady =
        currentDocument.readyState === 'interactive' ||
        currentDocument.readyState === 'complete';

      if (isReady) {
        callback(null, currentDocument);
      } else {
        currentDocument.addEventListener('DOMContentLoaded', () =>
          callback(null, currentDocument)
        );
      }
    }

    // Poll for the next document change.
    pollOnUnload();
  };

  let canceled = false;
  pollForDocumentChange = () => {
    cancelPoll();
    if (!canceled) {
      pollTimer = setInterval(checkForDocumentChange, pollInterval);
    }
  };

  // Set up observers for signals that the document either has changed or will
  // soon change. There are two signals with different trade-offs:
  //
  //  - Polling after the current document is about to be unloaded. This allows
  //    us to detect the new document quickly, but may not fire in some
  //    situations (exact circumstances unclear, but eg. MDN warns about this).
  //
  //    This is set up in the first call to `checkForDocumentChange`.
  //
  //  - The iframe's "load" event. This is guaranteed to fire but only after the
  //    new document is fully loaded.
  frame.addEventListener('load', checkForDocumentChange);

  // Notify caller about the current document. This fires asynchronously so that
  // the caller will have received the unsubscribe callback first.
  const initialCheckTimer = setTimeout(checkForDocumentChange, 0);

  return () => {
    canceled = true;
    clearTimeout(initialCheckTimer);
    cancelPoll();
    frame.removeEventListener('load', checkForDocumentChange);
  };
}
