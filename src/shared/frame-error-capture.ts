let errorDestination: Window | null = null;

/**
 * Wrap a callback with an error handler which forwards errors to another frame
 * using {@link sendError}.
 *
 * @param context - A short message indicating where the error happened.
 */
export function captureErrors<Result, Args = unknown>(
  callback: (...args: Args[]) => Result,
  context: string
): (...args: Args[]) => Result {
  return (...args) => {
    try {
      return callback(...args);
    } catch (err) {
      sendError(err, context);
      throw err;
    }
  };
}

type ErrorData = {
  message: string;
  stack?: string;
};

/**
 * Return a cloneable representation of an Error.
 *
 * This is needed in browsers that don't support structured-cloning of Error
 * objects, or if the error is not cloneable for some reason.
 */
function serializeError(err: Error | unknown): ErrorData {
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
 */
function deserializeError(data: ErrorData): ErrorData {
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
 * @param context - A short message indicating where the error happened.
 */
export function sendError(error: unknown, context: string) {
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
 * @return A function that unregisters the handler
 */
export function handleErrorsInFrames(
  callback: (error: unknown, context: string) => void
): () => void {
  const handleMessage = (event: MessageEvent) => {
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
 */
export function sendErrorsTo(destination: Window | null) {
  errorDestination = destination;
}
