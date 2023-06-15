import type { Store } from 'redux';

/**
 * Return an object where each key in `updateFns` is mapped to the key itself.
 *
 * @param reducers - Object containing reducer functions
 */
export function actionTypes<T extends Record<string, unknown>>(
  reducers: T
): { [index in keyof T]: string } {
  return Object.keys(reducers).reduce<any>((types, key) => {
    types[key] = key;
    return types;
  }, {});
}

/**
 * Return a value from app state when it meets certain criteria.
 *
 * `await` returns a Promise which resolves when a selector function,
 * which reads values from a Redux store, returns non-null.
 *
 * @param selector - Function which returns a value from the store if the
 *   criteria is met or `null` otherwise.
 */
export function awaitStateChange<T>(
  store: Store,
  selector: (s: Store) => T | null
): Promise<T> {
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
