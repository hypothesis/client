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
 * Supported filters. This should be a subset of the filters supported by the
 * `filterAnnotations` function that filters annotations in the sidebar.
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
 * State related to filtering of annotations in the UI.
 *
 * There are several layers of filters:
 *
 * - Filter/search queries entered by the user via the search UI
 *
 * - Focus filters which are filters supplied in the Hypothesis configuration.
 *   This is for contexts where there is some default filter that should be
 *   applied when the client loads. For example when grading a student's work,
 *   the client can be configured to start up showing only that user's annotations.
 *
 * - Filters/facets set via UI controls other than the search box.
 *   For example the Notebook has a user selection dropdown.
 */
export type State = {
  /** Facet filters (eg. selected user) */
  filters: Filters;

  /** Active filter/search query. */
  query: string | null;

  /** Configuration for focus filters imported from client configuration. */
  focusFilters: Filters;

  /** Which filters from `focusFilters` are currently active. */
  focusActive: Set<FilterKey>;
};

function initialState(settings: SidebarSettings): State {
  const focusConfig = settings.focus || {};
  const focusFilters = focusFiltersFromConfig(focusConfig);

  return {
    filters: {},
    focusActive: new Set(Object.keys(focusFilters) as FilterKey[]),
    focusFilters,
    query: settings.query || null,
  };
}

/**
 * Map focus filter configuration from settings to `focusFilters` state.
 */
function focusFiltersFromConfig(focusConfig: FocusConfig): Filters {
  const filters: Filters = {};

  const user = focusConfig.user;
  const userFilterValue = user?.username || user?.userid || '';

  if (user && userFilterValue) {
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
    const focusActive = new Set(state.focusActive);
    if (user !== undefined) {
      focusActive.add('user');
    } else {
      focusActive.delete('user');
    }
    return {
      focusActive,
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

  SET_FOCUS_MODE(state: State, action: { key?: FilterKey; active?: boolean }) {
    let focusActive = new Set(state.focusActive);
    if (action.key !== undefined) {
      // Toggle specific filter.
      const active = action.active ?? !focusActive.has(action.key);
      if (active) {
        focusActive.add(action.key);
      } else {
        focusActive.delete(action.key);
      }
    } else {
      // Toggle all configured filters.
      const active = action.active ?? focusActive.size === 0;
      if (active) {
        focusActive = new Set(Object.keys(state.focusFilters) as FilterKey[]);
      } else {
        focusActive = new Set();
      }
    }
    return {
      focusActive,
    };
  },

  // Actions defined in other modules

  CLEAR_SELECTION() {
    return {
      filters: {},
      focusActive: new Set<FilterKey>(),
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
      dispatch(
        makeAction(reducers, 'SET_FOCUS_MODE', {
          active: false,
          key: filterName,
        }),
      );
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

export type ToggleFocusModeArgs = {
  /** Whether to activate or deactivate the focus mode, or toggle it (if undefined) */
  active?: boolean;

  /** Which focus filter to toggle. If undefined, all configured focus modes are toggled. */
  key?: FilterKey;
};

/**
 * Toggle whether a given focus mode is applied.
 */
function toggleFocusMode({ active, key }: ToggleFocusModeArgs = {}) {
  return makeAction(reducers, 'SET_FOCUS_MODE', { active, key });
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
      active: focusActive.size > 0,
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
    const mergedFilters: Filters = {};

    // Add focus filters which are configured and active.
    for (const key of focusActive) {
      const focusFilter = focusFilters[key];

      // nb. It _should_ always be the case that focus filters marked as active
      // have a filter configuration in `focusFilters`.
      if (focusFilter) {
        mergedFilters[key] = focusFilter;
      }
    }

    // Add other filters.
    Object.assign(mergedFilters, filters);

    return mergedFilters;
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
    const filterValues: Partial<Record<FilterKey, string>> = {};
    for (const [key, options] of Object.entries(allFilters)) {
      if (options) {
        filterValues[key as FilterKey] = options.value;
      }
    }
    return filterValues;
  },
);

function getFocusFilters(state: State): Filters {
  return state.focusFilters;
}

/** Return the set of active focus filters. */
function getFocusActive(state: State): Set<FilterKey> {
  return state.focusActive;
}

/**
 * Are there currently any active (applied) filters?
 */
function hasAppliedFilter(state: State) {
  const filters = getFilters(state);
  return Boolean(state.query || Object.keys(filters).length);
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
    getFocusActive,
    getFocusFilters,
    hasAppliedFilter,
  },
});
