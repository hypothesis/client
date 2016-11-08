'use strict';

var redux = require('redux');

/**
 * Utility function that creates a fake Redux store for use in tests.
 *
 * Unlike a real store, this has a `setState()` method that can be used to
 * set the state directly.
 *
 * @param {Object} initialState - Initial state for the store
 * @param {Object} methods - A set of additional properties to mixin to the
 *        returned store.
 * @return {Object} Redux store
 */
function fakeStore(initialState, methods) {
  function update(state, action) {
    if (action.state) {
      return action.state;
    } else {
      return state;
    }
  }

  var store = redux.createStore(update, initialState);

  store.setState = function (state) {
    store.dispatch({type: 'SET_STATE', state: state});
  };

  return Object.assign(store, methods);
}

module.exports = fakeStore;
