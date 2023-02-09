/* global process */
import * as redux from 'redux';
import thunk from 'redux-thunk';

import { immutable } from '../util/immutable';
import type { OmitFirstArg, TupleToIntersection } from './type-utils';

/**
 * Helper that converts an object of selector functions, which take a `state`
 * parameter plus zero or more arguments, into selector methods, with no `state` parameter.
 */
type SelectorMethods<T> = { [K in keyof T]: OmitFirstArg<T[K]> };

/** Map of action type to reducer function. */
type ReducerMap<State> = {
  [action: string]: (s: State, action: any) => Partial<State>;
};

/** Map of selector name to selector function. */
type SelectorMap<State> = { [name: string]: (s: State, ...args: any[]) => any };

/**
 * Type of a store module returned by `createStoreModule`. See {@link ModuleConfig}.
 */
type Module<
  State,
  Actions extends object,
  Selectors extends Record<string, unknown>,
  RootSelectors extends Record<string, unknown>
> = {
  namespace: string;
  initialState: (...args: any[]) => State;
  reducers: ReducerMap<State>;
  actionCreators: Actions;
  selectors: Selectors;
  rootSelectors?: RootSelectors;
};

/**
 * Helper for getting the type of store produced by `createStore` when
 * passed a given module.
 *
 * To get the type for a store created from several modules, use `&`:
 *
 * `StoreFromModule<firstModule> & StoreFromModule<secondModule>`
 */
type StoreFromModule<T> = T extends Module<
  any,
  infer Actions,
  infer Selectors,
  infer RootSelectors
>
  ? Store<Actions, Selectors, RootSelectors>
  : never;

/**
 * Redux store augmented with selector methods to query specific state and
 * action methods that dispatch specific actions.
 */
export type Store<
  Actions extends object,
  Selectors extends object,
  RootSelectors extends object
> = redux.Store &
  Actions &
  SelectorMethods<Selectors> &
  SelectorMethods<RootSelectors>;

/** Create a Redux reducer from a store module's reducer map. */
function createReducer<State>(reducers: ReducerMap<State>) {
  return (state = {} as State, action: redux.Action) => {
    const reducer = reducers[action.type];
    if (!reducer) {
      return state;
    }
    const stateChanges = reducer(state, action);
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
 */
function bindSelectors<State, Selectors extends SelectorMap<State>>(
  selectors: Selectors,
  getState: () => State
): SelectorMethods<Selectors> {
  const boundSelectors: Record<string, () => unknown> = {};
  for (const [name, selector] of Object.entries(selectors)) {
    boundSelectors[name] = (...args: any[]) => selector(getState(), ...args);
  }
  return boundSelectors as SelectorMethods<Selectors>;
}

/**
 * `Object.assign` wrapper that checks for overwriting properties in debug builds.
 */
function assignOnce<T extends object, U extends object>(target: T, source: U) {
  if (process.env.NODE_ENV !== 'production') {
    for (const key of Object.keys(source)) {
      if (key in target) {
        throw new Error(`Cannot add duplicate '${key}' property to object`);
      }
    }
  }
  return Object.assign(target, source);
}

/**
 * Create a Redux store from a set of modules.
 *
 * Each module defines the logic related to a subset of the application state.
 * This includes:
 *
 *  - The initial value of the state. This should always be an object.
 *  - Actions that can change the state
 *  - Selectors for extracting information from the state
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
 * Preact UI components access stores via the `useStore` hook. This returns a
 * proxy which enables UI components to observe what store state a component
 * depends upon and re-render when it changes.
 */
export function createStore<
  Modules extends readonly Module<any, any, any, any>[]
>(
  modules: Modules,
  initArgs: any[] = [],
  middleware: any[] = []
): StoreFromModule<TupleToIntersection<Modules>> {
  const initialState: Record<string, unknown> = {};
  for (const module of modules) {
    initialState[module.namespace] = module.initialState(...initArgs);
  }

  const allReducers: redux.ReducersMapObject = {};
  for (const module of modules) {
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
  const actionCreators: Record<string, (...args: any[]) => redux.Action> = {};
  for (const module of modules) {
    assignOnce(actionCreators, module.actionCreators);
  }
  const actionMethods = redux.bindActionCreators(
    actionCreators,
    store.dispatch
  );
  Object.assign(store, actionMethods);

  // Add selectors as methods to the store.
  const selectorMethods = {};
  for (const module of modules) {
    const { namespace, selectors, rootSelectors } = module;
    const boundSelectors = bindSelectors(
      selectors,
      () => store.getState()[namespace]
    );
    assignOnce(selectorMethods, boundSelectors);

    if (rootSelectors) {
      const boundRootSelectors = bindSelectors(rootSelectors, store.getState);
      assignOnce(selectorMethods, boundRootSelectors);
    }
  }
  Object.assign(store, selectorMethods);

  return store as any;
}

/**
 * Helper for creating an action which checks that the type of the action's
 * payload is compatible with what the reducer expects.
 *
 * @param reducers - The map of reducer functions from a store module
 * @param type - The name of a specific reducer in `reducers`
 * @param payload - The fields of the action
 *   except for `type`. Pass `undefined` if the reducer doesn't need an action payload.
 */
export function makeAction<
  Reducers extends ReducerMap<any>,
  Type extends keyof Reducers
>(reducers: Reducers, type: Type, payload: Parameters<Reducers[Type]>[1]) {
  // nb. `reducers` is not used here. It exists purely for type inference.
  return { type, ...payload };
}

/**
 * Configuration for a store module.
 *
 * This specifies everything about the contents of a store module, except the
 * initial state. The initial state is passed separately to {@link createStoreModule}
 * to aid type inference.
 */
type ModuleConfig<
  State,
  Actions,
  Selectors extends SelectorMap<State>,
  RootSelectors = Record<string, unknown>
> = {
  /** The key under which this module's state will live in the store's root state. */
  namespace: string;

  /**
   * Map of action types to "reducer" functions that process an action and return
   * the changes to the state
   */
  reducers: ReducerMap<State>;

  /**
   * Map of functions which create actions that alter state in this module.
   *
   * These actions may also be handled by other modules.
   */
  actionCreators: Actions;

  /** Map of functions which compute information from this module's state. */
  selectors: Selectors;

  /**
   * Map of functions which compute information from state in this module and
   * other modules.
   */
  rootSelectors?: RootSelectors;
};

/**
 * Create a store module that can be passed to {@link createStore}.
 *
 * @param initialState - Initial state for the module, specified either as a
 *   value or a function which computes it. If a function is passed, it is
 *   provided the arguments from the {@link createStore} call
 * @param config - Namespace and contents (actions, selectors, reducers etc.)
 *   of the module
 */
export function createStoreModule<
  State,
  Actions extends Record<string, unknown>,
  Selectors extends SelectorMap<State>,
  RootSelectors extends Record<string, unknown> = Record<string, unknown>
>(
  initialState: State | ((...args: any[]) => State),
  config: ModuleConfig<State, Actions, Selectors, RootSelectors>
): Module<State, Actions, Selectors, RootSelectors> {
  if (!(initialState instanceof Function)) {
    const state = initialState;
    initialState = () => state;
  }

  return {
    initialState,
    ...config,
  };
}
