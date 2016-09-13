'use strict';

/**
 * Compose a list of `(state, action) => new state` reducer functions
 * into a single reducer.
 */
function composeReducers(reducers) {
  return function (state, action) {
    return reducers.reduce(function (state, reducer) {
      return reducer(state, action);
    }, state);
  };
}

module.exports = {
  composeReducers: composeReducers,
};
