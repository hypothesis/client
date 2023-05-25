import retry from 'retry';

/**
 * Options passed that control how the operation is retried.
 *
 * See https://github.com/tim-kos/node-retry#retrytimeoutsoptions
 */
export type RetryOptions = {
  minTimeout: number;
};

/**
 * Retry a Promise-returning operation until it succeeds or
 * fails after a set number of attempts.
 *
 * @param callback - The operation to retry
 * @return Result of first successful `callback` call (ie. that did not reject)
 */
export function retryPromiseOperation<T>(
  callback: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  return new Promise((resolve, reject) => {
    const operation = retry.operation(options);
    operation.attempt(async () => {
      try {
        const result = await callback();

        // After a successful call `retry` still needs to be invoked without
        // arguments to clear internal timeouts.
        operation.retry();

        resolve(result);
      } catch (err) {
        if (!operation.retry(err)) {
          reject(err);
        }
      }
    });
  });
}
