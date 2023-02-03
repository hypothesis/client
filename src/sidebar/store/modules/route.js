import { createStoreModule, makeAction } from '../create-store';

/**
 * @typedef {'annotation'|'notebook'|'profile'|'sidebar'|'stream'} RouteName
 */

const initialState = {
  /**
   * The current route.
   *
   * @type {RouteName|null}
   */
  name: null,

  /**
   * Parameters of the current route.
   *
   * - The "annotation" route has an "id" (annotation ID) parameter.
   * - The "stream" route has a "q" (query) parameter.
   * - The "sidebar" route has no parameters.
   *
   * @type {Record<string, string>}
   */
  params: {},
};

/** @typedef {typeof initialState} State */

const reducers = {
  /**
   * @param {State} state
   * @param {{ name: RouteName, params: Record<string, string> }} action
   */
  CHANGE_ROUTE(state, { name, params }) {
    return { name, params };
  },
};

/**
 * Change the active route.
 *
 * @param {RouteName} name - Name of the route to activate. See `initialState` for possible values
 * @param {Record<string,string>} params - Parameters associated with the route
 */
function changeRoute(name, params = {}) {
  return makeAction(reducers, 'CHANGE_ROUTE', { name, params });
}

/**
 * Return the name of the current route.
 *
 * @param {State} state
 */
function route(state) {
  return state.name;
}

/**
 * Return any parameters for the current route, extracted from the path and
 * query string.
 *
 * @param {State} state
 */
function routeParams(state) {
  return state.params;
}

export const routeModule = createStoreModule(initialState, {
  namespace: 'route',
  reducers,
  actionCreators: {
    changeRoute,
  },
  selectors: {
    route,
    routeParams,
  },
});
