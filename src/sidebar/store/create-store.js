'use strict';

const redux = require('redux');
// `.default` is needed because 'redux-thunk' is built as an ES2015 module
const thunk = require('redux-thunk').default;

const { createReducer, bindSelectors } = require('./util');

/**
 * Create a Redux store from a set of _modules_.
 *
 * Each module defines the logic related to a particular piece of the application
 * state, including:
 *
 *  - The initial value of that state
 *  - The _actions_ that can change that state
 *  - The _selectors_ for reading that state or computing things
 *    from that state.
 *
 * On top of the standard Redux store methods, the returned store also exposes
 * each action and selector from the input modules as a method which operates on
 * the store.
 *
 * @param {Object[]} modules
 * @param {any[]} initArgs - Arguments to pass to each state module's `init` function
 * @param [any[]] middleware - List of additional Redux middlewares to use.
 */
function createStore(modules, initArgs = [], middleware = []) {
  // Create the initial state and state update function.
  const initialState = Object.assign(
    {},
    ...modules.map(m => m.init(...initArgs))
  );
  const reducer = createReducer(...modules.map(m => m.update));

  // Create the store.
  const defaultMiddleware = [
    // The `thunk` middleware handles actions which are functions.
    // This is used to implement actions which have side effects or are
    // asynchronous (see https://github.com/gaearon/redux-thunk#motivation)
    thunk,
  ];
  const enhancer = redux.applyMiddleware(...defaultMiddleware, ...middleware);
  const store = redux.createStore(reducer, initialState, enhancer);

  // Add actions and selectors as methods to the store.
  const actions = Object.assign({}, ...modules.map(m => m.actions));
  const boundActions = redux.bindActionCreators(actions, store.dispatch);
  const selectors = Object.assign({}, ...modules.map(m => m.selectors));
  const boundSelectors = bindSelectors(selectors, store.getState);
  Object.assign(store, boundActions, boundSelectors);

  return store;
}

module.exports = createStore;
