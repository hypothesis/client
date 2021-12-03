/** @type {Window|null} */
let errorDestination = null;

/**
 * Wrap a callback with an error handler which forwards errors to another frame
 * using {@link sendError}.
 *
 * @template {unknown[]} Args
 * @template Result
 * @param {(...args: Args) => Result} callback
 * @param {string} context - A short message indicating where the error happened.
 * @return {(...args: Args) => Result}
 */
export function captureErrors(callback, context) {
  return (...args) => {
    try {
      return callback(...args);
    } catch (err) {
      sendError(err, context);
      throw err;
    }
  };
}

/**
 * @typedef ErrorData
 * @prop {string} message
 * @prop {string} [stack]
 */

/**
 * Return a cloneable representation of an Error.
 *
 * This is needed in browsers that don't support structured-cloning of Error
 * objects, or if the error is not cloneable for some reason.
 *
 * @param {Error|unknown} err
 * @return {ErrorData}
 */
function serializeError(err) {
  if (!(err instanceof Error)) {
    return { message: String(err), stack: undefined };
  }

  return {
    message: err.message,
    stack: err.stack,
  };
}

/**
 * Convert error data serialized by {@link serializeError} back into an Error.
 *
 * @param {ErrorData} data
 * @return {Error}
 */
function deserializeError(data) {
  const err = new Error(data.message);
  err.stack = data.stack;
  return err;
}

/**
 * Forward an error to the frame registered with {@link sendErrorsTo}.
 *
 * Errors are delivered on a best-effort basis. If no error handling frame has
 * been registered or the frame is still loading, the error will not be received.
 *
 * Ideally we would use a more robust delivery system which can queue messages
 * until they can be processed (eg. using MessagePort). We use `window.postMessage`
 * for the moment because we are trying to rule out problems with
 * MessageChannel/MessagePort when setting up sidebar <-> host communication.
 *
 * @param {unknown} error
 * @param {string} context - A short message indicating where the error happened.
 */
export function sendError(error, context) {
  if (!errorDestination) {
    return;
  }

  const data = {
    type: 'hypothesis-error',
    error: error instanceof Error ? error : serializeError(error),
    context,
  };

  try {
    // Try to send the error. If this fails because the browser doesn't support
    // structured cloning of errors, use a fallback.
    try {
      errorDestination.postMessage(data, '*');
    } catch (postErr) {
      if (
        postErr instanceof DOMException &&
        postErr.name === 'DataCloneError'
      ) {
        data.error = serializeError(data.error);
        errorDestination.postMessage(data, '*');
      } else {
        throw postErr;
      }
    }
  } catch (sendErr) {
    console.warn('Unable to report Hypothesis error', sendErr);
  }
}

/**
 * Register a handler for errors sent to the current frame using {@link sendError}
 *
 * @param {(error: unknown, context: string) => void} callback
 * @return {() => void} A function that unregisters the handler
 */
export function handleErrorsInFrames(callback) {
  /** @param {MessageEvent} event */
  const handleMessage = event => {
    const { data } = event;
    if (data && data?.type === 'hypothesis-error') {
      const { context, error } = data;
      callback(
        error instanceof Error ? error : deserializeError(error),
        context
      );
    }
  };
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}

/**
 * Register a destination frame that {@link sendError} should submit errors to.
 *
 * @param {Window|null} destination
 */
export function sendErrorsTo(destination) {
  errorDestination = destination;
}
