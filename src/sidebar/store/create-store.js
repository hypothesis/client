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
  // Create the initial state and state update function. The "base"
  // namespace is reserved for non-namespaced modules which will eventually
  // be converted over.

  // Namespaced objects for initial states.
  const initialState = {
    base: null,
  };
  // Namespaced reducers from each module.
  const allReducers = {
    base: null,
  };
  // Namespaced selectors from each module.
  const allSelectors = {
    base: {
      selectors: {},
      // Tells the bindSelector method to use local state for these selectors
      // rather than the top level root state.
      useLocalState: true,
    },
  };

  // Temporary list of non-namespaced modules used for createReducer.
  const baseModules = [];

  // Iterate over each module and prep each module's:
  //    1. state
  //    2. reducers
  //    3. selectors
  //
  // Modules that have no namespace get dumped into the "base" namespace.
  //
  modules.forEach(module => {
    if (module.namespace) {
      initialState[module.namespace] = module.init(...initArgs);
      allReducers[module.namespace] = createReducer(module.update);
      allSelectors[module.namespace] = {
        selectors: module.selectors,
      };
    } else {
      // No namespace
      allSelectors.base.selectors = {
        // Aggregate the selectors into a single "base" map
        ...allSelectors.base.selectors,
        ...module.selectors,
      };
      initialState.base = {
        ...initialState.base,
        ...module.init(...initArgs),
      };
      baseModules.push(module);
    }
  });

  // Create the base reducer for modules that are not opting in for namespacing
  allReducers.base = createReducer(...baseModules.map(m => m.update));

  const defaultMiddleware = [
    // The `thunk` middleware handles actions which are functions.
    // This is used to implement actions which have side effects or are
    // asynchronous (see https://github.com/gaearon/redux-thunk#motivation)
    thunk,
  ];
  const enhancer = redux.applyMiddleware(...defaultMiddleware, ...middleware);

  // Create the store.
  const store = redux.createStore(
    redux.combineReducers(allReducers),
    initialState,
    enhancer
  );

  // Temporary wrapper while we use the "base" namespace. This allows getState
  // to work as it did before. Under the covers the state is actually
  // nested inside "base" namespace.
  const getState = store.getState;
  store.getState = () => getState().base;

  // Because getState is overridden, we still need a fallback for the root state
  // for the namespaced modules. They will temporarily use getRootState
  // until all modules are namespaced and then this will be deprecated.
  store.getRootState = () => getState();

  // Add actions and selectors as methods to the store.
  const actions = Object.assign({}, ...modules.map(m => m.actions));
  const boundActions = redux.bindActionCreators(actions, store.dispatch);
  const boundSelectors = bindSelectors(allSelectors, store.getRootState);

  Object.assign(store, boundActions, boundSelectors);

  return store;
}

module.exports = createStore;
