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
 * @param {Object[]} actionToUpdateFn - Objects mapping action names to update
 *                                      functions.
 */
function createReducer(...actionToUpdateFn) {
  // Combine the (action name => update function) maps together into a single
  // (action name => update functions) map.
  const actionToUpdateFns = {};
  actionToUpdateFn.forEach(map => {
    Object.keys(map).forEach(k => {
      actionToUpdateFns[k] = (actionToUpdateFns[k] || []).concat(map[k]);
    });
  });

  return (state, action) => {
    const fns = actionToUpdateFns[action.type];
    if (!fns) {
      return state;
    }
    return Object.assign({}, state, ...fns.map(f => f(state, action)));
  };
}

/**
 * Takes an object mapping keys to selector functions and the `getState()`
 * function from the store and returns an object with the same keys but where
 * the values are functions that call the original functions with the `state`
 * argument set to the current value of `getState()`
 */
function bindSelectors(selectors, getState) {
  return Object.keys(selectors).reduce(function(bound, key) {
    const selector = selectors[key];
    bound[key] = function() {
      const args = [].slice.apply(arguments);
      args.unshift(getState());
      return selector.apply(null, args);
    };
    return bound;
  }, {});
}

module.exports = {
  actionTypes: actionTypes,
  bindSelectors: bindSelectors,
  createReducer: createReducer,
};
