import { createStoreModule, makeAction } from '../create-store';

export type RouteName =
  | 'annotation'
  | 'notebook'
  | 'profile'
  | 'sidebar'
  | 'stream';

export type State = {
  /** The current route. */
  name: RouteName | null;

  /**
   * Parameters of the current route.
   *
   * - The "annotation" route has an "id" (annotation ID) parameter.
   * - The "stream" route has a "q" (query) parameter.
   * - The "sidebar" route has no parameters.
   */
  params: Record<string, string | undefined>;
};

const initialState: State = {
  name: null,
  params: {},
};

const reducers = {
  CHANGE_ROUTE(
    state: State,
    { name, params }: { name: RouteName; params: Record<string, string> },
  ) {
    return { name, params };
  },
};

/**
 * Change the active route.
 *
 * @param name - Name of the route to activate. See `initialState` for possible values
 * @param params - Parameters associated with the route
 */
function changeRoute(name: RouteName, params: Record<string, string> = {}) {
  return makeAction(reducers, 'CHANGE_ROUTE', { name, params });
}

/**
 * Return the name of the current route.
 */
function route(state: State) {
  return state.name;
}

/**
 * Return any parameters for the current route, extracted from the path and
 * query string.
 */
function routeParams(state: State) {
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
