/**
 * This module handles the state affecting the visibility and presence of
 * annotations and threads in the UI.
 */

/**
 * @typedef User
 * @property {string} userid - Unique user's id
 * @property {string} displayName - User's display name
 */

import { createSelector } from 'reselect';

import uiConstants from '../../ui-constants';
import * as metadata from '../../util/annotation-metadata';
import { countIf } from '../../util/array';
import * as util from '../util';

/**
 * Default starting tab.
 */
const TAB_DEFAULT = uiConstants.TAB_ANNOTATIONS;

/**
 * Default sort keys for each tab.
 */
const TAB_SORTKEY_DEFAULT = {};
TAB_SORTKEY_DEFAULT[uiConstants.TAB_ANNOTATIONS] = 'Location';
TAB_SORTKEY_DEFAULT[uiConstants.TAB_NOTES] = 'Oldest';
TAB_SORTKEY_DEFAULT[uiConstants.TAB_ORPHANS] = 'Location';

/**
 * Available sort keys for each tab.
 */
const TAB_SORTKEYS_AVAILABLE = {};
TAB_SORTKEYS_AVAILABLE[uiConstants.TAB_ANNOTATIONS] = [
  'Newest',
  'Oldest',
  'Location',
];
TAB_SORTKEYS_AVAILABLE[uiConstants.TAB_NOTES] = ['Newest', 'Oldest'];
TAB_SORTKEYS_AVAILABLE[uiConstants.TAB_ORPHANS] = [
  'Newest',
  'Oldest',
  'Location',
];

/**
 * Utility function that returns all of the properties of an object whose
 * value is `true`.
 *
 * @param {Object} obj
 * @return {any[]}
 */
function truthyKeys(obj) {
  return Object.keys(obj).filter(key => obj[key] === true);
}

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

const setTab = (selectedTab, newTab) => {
  // Do nothing if the "new tab" is not a valid tab.
  if (
    [
      uiConstants.TAB_ANNOTATIONS,
      uiConstants.TAB_NOTES,
      uiConstants.TAB_ORPHANS,
    ].indexOf(newTab) === -1
  ) {
    return {};
  }
  // Shortcut if the tab is already correct, to avoid resetting the sortKey
  // unnecessarily.
  if (selectedTab === newTab) {
    return {};
  }
  return {
    selectedTab: newTab,
    sortKey: TAB_SORTKEY_DEFAULT[newTab],
    sortKeysAvailable: TAB_SORTKEYS_AVAILABLE[newTab],
  };
};

function init(settings) {
  return {
    /**
     * The following objects map annotation identifiers to a boolean
     * (typically `true`). They are objects (i.e. instead of Arrays) for two
     * reasons:
     * - Allows explicit setting of `false`
     * - Prevents duplicate entries for a single annotation
     */

    // A set of annotations that are currently "focused" — hovered over in
    // the UI, e.g.
    focused: {},

    // A map of annotation ids to their selection state (true/false)
    selected: initialSelection(settings),

    // Map of annotation IDs to expanded/collapsed state. For annotations not
    // present in the map, the default state is used which depends on whether
    // the annotation is a top-level annotation or a reply, whether it is
    // selected and whether it matches the current filter.
    expanded: initialSelection(settings) || {},

    // Set of IDs of annotations that have been explicitly shown
    // by the user even if they do not match the current search filter
    forcedVisible: {},

    // IDs of annotations that should be highlighted
    highlighted: [],

    filterQuery: settings.query || null,

    selectedTab: TAB_DEFAULT,

    focusMode: {
      enabled: settings.hasOwnProperty('focus'),
      focused: true,
      // Copy over the focus confg from settings object
      config: { ...(settings.focus ? settings.focus : {}) },
    },

    // Key by which annotations are currently sorted.
    sortKey: TAB_SORTKEY_DEFAULT[TAB_DEFAULT],
    // Keys by which annotations can be sorted.
    sortKeysAvailable: TAB_SORTKEYS_AVAILABLE[TAB_DEFAULT],
  };
}

const update = {
  CLEAR_SELECTION: function (state) {
    let selectedTab = state.selectedTab;
    if (selectedTab === uiConstants.TAB_ORPHANS) {
      selectedTab = uiConstants.TAB_ANNOTATIONS;
    }
    const tabSettings = setTab(state.selectedTab, selectedTab);
    return {
      filterQuery: null,
      forcedVisible: {},
      selected: {},
      ...tabSettings,
    };
  },

  CLEAR_SELECTED_ANNOTATIONS: function () {
    return { filterQuery: null, selected: {} };
  },

  SELECT_ANNOTATIONS: function (state, action) {
    return { selected: action.selection };
  },

  TOGGLE_SELECTED_ANNOTATIONS: function (state, action) {
    const selection = { ...state.selected };
    action.toggleIds.forEach(id => {
      selection[id] = !selection[id];
    });
    return { selected: selection };
  },

  FOCUS_ANNOTATIONS: function (state, action) {
    const focused = {};
    action.focusedTags.forEach(tag => (focused[tag] = true));
    return { focused };
  },

  SET_FOCUS_MODE_FOCUSED: function (state, action) {
    return {
      focusMode: {
        ...state.focusMode,
        focused: action.focused,
      },
    };
  },

  CHANGE_FOCUS_MODE_USER: function (state, action) {
    if (action.user.username === undefined) {
      return {
        focusMode: {
          ...state.focusMode,
          enabled: false,
          focused: false,
        },
      };
    } else {
      return {
        focusMode: {
          ...state.focusMode,
          enabled: true,
          focused: true,
          config: {
            user: { ...action.user },
          },
        },
      };
    }
  },

  SET_FORCED_VISIBLE: function (state, action) {
    return {
      forcedVisible: { ...state.forcedVisible, [action.id]: action.visible },
    };
  },

  SET_EXPANDED: function (state, action) {
    return { expanded: action.expanded };
  },

  HIGHLIGHT_ANNOTATIONS: function (state, action) {
    return { highlighted: action.highlighted };
  },

  SELECT_TAB: function (state, action) {
    return setTab(state.selectedTab, action.tab);
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
      return { selectedTab: uiConstants.TAB_NOTES };
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
    let selectedTab = state.selectedTab;
    if (
      selectedTab === uiConstants.TAB_ORPHANS &&
      countIf(action.remainingAnnotations, metadata.isOrphan) === 0
    ) {
      selectedTab = uiConstants.TAB_ANNOTATIONS;
    }
    return {
      selected: selection,
      selectedTab: selectedTab,
    };
  },

  SET_FILTER_QUERY: function (state, action) {
    return {
      filterQuery: action.query,
      forcedVisible: {},
      expanded: {},
    };
  },

  SET_SORT_KEY: function (state, action) {
    return { sortKey: action.key };
  },
};

const actions = util.actionTypes(update);

/**
 * Set the currently selected annotation IDs. Will replace the entire
 * selection. All provided annotation ids will be set to `true` in the selection.
 *
 * @param {string[]} ids - Idenfiers of annotations to select
 */
function selectAnnotations(ids) {
  const selection = {};
  ids.forEach(id => (selection[id] = true));
  return {
    type: actions.SELECT_ANNOTATIONS,
    selection,
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

/**
 * Replace the current set of focused annotations with the annotations
 * identified by `tags`
 *
 * @param {string[]} tags - Identifiers of annotations to focus
 */
function focusAnnotations(tags) {
  return {
    type: actions.FOCUS_ANNOTATIONS,
    focusedTags: tags,
  };
}

function setCollapsed(id, collapsed) {
  // FIXME: This should be converted to a plain action and accessing the state
  // should happen in the update() function
  return function (dispatch, getState) {
    const expanded = Object.assign({}, getState().selection.expanded);
    expanded[id] = !collapsed;
    dispatch({
      type: actions.SET_EXPANDED,
      expanded: expanded,
    });
  };
}

/**
 * Highlight annotations with the given `ids`.
 *
 * This is used to indicate the specific annotation in a thread that was
 * linked to for example.
 */
function highlightAnnotations(ids) {
  return {
    type: actions.HIGHLIGHT_ANNOTATIONS,
    highlighted: ids,
  };
}

/** Set the type annotations to be displayed. */
function selectTab(type) {
  return {
    type: actions.SELECT_TAB,
    tab: type,
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
 * Set the focused to only show annotations matching the current focus mode.
 */
function setFocusModeFocused(focused) {
  return {
    type: actions.SET_FOCUS_MODE_FOCUSED,
    focused,
  };
}

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

/** Sets the sort key for the annotation list. */
function setSortKey(key) {
  return {
    type: actions.SET_SORT_KEY,
    key: key,
  };
}

/* Selectors */

function focusedAnnotations(state) {
  return truthyKeys(state.selection.focused);
}

function forcedVisibleAnnotations(state) {
  return truthyKeys(state.selection.forcedVisible);
}

/** Is the annotation referenced by `$tag` currently focused? */
function isAnnotationFocused(state, $tag) {
  return state.selection.focused[$tag] === true;
}

/**
 * Return true if any annotations are currently selected.
 */
const hasSelectedAnnotations = createSelector(
  state => state.selection.selected,
  selection => truthyKeys(selection).length > 0
);

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
 * Returns the annotation ID of the first annotation in the selection that is
 * selected (`true`).
 *
 * @return {string|null}
 */
const getFirstSelectedAnnotationId = createSelector(
  state => state.selection.selected,
  selection => {
    const selectedIds = truthyKeys(selection);
    return selectedIds.length ? selectedIds[0] : null;
  }
);

function expandedThreads(state) {
  return state.selection.expanded;
}

function filterQuery(state) {
  return state.selection.filterQuery;
}

/**
 * Do the config settings indicate that the client should be in a focused mode?
 *
 * @return {boolean}
 */
function focusModeEnabled(state) {
  return state.selection.focusMode.enabled;
}

/**
 * Is a focus mode enabled, and is it presently applied?
 *
 * @return {boolean}
 */
function focusModeFocused(state) {
  return focusModeEnabled(state) && state.selection.focusMode.focused;
}

/**
 * Returns the `userid` for a focused user or `null` if no focused user.
 *
 * @return {string|null}
 */
function focusModeUserId(state) {
  if (state.selection.focusMode.config.user) {
    if (state.selection.focusMode.config.user.userid) {
      return state.selection.focusMode.config.user.userid;
    }
    if (state.selection.focusMode.config.user.username) {
      // remove once LMS no longer sends username in RPC or config
      // https://github.com/hypothesis/client/issues/1516
      return state.selection.focusMode.config.user.username;
    }
  }
  return null;
}

/**
 * Does the configured focus mode include user info, i.e. are we focusing on a
 * user?
 *
 * @return {boolean}
 */
function focusModeHasUser(state) {
  return focusModeEnabled(state) && !!focusModeUserId(state);
}

/**
 * Returns the display name for a user or the userid
 * if display name is not present. If both are missing
 * then this returns an empty string.
 *
 * @return {string}
 */
function focusModeUserPrettyName(state) {
  const user = state.selection.focusMode.config.user;
  if (!user) {
    return '';
  } else if (user.displayName) {
    return user.displayName;
  } else if (user.userid) {
    return user.userid;
  } else if (user.username) {
    // remove once LMS no longer sends `username` in RPC
    return user.username;
  } else {
    return '';
  }
}

/**
 * Is any sort of filtering currently applied to the list of annotations? This
 * includes a search query, but also if annotations are selected or a user
 * is focused.
 *
 * @return {boolean}
 */
const hasAppliedFilter = createSelector(
  filterQuery,
  focusModeFocused,
  hasSelectedAnnotations,
  (filterQuery, focusModeFocused, hasSelectedAnnotations) =>
    !!filterQuery || focusModeFocused || hasSelectedAnnotations
);

const selectedAnnotations = createSelector(
  state => state.selection.selected,
  selection => truthyKeys(selection)
);

export default {
  init: init,
  namespace: 'selection',
  update: update,

  actions: {
    clearSelectedAnnotations,
    clearSelection,
    focusAnnotations,
    highlightAnnotations,
    selectAnnotations,
    selectTab,
    setCollapsed,
    setFilterQuery,
    setFocusModeFocused,
    changeFocusModeUser,
    setForcedVisible,
    setSortKey,
    toggleSelectedAnnotations,
  },

  selectors: {
    expandedThreads,
    filterQuery,
    focusModeFocused,
    focusModeEnabled,
    focusModeHasUser,
    focusModeUserId,
    focusModeUserPrettyName,
    focusedAnnotations,
    forcedVisibleAnnotations,
    isAnnotationFocused,
    getFirstSelectedAnnotationId,
    hasAppliedFilter,
    hasSelectedAnnotations,
    selectedAnnotations,
  },
};
