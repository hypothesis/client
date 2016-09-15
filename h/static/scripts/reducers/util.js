'use strict';

/**
 * Return an object where each key in `updateFns` is mapped to the key itself.
 */
function actionTypes(updateFns) {
  return Object.keys(updateFns).reduce(function (types, key) {
    types[key] = key;
    return types;
  }, {});
}

/**
 * Given an object which maps action names to update functions, this returns
 * a reducer function that can be passed to the redux `createStore` function.
 */
function createReducer(updateFns) {
  return function (state, action) {
    var fn = updateFns[action.type];
    if (!fn) {
      return state;
    }
    return Object.assign({}, state, fn(state, action));
  };
}

/**
 * Takes an object mapping keys to selector functions and the `getState()`
 * function from the store and returns an object with the same keys but where
 * the values are functions that call the original functions with the `state`
 * argument set to the current value of `getState()`
 */
function bindSelectors(selectors, getState) {
  return Object.keys(selectors).reduce(function (bound, key) {
    var selector = selectors[key];
    bound[key] = function () {
      var args = [].slice.apply(arguments);
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
