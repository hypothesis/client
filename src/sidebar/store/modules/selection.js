/**
 * This module handles state related to the current sort, search and filter
 * settings in the UI, including:
 *
 * - The set of annotations that are currently focused (hovered) or selected
 * - The selected tab
 * - The current sort order
 * - The current filter query
 */

'use strict';

const { createSelector } = require('reselect');
const immutable = require('seamless-immutable');

const arrayUtil = require('../../util/array-util');
const metadata = require('../../util/annotation-metadata');
const toSet = require('../../util/array-util').toSet;
const uiConstants = require('../../ui-constants');

const util = require('../util');

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

function initialSelection(settings) {
  const selection = {};
  if (settings.annotations && !settings.query) {
    selection[settings.annotations] = true;
  }
  return freeze(selection);
}

function freeze(selection) {
  if (Object.keys(selection).length) {
    return immutable(selection);
  } else {
    return null;
  }
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
    // Contains a map of annotation tag:true pairs.
    focusedAnnotationMap: null,

    // Contains a map of annotation id:true pairs.
    selectedAnnotationMap: initialSelection(settings),

    // Map of annotation IDs to expanded/collapsed state. For annotations not
    // present in the map, the default state is used which depends on whether
    // the annotation is a top-level annotation or a reply, whether it is
    // selected and whether it matches the current filter.
    expanded: initialSelection(settings) || {},

    // Set of IDs of annotations that have been explicitly shown
    // by the user even if they do not match the current search filter
    forceVisible: {},

    // IDs of annotations that should be highlighted
    highlighted: [],

    filterQuery: settings.query || null,

    selectedTab: TAB_DEFAULT,

    focusMode: {
      enabled: settings.hasOwnProperty('focus'), // readonly
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
  CLEAR_SELECTION: function(state) {
    let selectedTab = state.selectedTab;
    if (selectedTab === uiConstants.TAB_ORPHANS) {
      selectedTab = uiConstants.TAB_ANNOTATIONS;
    }
    const tabSettings = setTab(state.selectedTab, selectedTab);
    return {
      filterQuery: null,
      selectedAnnotationMap: null,
      ...tabSettings,
    };
  },

  CLEAR_SELECTED_ANNOTATIONS: function() {
    return { filterQuery: null, selectedAnnotationMap: null };
  },

  SELECT_ANNOTATIONS: function(state, action) {
    return { selectedAnnotationMap: action.selection };
  },

  FOCUS_ANNOTATIONS: function(state, action) {
    return { focusedAnnotationMap: action.focused };
  },

  SET_FOCUS_MODE_FOCUSED: function(state, action) {
    return {
      focusMode: {
        ...state.focusMode,
        focused: action.focused,
      },
    };
  },

  SET_FORCE_VISIBLE: function(state, action) {
    return { forceVisible: action.forceVisible };
  },

  SET_EXPANDED: function(state, action) {
    return { expanded: action.expanded };
  },

  HIGHLIGHT_ANNOTATIONS: function(state, action) {
    return { highlighted: action.highlighted };
  },

  SELECT_TAB: function(state, action) {
    return setTab(state.selectedTab, action.tab);
  },

  ADD_ANNOTATIONS(state, action) {
    const noteCount = arrayUtil.countIf(
      action.annotations,
      metadata.isPageNote
    );
    // If there are no annotations at all, ADD_ANNOTATIONS will not be called.
    const haveOnlyPageNotes = noteCount === action.annotations.length;
    // If this is the init phase and there are only page notes, select the page notes tab.
    if (state.annotations.length === 0 && haveOnlyPageNotes) {
      return { selectedTab: uiConstants.TAB_NOTES };
    }
    return {};
  },

  REMOVE_ANNOTATIONS: function(state, action) {
    const selection = Object.assign({}, state.selectedAnnotationMap);
    action.annotations.forEach(annotation => {
      if (annotation.id) {
        delete selection[annotation.id];
      }
    });
    return {
      selectedAnnotationMap: freeze(selection),
    };
  },

  SET_FILTER_QUERY: function(state, action) {
    return {
      filterQuery: action.query,
      forceVisible: {},
      expanded: {},
    };
  },

  SET_SORT_KEY: function(state, action) {
    return { sortKey: action.key };
  },
};

const actions = util.actionTypes(update);

function select(annotations) {
  return {
    type: actions.SELECT_ANNOTATIONS,
    selection: freeze(annotations),
  };
}

/**
 * Set the currently selected annotation IDs.
 */
function selectAnnotations(ids) {
  return select(toSet(ids));
}

/** Toggle whether annotations are selected or not. */
function toggleSelectedAnnotations(ids) {
  return function(dispatch, getState) {
    const selection = Object.assign({}, getState().selectedAnnotationMap);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (selection[id]) {
        delete selection[id];
      } else {
        selection[id] = true;
      }
    }
    dispatch(select(selection));
  };
}

/**
 * Sets whether a given annotation should be visible, even if it does not
 * match the current search query.
 *
 * @param {string} id - Annotation ID
 * @param {boolean} visible
 */
function setForceVisible(id, visible) {
  // FIXME: This should be converted to a plain action and accessing the state
  // should happen in the update() function
  return function(dispatch, getState) {
    const forceVisible = Object.assign({}, getState().forceVisible);
    forceVisible[id] = visible;
    dispatch({
      type: actions.SET_FORCE_VISIBLE,
      forceVisible: forceVisible,
    });
  };
}

/**
 * Sets which annotations are currently focused.
 *
 * @param {Array<string>} Tags of annotations to focus
 */
function focusAnnotations(tags) {
  return {
    type: actions.FOCUS_ANNOTATIONS,
    focused: freeze(toSet(tags)),
  };
}

function setCollapsed(id, collapsed) {
  // FIXME: This should be converted to a plain action and accessing the state
  // should happen in the update() function
  return function(dispatch, getState) {
    const expanded = Object.assign({}, getState().expanded);
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

/** Sets the sort key for the annotation list. */
function setSortKey(key) {
  return {
    type: actions.SET_SORT_KEY,
    key: key,
  };
}

/**
 * Returns true if the annotation with the given `id` is selected.
 */
function isAnnotationSelected(state, id) {
  return (state.selectedAnnotationMap || {}).hasOwnProperty(id);
}

/**
 * Return true if any annotations are currently selected.
 */
function hasSelectedAnnotations(state) {
  return !!state.selectedAnnotationMap;
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
 * Returns the annotation ID of the first annotation in `selectedAnnotationMap`.
 *
 * @return {string|null}
 */
const getFirstSelectedAnnotationId = createSelector(
  state => state.selectedAnnotationMap,
  selected => (selected ? Object.keys(selected)[0] : null)
);

function filterQuery(state) {
  return state.filterQuery;
}

/**
 * Do the config settings indicate that the client should be in a focused mode?
 *
 * @return {boolean}
 */
function focusModeEnabled(state) {
  return state.focusMode.enabled;
}

/**
 * Is a focus mode enabled, and is it presently applied?
 *
 * @return {boolean}
 */
function focusModeFocused(state) {
  return focusModeEnabled(state) && state.focusMode.focused;
}

/**
 * Returns the username for a focused user or `null` if no focused user.
 *
 * @return {object|null}
 */
function focusModeUsername(state) {
  if (state.focusMode.config.user && state.focusMode.config.user.username) {
    return state.focusMode.config.user.username;
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
  return focusModeEnabled(state) && !!focusModeUsername(state);
}

/**
 * Returns the display name for a user or the username
 * if display name is not present. If both are missing
 * then this returns an empty string.
 *
 * @return {string}
 */
function focusModeUserPrettyName(state) {
  const user = state.focusMode.config.user;
  if (!user) {
    return '';
  } else if (user.displayName) {
    return user.displayName;
  } else if (user.username) {
    return user.username;
  } else {
    return '';
  }
}

module.exports = {
  init: init,
  update: update,

  actions: {
    clearSelectedAnnotations: clearSelectedAnnotations,
    clearSelection: clearSelection,
    focusAnnotations: focusAnnotations,
    highlightAnnotations: highlightAnnotations,
    selectAnnotations: selectAnnotations,
    selectTab: selectTab,
    setCollapsed: setCollapsed,
    setFilterQuery: setFilterQuery,
    setFocusModeFocused: setFocusModeFocused,
    setForceVisible: setForceVisible,
    setSortKey: setSortKey,
    toggleSelectedAnnotations: toggleSelectedAnnotations,
  },

  selectors: {
    hasSelectedAnnotations,
    filterQuery,
    focusModeFocused,
    focusModeEnabled,
    focusModeHasUser,
    focusModeUsername,
    focusModeUserPrettyName,
    isAnnotationSelected,
    getFirstSelectedAnnotationId,
  },
};
