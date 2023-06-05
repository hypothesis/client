export type Frame = 'guest' | 'host' | 'notebook' | 'profile' | 'sidebar';

/**
 * Message sent by `PortProvider` and `PortFinder` to establish a
 * MessageChannel-based connection between two frames.
 */
export type Message = {
  /** Role of the source frame. */
  frame1: Frame;

  /** Role of the target frame. */
  frame2: Frame;

  /**
   * Message type. "request" messages are sent by the source frame to the host
   * frame to request a connection. "offer" messages are sent from the host
   * frame back to the source frame and also to the target frame, accompanied by
   * a MessagePort.
   */
  type: 'offer' | 'request';

  /**
   * ID of the request. Used to associate "offer" messages with their
   * corresponding "request" messages.
   */
  requestId: string;

  /**
   * Identifier for the source frame. This is useful in cases where multiple
   * source frames with a given role may connect to the same destination frame.
   */
  sourceId?: string;
};

/**
 * Return true if an object, eg. from the `data` field of a `MessageEvent`, is a
 * valid `Message`.
 */
export function isMessage(data: any): data is Message {
  if (data === null || typeof data !== 'object') {
    return false;
  }

  for (const property of ['frame1', 'frame2', 'type', 'requestId']) {
    if (typeof data[property] !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Return true if the data payload from a MessageEvent matches `message`.
 */
export function isMessageEqual(data: any, message: Partial<Message>) {
  if (!isMessage(data)) {
    return false;
  }

  // We assume `JSON.stringify` cannot throw because `isMessage` verifies that
  // all the fields we serialize here are serializable values.
  return (
    JSON.stringify(data, Object.keys(message).sort()) ===
    JSON.stringify(message, Object.keys(message).sort())
  );
}

/**
 * Check that source is of type Window.
 */
export function isSourceWindow(
  source: MessageEventSource | null
): source is Window {
  if (
    // `source` can be of type Window, MessagePort, ServiceWorker, or null.
    // `source instanceof Window` doesn't work in Chrome if `source` is a
    // cross-origin window.
    source === null ||
    source instanceof MessagePort ||
    (window.ServiceWorker && source instanceof ServiceWorker)
  ) {
    return false;
  }

  return true;
}
