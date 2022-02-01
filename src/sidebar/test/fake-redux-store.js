import * as redux from 'redux';

/**
 * Utility function that creates a fake Redux store for use in tests.
 *
 * Unlike a real store, this has a `setState()` method that can be used to
 * set the state directly.
 *
 * @param {object} initialState - Initial state for the store
 * @param {object} methods - A set of additional properties to mixin to the
 *        returned store.
 * @return {object} Redux store
 */
export function fakeReduxStore(initialState, methods) {
  function update(state, action) {
    if (action.state) {
      return Object.assign({}, state, action.state);
    } else {
      return state;
    }
  }

  const store = redux.createStore(update, initialState);

  store.setState = function (state) {
    store.dispatch({ type: 'SET_STATE', state });
  };

  return Object.assign(store, methods);
}
