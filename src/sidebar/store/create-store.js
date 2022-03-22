/* global process */

import * as redux from 'redux';
import thunk from 'redux-thunk';

import { immutable } from '../util/immutable';

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
 * Map of action type to reducer function.
 *
 * @template State
 * @typedef {{ [action: string]: (s: State, action: any) => Partial<State> }} ReducerMap
 */

/**
 * Map of selector name to selector function.
 *
 * @template State
 * @typedef {{ [name: string]: (s: State, ...args: any[]) => any }} SelectorMap
 */

/**
 * Type of a store module returned by `createStoreModule`.
 *
 * @template State
 * @template {object} Actions
 * @template {object} Selectors
 * @template {object} RootSelectors
 * @typedef Module
 * @prop {string} namespace -
 *   The key under which this module's state will live in the store's root state
 * @prop {(...args: any[]) => State} initialState
 * @prop {ReducerMap<State>} reducers -
 *   Map of action types to "reducer" functions that process an action and return
 *   the changes to the state
 * @prop {Actions} actionCreators
 *   Object containing action creator functions
 * @prop {Selectors} selectors
 *   Object containing selector functions
 * @prop {RootSelectors} [rootSelectors]
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
 *   Store<Actions,Selectors,RootSelectors> : never} StoreFromModule
 */

/**
 * Redux store augmented with selector methods to query specific state and
 * action methods that dispatch specific actions.
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
 * Create a Redux reducer from a store module's reducer map.
 *
 * @template State
 * @param {Record<string, (s: State, a: redux.Action) => Partial<State>>} reducers -
 *   Map of reducers from a store module.
 */
function createReducer(reducers) {
  /** @param {redux.Action} action */
  return (state = /** @type {State} */ ({}), action) => {
    const reducer = reducers[action.type];
    if (!reducer) {
      return state;
    }
    const stateChanges = reducer(state, action);

    // Some modules return an array rather than an object. They need to be
    // handled differently so we don't convert them to an object.
    if (Array.isArray(stateChanges)) {
      return stateChanges;
    }

    return {
      ...state,
      ...stateChanges,
    };
  };
}

/**
 * Convert a map of selector functions, which take a state value as their
 * first argument, to a map of selector methods, which pre-fill the first
 * argument by calling `getState()`.
 *
 * @template State
 * @template {SelectorMap<State>} Selectors
 * @param {Selectors} selectors
 * @param {() => State} getState
 * @return {SelectorMethods<Selectors>}
 */
function bindSelectors(selectors, getState) {
  /** @type {Record<string, Function>} */
  const boundSelectors = {};
  for (let [name, selector] of Object.entries(selectors)) {
    boundSelectors[name] = /** @param {any[]} args */ (...args) =>
      selector(getState(), ...args);
  }
  return /** @type {SelectorMethods<Selectors>} */ (boundSelectors);
}

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
 * In addition to the standard Redux store interface, the returned store also exposes
 * each action creator and selector from the input modules as a method. For example, if
 * a store is created from a module that has a `getWidget(<id>)` selector and
 * an `addWidget(<object>)` action, a consumer would use `store.getWidget(<id>)`
 * to fetch an item and `store.addWidget(<object>)` to dispatch an action that
 * adds an item. External consumers of the store should in most cases use these
 * selector and action methods rather than `getState` or `dispatch`. This
 * makes it easier to refactor the internal state structure.
 *
 * Preact UI components access stores via the `useStoreProxy` hook defined in
 * `use-store.js`. This returns a proxy which enables UI components to observe
 * what store state a component depends upon and re-render when it changes.
 *
 * @param {Module<any,any,any,any>[]} modules
 * @param {any[]} [initArgs] - Arguments to pass to each state module's `initialState` function
 * @param {any[]} [middleware] - List of additional Redux middlewares to use
 * @return Store<any,any,any>
 */
export function createStore(modules, initArgs = [], middleware = []) {
  /** @type {Record<string, unknown>} */
  const initialState = {};
  for (let module of modules) {
    initialState[module.namespace] = module.initialState(...initArgs);
  }

  /** @type {redux.ReducersMapObject} */
  const allReducers = {};
  for (let module of modules) {
    allReducers[module.namespace] = createReducer(module.reducers);
  }

  const defaultMiddleware = [
    // The `thunk` middleware handles actions which are functions.
    // This is used to implement actions which have side effects or are
    // asynchronous (see https://github.com/gaearon/redux-thunk#motivation)
    thunk,
  ];

  const enhancer = redux.applyMiddleware(...defaultMiddleware, ...middleware);

  // Combine the reducers for all modules
  let reducer = redux.combineReducers(allReducers);

  // In debug builds, freeze the new state after each action to catch any attempts
  // to mutate it, which indicates a bug since it is supposed to be immutable.
  if (process.env.NODE_ENV !== 'production') {
    const originalReducer = reducer;
    reducer = (state, action) => immutable(originalReducer(state, action));
  }

  const store = redux.createStore(reducer, initialState, enhancer);

  // Add action creators as methods to the store.
  const actionCreators = Object.assign(
    {},
    ...modules.map(m => m.actionCreators)
  );
  const actionMethods = redux.bindActionCreators(
    actionCreators,
    store.dispatch
  );
  Object.assign(store, actionMethods);

  // Add selectors as methods to the store.
  const selectorMethods = {};
  for (let module of modules) {
    const { namespace, selectors, rootSelectors } = module;
    const boundSelectors = bindSelectors(
      selectors,
      () => store.getState()[namespace]
    );
    Object.assign(selectorMethods, boundSelectors);

    if (rootSelectors) {
      const boundRootSelectors = bindSelectors(rootSelectors, store.getState);
      Object.assign(selectorMethods, boundRootSelectors);
    }
  }
  Object.assign(store, selectorMethods);

  return store;
}

/**
 * Helper for creating an action which checks that the type of the action's
 * payload is compatible with what the reducer expects.
 *
 * @template {ReducerMap<any>} Reducers
 * @template {keyof Reducers} Type
 * @param {Reducers} reducers - The map of reducer functions from a store module
 * @param {Type} type - The name of a specific reducer in `reducers`
 * @param {Parameters<Reducers[Type]>[1]} payload - The fields of the action
 *   except for `type`. Pass `undefined` if the reducer doesn't need an action payload.
 */
export function makeAction(reducers, type, payload) {
  // nb. `reducers` is not used here. It exists purely for type inference.
  return { type, ...payload };
}

/**
 * Create a store module that can be passed to `createStore`.
 *
 * @template State
 * @template Actions
 * @template {SelectorMap<State>} Selectors
 * @template [RootSelectors={}]
 * @param {State | ((...args: any[]) => State)} initialState
 * @param {object} config
 *   @param {string} config.namespace -
 *     The key under which this module's state will live in the store's root state
 *   @param {ReducerMap<State>} config.reducers -
 *   @param {Actions} config.actionCreators
 *   @param {Selectors} config.selectors
 *   @param {RootSelectors} [config.rootSelectors]
 * @return {Module<State,Actions,Selectors,RootSelectors>}
 */
export function createStoreModule(initialState, config) {
  // The `initialState` argument is separate to `config` as this allows
  // TypeScript to infer the `State` type in the `config` argument at the
  // `createStoreModule` call site.

  if (!(initialState instanceof Function)) {
    const state = initialState;
    initialState = () => state;
  }

  return {
    initialState,
    ...config,
  };
}
