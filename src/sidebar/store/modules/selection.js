/**
 * This module handles the state affecting the visibility and presence of
 * annotations and threads in the UI.
 */

/**
 * @typedef {import('../../../types/api').Annotation} Annotation
 */

/**
 * @typedef ThreadState
 * @prop {Annotation[]} annotations
 * @prop {Object} selection
 *   @prop {Object<string,boolean>} selection.expanded
 *   @prop {string|null} selection.filterQuery
 *   @prop {Object<string,string>} selection.filters
 *   @prop {string[]} selection.forcedVisible
 *   @prop {string[]} selection.selected
 *   @prop {string} selection.sortKey
 *   @prop {'annotation'|'note'|'orphan'} selection.selectedTab
 * @prop {string} route
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
  // once root-thread-building is fully updated: the decision of whether
  // selection trumps any query is not one for the store to make
  if (settings.annotations && !settings.query) {
    selection[settings.annotations] = true;
  }
  return selection;
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

/**
 * Return state object representing a reset selection. This
 * resets user-set filters (but leaves focus mode intact)
 */
const resetSelection = () => {
  return {
    forcedVisible: {},
    selected: {},
  };
};

const update = {
  CLEAR_SELECTION: function () {
    return resetSelection();
  },

  SELECT_ANNOTATIONS: function (state, action) {
    return { selected: action.selection };
  },

  SELECT_TAB: function (state, action) {
    return setTab(action.tab, state.selectedTab);
  },

  SET_EXPANDED: function (state, action) {
    const newExpanded = { ...state.expanded };
    newExpanded[action.id] = action.expanded;
    return { expanded: newExpanded };
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

  /** Actions defined in other modules */

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

  CHANGE_FOCUS_MODE_USER: function () {
    return resetSelection();
  },

  SET_FILTER_QUERY: function () {
    return { ...resetSelection(), expanded: {} };
  },

  SET_FOCUS_MODE: function () {
    return resetSelection();
  },

  REMOVE_ANNOTATIONS: function (state, action) {
    let newTab = state.selectedTab;
    // If the orphans tab is selected but no remaining annotations are orphans,
    // switch back to annotations tab
    if (
      newTab === uiConstants.TAB_ORPHANS &&
      countIf(action.remainingAnnotations, metadata.isOrphan) === 0
    ) {
      newTab = uiConstants.TAB_ANNOTATIONS;
    }

    const removeAnns = collection => {
      action.annotationsToRemove.forEach(annotation => {
        if (annotation.id) {
          delete collection[annotation.id];
        }
        if (annotation.$tag) {
          delete collection[annotation.$tag];
        }
      });
      return collection;
    };
    return {
      ...setTab(newTab, state.selectedTab),
      expanded: removeAnns({ ...state.expanded }),
      forcedVisible: removeAnns({ ...state.forcedVisible }),
      selected: removeAnns({ ...state.selected }),
    };
  },
};

const actions = util.actionTypes(update);

/* Action Creators */

/**
 * Clear all selected annotations and filters. This will leave user-focus
 * alone, however.
 */
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
  return dispatch => {
    dispatch({ type: actions.CLEAR_SELECTION });
    dispatch({
      type: actions.SELECT_ANNOTATIONS,
      selection: toTrueMap(ids),
    });
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
  return state.expanded;
}

/**
 * @type {(state: any) => string[]}
 */
const forcedVisibleAnnotations = createSelector(
  state => state.forcedVisible,
  forcedVisible => trueKeys(forcedVisible)
);

/**
 * Returns the annotation ID of the first annotation in the selection that is
 * selected (`true`) or `null` if there are none.
 *
 * @type {(state: any) => string|null}
 */
const getFirstSelectedAnnotationId = createSelector(
  state => state.selected,
  selection => {
    const selectedIds = trueKeys(selection);
    return selectedIds.length ? selectedIds[0] : null;
  }
);

/**
 * Are any annotations currently selected?
 *
 * @type {(state: any) => boolean}
 */
const hasSelectedAnnotations = createSelector(
  state => state.selected,
  selection => trueKeys(selection).length > 0
);

/**
 * @type {(state: any) => string[]}
 */
const selectedAnnotations = createSelector(
  state => state.selected,
  selection => trueKeys(selection)
);

/**
 * Return the currently-selected tab
 *
 * @return {'annotation'|'note'|'orphan'}
 */
function selectedTab(state) {
  return state.selectedTab;
}

/**
 * Retrieve the current sort option key
 *
 * @return {string}
 */
function sortKey(state) {
  return state.sortKey;
}

/**
 * Retrieve applicable sort options for the currently-selected tab.
 *
 * @return {string[]}
 */
function sortKeys(state) {
  const sortKeysForTab = ['Newest', 'Oldest'];
  if (state.selectedTab !== uiConstants.TAB_NOTES) {
    // Location is inapplicable to Notes tab
    sortKeysForTab.push('Location');
  }
  return sortKeysForTab;
}

/* Selectors that take root state */

/**
 * Retrieve state needed to calculate the root thread
 *
 * TODO: Refactor
 *  - Remove route entirely and make that logic the responsibility of a caller
 *  - Remove all filter-related properties. Those should come from `filterState`
 *  - Likely remove `annotations` as well
 *  - Likely rename this to `selectionState`, and it may not need to be a
 *    `rootSelector`
 *
 * @type {(rootState: any) => ThreadState}
 */
const threadState = createSelector(
  rootState => rootState.annotations.annotations,
  rootState => rootState.route.name,
  rootState => rootState.selection,
  rootState => rootState.filters,
  (annotations, routeName, selection, filters) => {
    const setFilters = /** @type {Object.<string,string>} */ ({});
    // TODO FIXME
    const userFilter = filters.focus.active && filters.focus.user.filter;
    if (userFilter) {
      setFilters.user = userFilter;
    }
    // TODO remove filterQuery, filters from this returned object
    const selectionState = {
      expanded: expandedMap(selection),
      filterQuery: filters.query,
      filters: setFilters,
      forcedVisible: forcedVisibleAnnotations(selection),
      selected: selectedAnnotations(selection),
      sortKey: sortKey(selection),
      selectedTab: selectedTab(selection),
    };
    return { annotations, route: routeName, selection: selectionState };
  }
);

/**
 * Is any sort of filtering currently applied to the list of annotations? This
 * includes a search query, but also if annotations are selected or a user
 * is focused.
 *
 * TODO: FIXME/refactor — this may need to be split into two selectors across
 *   two store modules that calling code needs to combine. It also may be
 *   logic that doesn't belong at all at the store level
 *
 * @type {(state: any) => boolean}
 */
const hasAppliedFilter = createSelector(
  rootState => rootState.selection,
  rootState => rootState.filters,
  (selection, filters) => {
    return (
      !!filters.query ||
      filters.focus.active ||
      hasSelectedAnnotations(selection)
    );
  }
);

/**
 * @typedef SelectionStore
 *
 * // Actions
 * @prop {typeof clearSelection} clearSelection
 * @prop {typeof selectAnnotations} selectAnnotations
 * @prop {typeof selectTab} selectTab
 * @prop {typeof setExpanded} setExpanded
 * @prop {typeof setForcedVisible} setForcedVisible
 * @prop {typeof setSortKey} setSortKey
 * @prop {typeof toggleSelectedAnnotations} toggleSelectedAnnotations
 *
 * // Selectors
 * @prop {() => Object<string,boolean>} expandedMap
 * @prop {() => string[]} forcedVisibleAnnotations
 * @prop {() => string|null} getFirstSelectedAnnotationId
 * @prop {() => boolean} hasSelectedAnnotations
 * @prop {() => string[]} selectedAnnotations
 * @prop {() => string} selectedTab
 * @prop {() => string} sortKey
 * @prop {() => string[]} sortKeys
 *
 * // Root Selectors
 * @prop {() => boolean} hasAppliedFilter
 * @prop {() => ThreadState} threadState
 *
 */

export default {
  init: init,
  namespace: 'selection',
  update: update,

  actions: {
    clearSelection,
    selectAnnotations,
    selectTab,
    setExpanded,
    setForcedVisible,
    setSortKey,
    toggleSelectedAnnotations,
  },

  selectors: {
    expandedMap,
    forcedVisibleAnnotations,
    getFirstSelectedAnnotationId,
    hasSelectedAnnotations,
    selectedAnnotations,
    selectedTab,
    sortKey,
    sortKeys,
  },

  rootSelectors: {
    hasAppliedFilter,
    threadState,
  },
};
