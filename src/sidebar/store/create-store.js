/* global process */

import * as redux from 'redux';
import thunk from 'redux-thunk';

import immutable from '../util/immutable';

import { createReducer, bindSelectors } from './util';

/**
 * Helper that strips the first argument from a function type.
 *
 * @template F
 * @typedef {F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never} OmitFirstArg
 */

/**
 * Helper that converts an object of selector functions, which take a `state`
 * parameter plus zero or more arguments, into selector methods, with no `state` parameter.
 *
 * @template T
 * @typedef {{ [K in keyof T]: OmitFirstArg<T[K]> }} SelectorMethods
 */

/**
 * Map of action name to reducer function.
 *
 * @template State
 * @typedef {{ [action: string]: (s: State, action: any) => Partial<State> }} Reducers
 */

/**
 * Configuration for a store module.
 *
 * @template State
 * @template {object} Actions
 * @template {object} Selectors
 * @template {object} RootSelectors
 * @typedef Module
 * @prop {(...args: any[]) => State} init -
 *   Function that returns the initial state for the module
 * @prop {string} namespace -
 *   The key under which this module's state will live in the store's root state
 * @prop {Reducers<State>} update -
 *   Map of action types to "reducer" functions that process an action and return
 *   the changes to the state
 * @prop {Actions} actions
 *   Object containing action creator functions
 * @prop {Selectors} selectors
 *   Object containing selector functions
 * @prop {RootSelectors} [rootSelectors]
 */

/**
 * Replace a type `T` with `Fallback` if `T` is `any`.
 *
 * Based on https://stackoverflow.com/a/61626123/434243.
 *
 * @template T
 * @template Fallback
 * @typedef {0 extends (1 & T) ? Fallback : T} DefaultIfAny
 */

/**
 * Helper for getting the type of store produced by `createStore` when
 * passed a given module.
 *
 * To get the type for a store created from several modules, use `&`:
 *
 * `StoreFromModule<firstModule> & StoreFromModule<secondModule>`
 *
 * @template T
 * @typedef {T extends Module<any, infer Actions, infer Selectors, infer RootSelectors> ?
 *   Store<Actions,Selectors,DefaultIfAny<RootSelectors,{}>> : never} StoreFromModule
 */

/**
 * Redux store augmented with methods to dispatch actions and select state.
 *
 * @template {object} Actions
 * @template {object} Selectors
 * @template {object} RootSelectors
 * @typedef {redux.Store &
 *   Actions &
 *   SelectorMethods<Selectors> &
 *   SelectorMethods<RootSelectors>} Store
 */

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
 * @param {Module<any,any,any,any>[]} modules
 * @param {any[]} [initArgs] - Arguments to pass to each state module's `init` function
 * @param {any[]} [middleware] - List of additional Redux middlewares to use
 * @return Store<any,any,any>
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
        rootSelectors: module.rootSelectors || {},
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

/**
 * Helper to validate a store module configuration before it is passed to
 * `createStore`.
 *
 * @template State
 * @template Actions
 * @template Selectors
 * @template RootSelectors
 * @param {Module<State,Actions,Selectors,RootSelectors>} config
 * @return {Module<State,Actions,Selectors,RootSelectors>}
 */
export function storeModule(config) {
  // This helper doesn't currently do anything at runtime. It does ensure more
  // helpful error messages when typechecking if there is something incorrect
  // in the configuration.
  return config;
}
