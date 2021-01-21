/** @typedef {import('redux').Store} Store */

/**
 * Return an object where each key in `updateFns` is mapped to the key itself.
 *
 * @template {Object.<string,Function>} T
 * @param {T} reducers - Object containing reducer functions
 * @return {{ [index in keyof T]: string }}
 */
export function actionTypes(reducers) {
  return Object.keys(reducers).reduce(function (types, key) {
    types[key] = key;
    return types;
  }, /** @type {any} */ ({}));
}

/**
 * Given objects which map action names to update functions, this returns a
 * reducer function that can be passed to the redux `createStore` function.
 *
 * @param {Object} actionToUpdateFn - Object mapping action names to update
 *                                      functions.
 */
export function createReducer(actionToUpdateFn) {
  return (state = {}, action) => {
    const fn = actionToUpdateFn[action.type];
    if (!fn) {
      return state;
    }
    // Some modules return an array rather than an object. They need to be
    // handled differently so we don't cast them to an object.
    if (Array.isArray(state)) {
      return [...fn(state, action)];
    }
    return {
      ...state,
      ...fn(state, action),
    };
  };
}

/**
 * Takes a mapping of namespaced modules and the store's `getState()` function
 * and returns an aggregated flat object with all the selectors at the root
 * level. The keys to this object are functions that call the original
 * selectors with the `state` argument set to the current value of `getState()`.
 */
export function bindSelectors(namespaces, getState) {
  const boundSelectors = {};
  Object.keys(namespaces).forEach(namespace => {
    const { selectors, rootSelectors = {} } = namespaces[namespace];

    Object.keys(selectors).forEach(selector => {
      if (boundSelectors[selector]) {
        throw new Error(`Duplicate selector "${selector}"`);
      }
      boundSelectors[selector] = (...args) =>
        selectors[selector](getState()[namespace], ...args);
    });

    Object.keys(rootSelectors).forEach(selector => {
      if (boundSelectors[selector]) {
        throw new Error(`Duplicate selector "${selector}"`);
      }
      boundSelectors[selector] = (...args) =>
        rootSelectors[selector](getState(), ...args);
    });
  });
  return boundSelectors;
}

/**
 * Return a value from app state when it meets certain criteria.
 *
 * `await` returns a Promise which resolves when a selector function,
 * which reads values from a Redux store, returns non-null.
 *
 * @template T
 * @param {Object} store - Redux store
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
