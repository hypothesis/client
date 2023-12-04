import type { Dispatch } from 'redux';
import { createSelector } from 'reselect';

import type { FocusConfig, SidebarSettings } from '../../../types/config';
import type { FocusUserInfo } from '../../../types/rpc';
import { createStoreModule, makeAction } from '../create-store';

export type FilterOption = {
  /** The machine-readable value of the option */
  value: string;
  /** The human-facing "pretty" value of the option */
  display: string;
};

/**
 * Valid/recognized filters
 */
export type FilterKey = 'cfi' | 'page' | 'user';

export type Filters = Partial<Record<FilterKey, FilterOption | undefined>>;

/**
 * Summary of the state of focus filters.
 */
export type FocusState = {
  active: boolean;
  configured: boolean;

  /** Display name of the user that is focused. */
  displayName?: string;

  /** Page range that is focused. */
  pageRange?: string;

  /**
   * Description of content this is focused.
   *
   * This is used in ebooks if the content is e.g. a chapter rather than page
   * range.
   */
  contentRange?: string;
};

/**
 * State pertaining to the filtering of annotations in the UI.
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
 */
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
 * Return true if a focus filter configuration is valid.
 */
function isValidFocusConfig(focusConfig: FocusConfig): boolean {
  if (focusConfig.user) {
    return Boolean(focusConfig.user.username || focusConfig.user.userid);
  }
  if (focusConfig.cfi?.range || focusConfig.pages) {
    return true;
  }
  return false;
}

/**
 * Compose an object of keyed `FilterOption`s from the given `focusConfig`.
 */
function focusFiltersFromConfig(focusConfig: FocusConfig): Filters {
  if (!isValidFocusConfig(focusConfig)) {
    return {};
  }

  const filters: Filters = {};

  const user = focusConfig.user;
  if (user) {
    const userFilterValue = user.username || user.userid || '';
    filters.user = {
      value: userFilterValue,
      display: user.displayName || userFilterValue,
    };
  }

  if (focusConfig.pages) {
    filters.page = {
      value: focusConfig.pages,
      display: focusConfig.pages,
    };
  }

  if (focusConfig.cfi) {
    filters.cfi = {
      value: focusConfig.cfi.range,
      display: focusConfig.cfi.label,
    };
  }

  return filters;
}

const reducers = {
  CHANGE_FOCUS_MODE_USER(state: State, action: { user: FocusUserInfo }) {
    const { user } = focusFiltersFromConfig({ user: action.user });
    return {
      focusActive: isValidFocusConfig({ user: action.user }),
      focusFilters: {
        ...state.focusFilters,
        user,
      },
    };
  },

  SET_FILTER(
    state: State,
    action: { filterName: FilterKey; filterOption: FilterOption },
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
      // Check for filter with non-empty value.
      configured: Object.values(focusFilters ?? {}).some(
        val => typeof val !== 'undefined',
      ),
      displayName: focusFilters?.user?.display ?? '',
      contentRange: focusFilters?.cfi?.display,
      pageRange: focusFilters?.page?.display,
    };
  },
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
  },
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
  },
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
