import { generateHexString } from '../../shared/random';

/**
 * Return a Promise that rejects with an error after `delay` ms.
 */
function createTimeout(delay: number, message: string) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), delay);
  });
}

/**
 * Make a JSON-RPC call to a server in another frame using `postMessage`.
 *
 * @param frame - Frame to send call to
 * @param origin - Origin filter for `window.postMessage` call
 * @param method - Name of the JSON-RPC method
 * @param params - Parameters of the JSON-RPC method
 * @param timeout - Maximum time to wait in ms
 * @param window_ - Test seam.
 * @return A Promise for the response to the call
 */
export function call<T>(
  frame: Window,
  origin: string,
  method: string,
  /* istanbul ignore next */
  params: unknown[] = [],
  /* istanbul ignore next */
  timeout = 2000,
  /* istanbul ignore next */
  window_: Window = window
): Promise<T> {
  const id = generateHexString(10);

  // Send RPC request.
  const request = {
    jsonrpc: '2.0',
    method,
    params,
    id,
  };

  try {
    frame.postMessage(request, origin);
  } catch (err) {
    return Promise.reject(err);
  }

  // Await response or timeout.
  let listener: (e: MessageEvent) => void;
  const response = new Promise((resolve, reject) => {
    listener = event => {
      if (event.origin !== origin) {
        // Not from the frame that we sent the request to.
        return;
      }

      if (
        !(event.data instanceof Object) ||
        event.data.jsonrpc !== '2.0' ||
        event.data.id !== id
      ) {
        // Not a valid JSON-RPC response.
        return;
      }

      const { error, result } = event.data;
      if (error !== undefined) {
        reject(error);
      } else if (result !== undefined) {
        resolve(result);
      } else {
        reject(new Error('RPC reply had no result or error'));
      }
    };
    window_.addEventListener('message', listener);
  });

  const responseOrTimeout = [response];
  if (timeout) {
    responseOrTimeout.push(
      createTimeout(timeout, `Request to ${origin} timed out`)
    );
  }

  // Cleanup and return.
  // FIXME: If we added a `Promise.finally` polyfill we could simplify this.
  return Promise.race(responseOrTimeout)
    .then(result => {
      window_.removeEventListener('message', listener);
      return result as T;
    })
    .catch(err => {
      window_.removeEventListener('message', listener);
      throw err;
    });
}

/**
 * Send a JSON-RPC 2.0 notification request to another frame via `postMessage`.
 * No response is expected.
 *
 * @param frame - Frame to send call to
 * @param origin - Origin filter for `window.postMessage` call
 * @param method - Name of the JSON-RPC method
 * @param params - Parameters of the JSON-RPC method
 */
export function notify(
  frame: Window,
  origin: string,
  method: string,
  /* istanbul ignore next */
  params: unknown[] = []
) {
  const request = {
    jsonrpc: '2.0',
    method,
    params,
  };
  frame.postMessage(request, origin);
}
