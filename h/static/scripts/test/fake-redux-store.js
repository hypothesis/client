'use strict';

var redux = require('redux');

/**
 * Utility function that creates a fake Redux store for use in tests.
 *
 * Unlike a real store, this has a `setState()` method that can be used to
 * set the state directly.
 */
function fakeStore(initialState) {
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

  return store;
}

module.exports = fakeStore;
