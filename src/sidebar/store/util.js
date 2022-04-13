/** @typedef {import('redux').Store} Store */

/**
 * Return an object where each key in `updateFns` is mapped to the key itself.
 *
 * @template {Record<string,Function>} T
 * @param {T} reducers - Object containing reducer functions
 * @return {{ [index in keyof T]: string }}
 */
export function actionTypes(reducers) {
  return Object.keys(reducers).reduce((types, key) => {
    types[key] = key;
    return types;
  }, /** @type {any} */ ({}));
}

/**
 * Return a value from app state when it meets certain criteria.
 *
 * `await` returns a Promise which resolves when a selector function,
 * which reads values from a Redux store, returns non-null.
 *
 * @template T
 * @param {import('redux').Store} store
 * @param {(s: Store) => T|null} selector - Function which returns a value from the
 *   store if the criteria is met or `null` otherwise.
 * @return {Promise<T>}
 */
export function awaitStateChange(store, selector) {
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
