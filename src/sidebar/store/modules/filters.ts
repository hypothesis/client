import type { Dispatch } from 'redux';
import { createSelector } from 'reselect';

import type { FocusConfig, SidebarSettings } from '../../../types/config';
import type { FocusUserInfo } from '../../../types/rpc';
import { createStoreModule, makeAction } from '../create-store';

/**
 * Manage state pertaining to the filtering of annotations in the UI.
 *
 * There are a few sources of filtering that gets applied to annotations:
 *
 * - focusFilters: Filters defined by config/settings. Currently, supports a
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

export type FilterOption = {
  /** The machine-readable value of the option */
  value: string;
  /** The human-facing "pretty" value of the option */
  display: string;
};

/**
 * Valid/recognized filters
 */
export type FilterKey = 'user';

export type Filters = Partial<Record<FilterKey, FilterOption | undefined>>;

type FocusState = {
  active: boolean;
  configured: boolean;
  displayName: string;
};

export type State = {
  filters: Filters;
  focusActive: boolean;
  focusFilters: Filters;
  query: string | null;
};

function initialState(settings: SidebarSettings): State {
  const focusConfig = settings.focus || {};
  return {
    filters: {},

    // immediately activate focus mode if there is a valid config
    focusActive: isValidFocusConfig(focusConfig),
    focusFilters: focusFiltersFromConfig(focusConfig),

    query: settings.query || null,
  };
}

/**
 * Given the provided focusConfig: is it a valid configuration for focus?
 * At this time, a `user` filter is required.
 */
function isValidFocusConfig(focusConfig: FocusConfig): boolean {
  return !!(focusConfig.user?.username || focusConfig.user?.userid);
}

/**
 * Compose an object of keyed `FilterOption`s from the given `focusConfig`.
 * At present, this will create a `user` `FilterOption` if the config is valid.
 */
function focusFiltersFromConfig(focusConfig: FocusConfig): Filters {
  const user = focusConfig.user;
  if (!user || !isValidFocusConfig(focusConfig)) {
    return {};
  }

  const userFilterValue = user.username || user.userid || '';
  return {
    user: {
      value: userFilterValue,
      display: user.displayName || userFilterValue,
    },
  };
}

const reducers = {
  CHANGE_FOCUS_MODE_USER(state: State, action: { user: FocusUserInfo }) {
    return {
      focusActive: isValidFocusConfig({ user: action.user }),
      focusFilters: focusFiltersFromConfig({ user: action.user }),
    };
  },

  SET_FILTER(
    state: State,
    action: { filterName: FilterKey; filterOption: FilterOption }
  ) {
    const updatedFilters: Filters = {
      ...state.filters,
      [action.filterName]: action.filterOption,
    };
    // If the filter's value is empty, remove the filter
    if (action.filterOption?.value === '') {
      delete updatedFilters[action.filterName];
    }
    return { filters: updatedFilters };
  },

  SET_FILTER_QUERY(state: State, action: { query: string }) {
    return { query: action.query };
  },

  SET_FOCUS_MODE(state: State, action: { active?: boolean }) {
    const active = action.active ?? !state.focusActive;
    return {
      focusActive: active,
    };
  },

  // Actions defined in other modules

  CLEAR_SELECTION() {
    return {
      filters: {},
      focusActive: false,
      query: null,
    };
  },
};

// Action creators

/**
 * Change the focused user filter and activate focus
 *
 * @param user - The user to focus on
 */
function changeFocusModeUser(user: FocusUserInfo) {
  return makeAction(reducers, 'CHANGE_FOCUS_MODE_USER', { user });
}

function setFilter(filterName: FilterKey, filterOption: FilterOption) {
  return (dispatch: Dispatch, getState: () => { filters: State }) => {
    // If there is a filter conflict with focusFilters, deactivate focus
    // mode to prevent unintended collisions and let the new filter value
    // take precedence.
    if (getState().filters.focusFilters?.[filterName]) {
      dispatch(makeAction(reducers, 'SET_FOCUS_MODE', { active: false }));
    }
    dispatch(makeAction(reducers, 'SET_FILTER', { filterName, filterOption }));
  };
}

/**
 * Set the query used to filter displayed annotations.
 */
function setFilterQuery(query: string) {
  return makeAction(reducers, 'SET_FILTER_QUERY', { query });
}

/**
 * Toggle whether a (user-)focus mode is applied, either inverting the
 * current active state or setting it to a target `active` state, if provided.
 *
 * @param active - Optional `active` state for focus mode
 */
function toggleFocusMode(active?: boolean) {
  return makeAction(reducers, 'SET_FOCUS_MODE', { active });
}

// Selectors

function filterQuery(state: State) {
  return state.query;
}

/**
 * Summary of focus state
 */
const focusState = createSelector(
  (state: State) => state.focusActive,
  (state: State) => state.focusFilters,
  (focusActive, focusFilters): FocusState => {
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
 */
const getFilters = createSelector(
  (state: State) => state.filters,
  (state: State) => state.focusActive,
  (state: State) => state.focusFilters,
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
function getFilter(state: State, filterName: FilterKey) {
  const filters = getFilters(state);
  return filters[filterName];
}

/**
 * Retrieve the (string) values of all currently-applied filters.
 */
const getFilterValues = createSelector(
  (state: State) => getFilters(state),
  allFilters => {
    const filterValues: Record<string, string> = {};
    for (const [key, options] of Object.entries(allFilters)) {
      if (options) {
        filterValues[key] = options.value;
      }
    }
    return filterValues;
  }
);

function getFocusFilters(state: State) {
  return state.focusFilters;
}

/**
 * Are there currently any active (applied) filters?
 */
function hasAppliedFilter(state: State) {
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
