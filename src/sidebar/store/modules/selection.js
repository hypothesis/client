/**
 * This module handles the state affecting the visibility and presence of
 * annotations and threads in the UI.
 */

/**
 * @typedef User
 * @prop {string} [userid]
 * @prop {string} [username]
 * @prop {string} displayName - User's display name
 */

/**
 * @typedef FocusedUser
 * @prop {string} filter - The identifier to use for filtering annotations
 *           derived from either a userId or a username. This may take the
 *           form of a username, e.g. 'oakbucket', or a userid
 * @prop {string} displayName
 */

/**
 * @typedef FocusState
 * @prop {boolean} configured - Focus config contains valid `user` and
 *           is good to go
 * @prop {boolean} active - Focus mode is currently applied
 * @prop {FocusedUser} [user] - User to focus on (filter annotations for)
 */

/**
 * @typedef FocusConfig
 * @prop {User} user
 */

import { createSelector } from 'reselect';

import uiConstants from '../../ui-constants';
import * as metadata from '../../util/annotation-metadata';
import { countIf, trueKeys, toTrueMap } from '../../util/collections';
import * as util from '../util';

/**
 * Default sort keys for each tab.
 */
const TAB_SORTKEY_DEFAULT = {
  [uiConstants.TAB_ANNOTATIONS]: 'Location',
  [uiConstants.TAB_NOTES]: 'Oldest',
  [uiConstants.TAB_ORPHANS]: 'Location',
};

function initialSelection(settings) {
  const selection = {};
  // TODO: Do not take into account existence of `settings.query` here
  // once `RootThreadService` is fully updated: the decision of whether
  // selection trumps any query is not one for the store to make
  if (settings.annotations && !settings.query) {
    selection[settings.annotations] = true;
  }
  return selection;
}

/**
 * Configure (user-)focused mode. User-focus mode may be set in one of two
 * ways:
 * - A `focus` object containing a valid `user` object is present in the
 *   application's `settings` object during initialization time
 * - A `user` object is given to the `changeFocusedUser` action (this
 *   is implemented via an RPC method call)
 * For focus mode to be considered configured, it must have a valid `user`.
 * A successfully-configured focus mode will be set to `active` immediately
 * and may be toggled via `toggleFocusMode`.
 *
 * @param {FocusConfig} focusConfig
 * @return {FocusState}
 */
function setFocus(focusConfig) {
  const focusDefaultState = {
    configured: false,
    active: false,
  };

  // To be able to apply a focused mode, a `user` object must be present,
  // and that user object must have either a `username` or a `userid`
  const focusUser = focusConfig.user || {};
  const userFilter = focusUser.username || focusUser.userid;

  // If that requirement is not met, we can't configure/activate focus mode
  if (!userFilter) {
    return focusDefaultState;
  }

  return {
    configured: true,
    active: true, // Activate valid focus mode immediately
    user: {
      filter: userFilter,
      displayName: focusUser.displayName || userFilter || '',
    },
  };
}

function init(settings) {
  return {
    /**
     * The following objects map annotation identifiers to a boolean
     * (typically `true`). They are objects (i.e. instead of Arrays) for two
     * reasons:
     * - Allows explicit setting of `false`
     * - Prevents duplicate entries for a single annotation
     */

    // A set of annotations that are currently "selected" by the user —
    // these will supersede other filters/selections
    selected: initialSelection(settings),

    // Explicitly-expanded or -collapsed annotations (threads). A collapsed
    // annotation thread will not show its replies; an expanded thread will
    // show its replies. Note that there are other factors affecting
    // collapsed states, e.g., top-level threads are collapsed by default
    // until explicitly expanded.
    expanded: initialSelection(settings) || {},

    // Set of annotations that have been "forced" visible by the user
    // (e.g. by clicking on "Show x more" button) even though they may not
    // match the currently-applied filters
    forcedVisible: {},

    filterQuery: settings.query || null,
    focusMode: setFocus(settings.focus || /** @type FocusConfig */ ({})),

    selectedTab: uiConstants.TAB_ANNOTATIONS,
    // Key by which annotations are currently sorted.
    sortKey: TAB_SORTKEY_DEFAULT[uiConstants.TAB_ANNOTATIONS],
  };
}

const setTab = (newTab, oldTab) => {
  // Do nothing if the "new tab" is not a valid tab or is the same as the
  // tab already selected. This will avoid resetting the `sortKey`, too.
  if (!uiConstants.TABS.includes(newTab) || oldTab === newTab) {
    return {};
  }
  return {
    selectedTab: newTab,
    sortKey: TAB_SORTKEY_DEFAULT[newTab],
  };
};

const update = {
  CHANGE_FOCUS_MODE_USER: function (state, action) {
    return {
      focusMode: setFocus({ user: action.user }),
    };
  },

  CLEAR_SELECTED_ANNOTATIONS: function () {
    return { filterQuery: null, selected: {} };
  },

  CLEAR_SELECTION: function () {
    return {
      filterQuery: null,
      forcedVisible: {},
      selected: {},
    };
  },

  SELECT_ANNOTATIONS: function (state, action) {
    return { selected: action.selection };
  },

  SELECT_TAB: function (state, action) {
    return setTab(action.tab, state.selectedTab);
  },

  SET_EXPANDED: function (state, action) {
    return { expanded: { ...state.expanded, [action.id]: action.expanded } };
  },

  SET_FILTER_QUERY: function (state, action) {
    return {
      filterQuery: action.query,
      forcedVisible: {},
      expanded: {},
    };
  },

  SET_FOCUS_MODE: function (state, action) {
    const active =
      typeof action.active !== 'undefined'
        ? action.active
        : !state.focusMode.active;
    return {
      focusMode: {
        ...state.focusMode,
        active,
      },
    };
  },

  SET_FORCED_VISIBLE: function (state, action) {
    return {
      forcedVisible: { ...state.forcedVisible, [action.id]: action.visible },
    };
  },

  SET_SORT_KEY: function (state, action) {
    return { sortKey: action.key };
  },

  TOGGLE_SELECTED_ANNOTATIONS: function (state, action) {
    const selection = { ...state.selected };
    action.toggleIds.forEach(id => {
      selection[id] = !selection[id];
    });
    return { selected: selection };
  },

  /**
   * Automatically select the Page Notes tab, for convenience, if all of the
   * top-level annotations in `action.annotations` are Page Notes and the
   * previous annotation count was 0 (i.e. collection empty).
   */
  ADD_ANNOTATIONS(state, action) {
    const topLevelAnnotations = action.annotations.filter(
      annotation => !metadata.isReply(annotation)
    );
    const noteCount = countIf(action.annotations, metadata.isPageNote);

    const haveOnlyPageNotes = noteCount === topLevelAnnotations.length;
    if (action.currentAnnotationCount === 0 && haveOnlyPageNotes) {
      return setTab(uiConstants.TAB_NOTES, state.selectedTab);
    }
    return {};
  },

  REMOVE_ANNOTATIONS: function (state, action) {
    const selection = { ...state.selected };
    action.annotationsToRemove.forEach(annotation => {
      if (annotation.id) {
        delete selection[annotation.id];
      }
    });
    let newTab = state.selectedTab;
    // If the orphans tab is selected but no remaining annotations are orphans,
    // switch back to annotations tab
    if (
      newTab === uiConstants.TAB_ORPHANS &&
      countIf(action.remainingAnnotations, metadata.isOrphan) === 0
    ) {
      newTab = uiConstants.TAB_ANNOTATIONS;
    }
    return {
      ...setTab(newTab, state.selectedTab),
      selected: selection,
    };
  },
};

const actions = util.actionTypes(update);

/* Action Creators */

/**
 * Clears any applied filters, changes the focused user and sets
 * focused enabled to `true`.
 *
 * @param {User} user - The user to focus on
 */
function changeFocusModeUser(user) {
  return function (dispatch) {
    dispatch({ type: actions.CLEAR_SELECTION });
    dispatch({ type: actions.CHANGE_FOCUS_MODE_USER, user });
  };
}

/** De-select all annotations. */
function clearSelectedAnnotations() {
  return { type: actions.CLEAR_SELECTED_ANNOTATIONS };
}

function clearSelection() {
  return {
    type: actions.CLEAR_SELECTION,
  };
}

/**
 * Set the currently selected annotation IDs. This will replace the current
 * selection. All provided annotation ids will be set to `true` in the selection.
 *
 * @param {string[]} ids - Identifiers of annotations to select
 */
function selectAnnotations(ids) {
  return {
    type: actions.SELECT_ANNOTATIONS,
    selection: toTrueMap(ids),
  };
}

/**
 * Set the currently-selected tab to `tabKey`.
 *
 * @param {'annotation'|'note'|'orphan'} tabKey
 */
function selectTab(tabKey) {
  return {
    type: actions.SELECT_TAB,
    tab: tabKey,
  };
}

/**
 * Set the expanded state for a single annotation/thread.
 *
 * @param {string} id - annotation (or thread) id
 * @param {boolean} expanded - `true` for expanded replies, `false` to collapse
 */
function setExpanded(id, expanded) {
  return {
    type: actions.SET_EXPANDED,
    id,
    expanded,
  };
}

/** Set the query used to filter displayed annotations. */
function setFilterQuery(query) {
  return {
    type: actions.SET_FILTER_QUERY,
    query: query,
  };
}

/**
 * A user may "force" an annotation to be visible, even if it would be otherwise
 * not be visible because of applied filters. Set the force-visibility for a
 * single annotation, without affecting other forced-visible annotations.
 *
 * @param {string} id
 * @param {boolean} visible - Should this annotation be visible, even if it
 *        conflicts with current filters?
 */
function setForcedVisible(id, visible) {
  return {
    type: actions.SET_FORCED_VISIBLE,
    id,
    visible,
  };
}

/** Sets the sort key for the annotation list. */
function setSortKey(key) {
  return {
    type: actions.SET_SORT_KEY,
    key: key,
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

/**
 * Toggle the selected state for the annotations in `toggledAnnotations`:
 * unselect any that are selected; select any that are unselected.
 *
 * @param {string[]} toggleIds - identifiers of annotations to toggle
 */
function toggleSelectedAnnotations(toggleIds) {
  return {
    type: actions.TOGGLE_SELECTED_ANNOTATIONS,
    toggleIds,
  };
}

/* Selectors */

/**
 * Retrieve map of expanded/collapsed annotations (threads)
 *
 * @return {Object<string,boolean>}
 */
function expandedMap(state) {
  return state.selection.expanded;
}

function filterQuery(state) {
  return state.selection.filterQuery;
}

/**
 * Is a focus mode currently applied?
 *
 * @return {boolean}
 */
function focusModeActive(state) {
  return state.selection.focusMode.active;
}

/**
 * Does the state have a configured focus mode? That is, does it have a valid
 * focus mode filter that could be applied (regardless of whether it is currently
 * active)?
 *
 * @return {boolean}
 */
function focusModeConfigured(state) {
  return state.selection.focusMode.configured;
}

/**
 * Returns the user identifier for a focused user or `null` if no focused user.
 *
 * @return {string|null}
 */
function focusModeUserFilter(state) {
  if (!focusModeActive(state)) {
    return null;
  }
  return state.selection.focusMode.user.filter;
}

/**
 * Returns the display name for a user or the userid
 * if display name is not present. If both are missing
 * then this returns an empty string.
 *
 * @return {string}
 */
function focusModeUserPrettyName(state) {
  if (!focusModeConfigured(state)) {
    return '';
  }
  return state.selection.focusMode.user.displayName;
}

const forcedVisibleAnnotations = createSelector(
  state => state.selection.forcedVisible,
  forcedVisible => trueKeys(forcedVisible)
);

/**
 * Returns the annotation ID of the first annotation in the selection that is
 * selected (`true`) or `null` if there are none.
 *
 * @return {string|null}
 */
const getFirstSelectedAnnotationId = createSelector(
  state => state.selection.selected,
  selection => {
    const selectedIds = trueKeys(selection);
    return selectedIds.length ? selectedIds[0] : null;
  }
);

/**
 * Are any annotations currently selected?
 *
 * @return {boolean}
 */
const hasSelectedAnnotations = createSelector(
  state => state.selection.selected,
  selection => trueKeys(selection).length > 0
);

const selectedAnnotations = createSelector(
  state => state.selection.selected,
  selection => trueKeys(selection)
);

/**
 * Is any sort of filtering currently applied to the list of annotations? This
 * includes a search query, but also if annotations are selected or a user
 * is focused.
 *
 * @return {boolean}
 */
const hasAppliedFilter = createSelector(
  filterQuery,
  focusModeActive,
  hasSelectedAnnotations,
  (filterQuery, focusModeActive, hasSelectedAnnotations) =>
    !!filterQuery || focusModeActive || hasSelectedAnnotations
);

/**
 * Retrieve applicable sort options for the currently-selected tab.
 *
 * @return {string[]}
 */
function sortKeys(state) {
  const sortKeysForTab = ['Newest', 'Oldest'];
  if (state.selection.selectedTab !== uiConstants.TAB_NOTES) {
    // Location is inapplicable to Notes tab
    sortKeysForTab.push('Location');
  }
  return sortKeysForTab;
}

export default {
  init: init,
  namespace: 'selection',
  update: update,

  actions: {
    changeFocusModeUser,
    clearSelectedAnnotations,
    clearSelection,
    selectAnnotations,
    selectTab,
    setExpanded,
    setFilterQuery,
    setForcedVisible,
    setSortKey,
    toggleFocusMode,
    toggleSelectedAnnotations,
  },

  selectors: {
    expandedMap,
    filterQuery,
    focusModeActive,
    focusModeConfigured,
    focusModeUserFilter,
    focusModeUserPrettyName,
    forcedVisibleAnnotations,
    getFirstSelectedAnnotationId,
    hasAppliedFilter,
    hasSelectedAnnotations,
    selectedAnnotations,
    sortKeys,
  },
};
