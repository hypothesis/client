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
 * Forward an error to the frame registered with {@link sendErrorsTo}.
 *
 * Errors are delivered on a best-effort basis. If no error handling frame has
 * been registered or the frame is still loading, the error will not be received.
 *
 * @param {unknown} error
 * @param {string} context - A short message indicating where the error happened.
 */
export function sendError(error, context) {
  if (!errorDestination) {
    return;
  }

  const data = { type: 'hypothesis-error', error, context };
  try {
    // Try to send the error. This will currently fail in browsers which don't
    // support structured cloning of exceptions. For these we'll need to implement
    // a fallback.
    errorDestination.postMessage(data, '*');
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
      callback(data.error, data.context);
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
