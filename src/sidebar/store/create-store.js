/* global process */

import * as redux from 'redux';
import thunk from 'redux-thunk';

import immutable from '../util/immutable';

import { createReducer, bindSelectors } from './util';

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
 * @param {any[]} [initArgs] - Arguments to pass to each state module's `init` function
 * @param {any[]} [middleware] - List of additional Redux middlewares to use.
 */
export default function createStore(modules, initArgs = [], middleware = []) {
  // Create the initial state and state update function.

  // Namespaced objects for initial states.
  const initialState = {};

  /**
   * Namespaced reducers from each module.
   * @type {import("redux").ReducersMapObject} allReducers
   */
  const allReducers = {};
  // Namespaced selectors from each module.
  const allSelectors = {};

  // Iterate over each module and prep each module's:
  //    1. state
  //    2. reducers
  //    3. selectors
  //
  modules.forEach(module => {
    if (module.namespace) {
      initialState[module.namespace] = module.init(...initArgs);

      allReducers[module.namespace] = createReducer(module.update);
      allSelectors[module.namespace] = {
        selectors: module.selectors,
      };
    } else {
      console.warn('Store module does not specify a namespace', module);
    }
  });

  const defaultMiddleware = [
    // The `thunk` middleware handles actions which are functions.
    // This is used to implement actions which have side effects or are
    // asynchronous (see https://github.com/gaearon/redux-thunk#motivation)
    thunk,
  ];

  const enhancer = redux.applyMiddleware(...defaultMiddleware, ...middleware);

  // Create the combined reducer from the reducers for each module.
  let reducer = redux.combineReducers(allReducers);

  // In debug builds, freeze the new state after each action to catch any attempts
  // to mutate it, which indicates a bug since it is supposed to be immutable.
  if (process.env.NODE_ENV !== 'production') {
    const originalReducer = reducer;
    reducer = (state, action) => immutable(originalReducer(state, action));
  }

  // Create the store.
  const store = redux.createStore(reducer, initialState, enhancer);

  // Add actions and selectors as methods to the store.
  const actions = Object.assign({}, ...modules.map(m => m.actions));
  const boundActions = redux.bindActionCreators(actions, store.dispatch);
  const boundSelectors = bindSelectors(allSelectors, store.getState);

  Object.assign(store, boundActions, boundSelectors);

  return store;
}
