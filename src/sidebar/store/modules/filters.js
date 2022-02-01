import { createSelector } from 'reselect';

import { actionTypes } from '../util';
import { createStoreModule } from '../create-store';

/**
 * Manage state pertaining to the filtering of annotations in the UI.
 *
 * There are a few sources of filtering that gets applied to annotations:
 *
 * - focusFilters: Filters defined by config/settings. Currently supports a
 *   user filter. Application of these filters may be toggled on/off by user
 *   interaction (`focusActive`), but the values of these filters are set by
 *   config/settings or RPC (not by user directly). The value(s) of
 *   focusFilters are retained even when focus is inactive such that they might
 *   be re-applied later.
 * - filters: Filters set by faceting/filtering UI. Any filter here is currently
 *   active (applied).
 * - query: String query that is either typed in by the user or provided in
 *   settings. A query string may contain supported facets.
 *   (see `util/search-filter`)
 */

/**
 *
 * @typedef {import('../../../types/rpc').FocusUserInfo} FocusUserInfo
 */

/**
 * Structure of focus-mode config, provided in settings (app config)
 * @typedef FocusConfig
 * @prop {FocusUserInfo} user
 */

/**
 * @typedef FilterOption
 * @prop {string} value - The machine-readable value of the option
 * @prop {string} display - The human-facing "pretty" value of the option
 */

/**
 * Valid/recognized filters
 * @typedef {'user'} FilterKey
 */

/**
 * @typedef {Record<FilterKey, FilterOption>} Filters
 */

/**
 * @typedef FocusState
 * @prop {boolean} active
 * @prop {boolean} configured
 * @prop {string} displayName
 */

function initialState(settings) {
  const focusConfig = settings.focus || {};
  return {
    filters: /** @type {Filters} */ ({}),

    // immediately activate focus mode if there is a valid config
    focusActive: isValidFocusConfig(focusConfig),
    focusFilters: focusFiltersFromConfig(focusConfig),

    /** @type {string|null} */
    query: settings.query || null,
  };
}

/** @typedef {ReturnType<typeof initialState>} State */

/**
 * Given the provided focusConfig: is it a valid configuration for focus?
 * At this time, a `user` filter is required.
 *
 * @param {FocusConfig} focusConfig
 * @return {boolean}
 */
function isValidFocusConfig(focusConfig) {
  return !!(focusConfig.user?.username || focusConfig.user?.userid);
}

/**
 * Compose an object of keyed `FilterOption`s from the given `focusConfig`.
 * At present, this will create a `user` `FilterOption` if the config is valid.
 *
 * @param {FocusConfig} focusConfig
 * @return {Filters}
 */
function focusFiltersFromConfig(focusConfig) {
  if (!isValidFocusConfig(focusConfig)) {
    return /** @type {Filters} */ ({});
  }
  const userFilterValue =
    focusConfig.user.username || focusConfig.user.userid || '';
  return {
    user: {
      value: userFilterValue,
      display: focusConfig.user.displayName || userFilterValue,
    },
  };
}

const reducers = {
  CHANGE_FOCUS_MODE_USER: function (state, action) {
    return {
      focusActive: isValidFocusConfig({ user: action.user }),
      focusFilters: focusFiltersFromConfig({ user: action.user }),
    };
  },

  SET_FILTER: function (state, action) {
    const updatedFilters = {
      ...state.filters,
      [action.filterName]: action.filterOption,
    };
    // If the filter's value is empty, remove the filter
    if (action.filterOption?.value === '') {
      delete updatedFilters[action.filterName];
    }
    return { filters: updatedFilters };
  },

  SET_FILTER_QUERY: function (state, action) {
    return { query: action.query };
  },

  SET_FOCUS_MODE: function (state, action) {
    const active = action.active ?? !state.focusActive;
    return {
      focusActive: active,
    };
  },

  // Actions defined in other modules

  CLEAR_SELECTION: function () {
    return {
      filters: /** @type {Filters} */ ({}),
      focusActive: false,
      query: null,
    };
  },
};

const actions = actionTypes(reducers);

// Action creators

/**
 * Change the focused user filter and activate focus
 *
 * @param {FocusUserInfo} user - The user to focus on
 */
function changeFocusModeUser(user) {
  return { type: actions.CHANGE_FOCUS_MODE_USER, user };
}

/**
 * @param {FilterKey} filterName
 * @param {FilterOption} filterOption
 */
function setFilter(filterName, filterOption) {
  return (dispatch, getState) => {
    // If there is a filter conflict with focusFilters, deactivate focus
    // mode to prevent unintended collisions and let the new filter value
    // take precedence.
    if (getState().filters.focusFilters?.[filterName]) {
      dispatch({
        type: actions.SET_FOCUS_MODE,
        active: false,
      });
    }
    dispatch({
      type: actions.SET_FILTER,
      filterName,
      filterOption,
    });
  };
}

/** Set the query used to filter displayed annotations. */
function setFilterQuery(query) {
  return {
    type: actions.SET_FILTER_QUERY,
    query,
  };
}

/**
 * Toggle whether or not a (user-)focus mode is applied, either inverting the
 * current active state or setting it to a target `active` state, if provided.
 *
 * @param {boolean} [active] - Optional `active` state for focus mode
 */
function toggleFocusMode(active) {
  return {
    type: actions.SET_FOCUS_MODE,
    active,
  };
}

// Selectors

function filterQuery(state) {
  return state.query;
}

/**
 * Summary of focus state
 *
 * @type {(state: any) => FocusState}
 */
const focusState = createSelector(
  /** @param {State} state */
  state => state.focusActive,
  /** @param {State} state */
  state => state.focusFilters,
  (focusActive, focusFilters) => {
    return {
      active: focusActive,
      configured: !!focusFilters?.user,
      displayName: focusFilters?.user?.display || '',
    };
  }
);

/**
 * Get all currently-applied filters. If focus is active, will also return
 * `focusFilters`, though `filters` will supersede in the case of key collisions.
 * `query` is not considered a "filter" in this context.
 *
 * @return {Filters}
 */
const getFilters = createSelector(
  state => state.filters,
  state => state.focusActive,
  state => state.focusFilters,
  (filters, focusActive, focusFilters) => {
    if (focusActive) {
      return { ...focusFilters, ...filters };
    }
    return { ...filters };
  }
);

/**
 * Retrieve an applied filter by name/key
 */
function getFilter(state, filterName) {
  const filters = getFilters(state);
  return filters[filterName];
}

/**
 * Retrieve the (string) values of all currently-applied filters.
 */
const getFilterValues = createSelector(
  state => getFilters(state),
  allFilters => {
    /** @type {Record<string,string>} */
    const filterValues = {};
    Object.keys(allFilters).forEach(
      filterKey => (filterValues[filterKey] = allFilters[filterKey].value)
    );
    return filterValues;
  }
);

function getFocusFilters(state) {
  return state.focusFilters;
}

/**
 * Are there currently any active (applied) filters?
 */
function hasAppliedFilter(state) {
  return !!(state.query || Object.keys(getFilters(state)).length);
}

export const filtersModule = createStoreModule(initialState, {
  namespace: 'filters',
  reducers,
  actionCreators: {
    changeFocusModeUser,
    setFilter,
    setFilterQuery,
    toggleFocusMode,
  },
  selectors: {
    filterQuery,
    focusState,
    getFilter,
    getFilters,
    getFilterValues,
    getFocusFilters,
    hasAppliedFilter,
  },
});
