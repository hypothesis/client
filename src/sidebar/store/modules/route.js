import { actionTypes } from '../util';

function init() {
  return {
    /**
     * The current route.
     * One of null (if no route active yet), "sidebar", "annotation" or "stream".
     */
    name: null,

    /**
     * Parameters of the current route.
     *
     * - The "annotation" route has an "id" (annotation ID) parameter.
     * - The "stream" route has a "q" (query) parameter.
     * - The "sidebar" route has no parameters.
     */
    params: {},
  };
}

const update = {
  CHANGE_ROUTE(state, { name, params }) {
    return { name, params };
  },
};

const actions = actionTypes(update);

/**
 * Change the active route.
 *
 * @param {string} name - Name of the route to activate. See `init` for possible values
 * @param {Object} params - Parameters associated with the route
 */
function changeRoute(name, params = {}) {
  return {
    type: actions.CHANGE_ROUTE,
    name,
    params,
  };
}

/**
 * Return the name of the current route.
 */
function route(state) {
  return state.route.name;
}

/**
 * Return any parameters for the current route, extracted from the path and
 * query string.
 */
function routeParams(state) {
  return state.route.params;
}

export default {
  init,
  namespace: 'route',
  update,
  actions: {
    changeRoute,
  },
  selectors: {
    route,
    routeParams,
  },
};
