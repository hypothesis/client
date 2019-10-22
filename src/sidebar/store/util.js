'use strict';

/**
 * Return an object where each key in `updateFns` is mapped to the key itself.
 */
function actionTypes(updateFns) {
  return Object.keys(updateFns).reduce(function(types, key) {
    types[key] = key;
    return types;
  }, {});
}

/**
 * Given objects which map action names to update functions, this returns a
 * reducer function that can be passed to the redux `createStore` function.
 *
 * @param {Object} actionToUpdateFn - Object mapping action names to update
 *                                      functions.
 */
function createReducer(actionToUpdateFn) {
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
function bindSelectors(namespaces, getState, store) {
  const totalSelectors = {};
  Object.keys(namespaces).forEach(namespace => {
    const selectors = namespaces[namespace].selectors;
    Object.keys(selectors).forEach(selector => {
      totalSelectors[selector] = function() {
        const args = [].slice.apply(arguments);
        args.unshift({
          ...getState(),
          getStore: ()=>(store)
        });
        return selectors[selector].apply(null, args);
      };
    });
  });
  return totalSelectors;
}

module.exports = {
  actionTypes,
  bindSelectors,
  createReducer,
};
