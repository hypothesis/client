'use strict';

/**
 * Return a value from app state when it meets certain criteria.
 *
 * `await` returns a Promise which resolves when a selector function,
 * which reads values from a Redux store, returns non-null.
 *
 * @param {Object} store - Redux store
 * @param {Function<T|null>} selector - Function which returns a value from the
 *   store if the criteria is met or `null` otherwise.
 * @return {Promise<T>}
 */
function awaitStateChange(store, selector) {
  const result = selector(store);
  if (result !== null) {
    return Promise.resolve(result);
  }
  return new Promise(resolve => {
    const unsubscribe = store.subscribe(() => {
      const result = selector(store);
      if (result !== null) {
        unsubscribe();
        resolve(result);
      }
    });
  });
}

module.exports = { awaitStateChange };
