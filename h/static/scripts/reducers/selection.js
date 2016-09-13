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

var immutable = require('seamless-immutable');

var uiConstants = require('../ui-constants');

/**
* Default starting tab.
*/
var TAB_DEFAULT = uiConstants.TAB_ANNOTATIONS;

 /**
  * Default sort keys for each tab.
  */
var TAB_SORTKEY_DEFAULT = {};
TAB_SORTKEY_DEFAULT[uiConstants.TAB_ANNOTATIONS] = 'Location';
TAB_SORTKEY_DEFAULT[uiConstants.TAB_NOTES] = 'Oldest';
TAB_SORTKEY_DEFAULT[uiConstants.TAB_ORPHANS] = 'Location';

/**
 * Available sort keys for each tab.
 */
var TAB_SORTKEYS_AVAILABLE = {};
TAB_SORTKEYS_AVAILABLE[uiConstants.TAB_ANNOTATIONS] = ['Newest', 'Oldest', 'Location'];
TAB_SORTKEYS_AVAILABLE[uiConstants.TAB_NOTES] = ['Newest', 'Oldest'];
TAB_SORTKEYS_AVAILABLE[uiConstants.TAB_ORPHANS] = ['Newest', 'Oldest', 'Location'];

function initialSelection(settings) {
  var selection = {};
  if (settings.annotations) {
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

function toSet(list) {
  return list.reduce(function (set, key) {
    set[key] = true;
    return set;
  }, {});
}

/**
 * Return state updates necessary to select a different tab.
 *
 * This function accepts the name of a tab and returns an object which must be
 * merged into the current state to achieve the desired tab change.
 */
function selectTabHelper(state, newTab) {
  // Do nothing if the "new tab" is not a valid tab.
  if ([uiConstants.TAB_ANNOTATIONS,
      uiConstants.TAB_NOTES,
      uiConstants.TAB_ORPHANS].indexOf(newTab) === -1) {
    return {};
  }
  // Shortcut if the tab is already correct, to avoid resetting the sortKey
  // unnecessarily.
  if (state.selectedTab === newTab) {
    return {};
  }
  return {
    selectedTab: newTab,
    sortKey: TAB_SORTKEY_DEFAULT[newTab],
    sortKeysAvailable: TAB_SORTKEYS_AVAILABLE[newTab],
  };
}

var actions = {
  CLEAR_SELECTION: 'CLEAR_SELECTION',
  SELECT_ANNOTATIONS: 'SELECT_ANNOTATIONS',
  FOCUS_ANNOTATIONS: 'FOCUS_ANNOTATIONS',
  HIGHLIGHT_ANNOTATIONS: 'HIGHLIGHT_ANNOTATIONS',
  SET_FORCE_VISIBLE: 'SET_FORCE_VISIBLE',
  SET_EXPANDED: 'SET_EXPANDED',
  SET_FILTER_QUERY: 'SET_FILTER_QUERY',
  SET_SORT_KEY: 'SET_SORT_KEY',
  SELECT_TAB: 'SELECT_TAB',
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

    filterQuery: null,

    selectedTab: TAB_DEFAULT,

    // Key by which annotations are currently sorted.
    sortKey: TAB_SORTKEY_DEFAULT[TAB_DEFAULT],
    // Keys by which annotations can be sorted.
    sortKeysAvailable: TAB_SORTKEYS_AVAILABLE[TAB_DEFAULT],
  };
}

function update(state, action) {
  switch (action.type) {
  case actions.CLEAR_SELECTION:
    return Object.assign({}, state, {
      filterQuery: null,
      selectedAnnotationMap: null,
    });
  case actions.SELECT_ANNOTATIONS:
    return Object.assign({}, state, {selectedAnnotationMap: action.selection});
  case actions.FOCUS_ANNOTATIONS:
    return Object.assign({}, state, {focusedAnnotationMap: action.focused});
  case actions.SET_FORCE_VISIBLE:
    return Object.assign({}, state, {forceVisible: action.forceVisible});
  case actions.SET_EXPANDED:
    return Object.assign({}, state, {expanded: action.expanded});
  case actions.HIGHLIGHT_ANNOTATIONS:
    return Object.assign({}, state, {highlighted: action.highlighted});
  case actions.SELECT_TAB:
    return Object.assign({}, state, selectTabHelper(state, action.tab));
  case actions.SET_FILTER_QUERY:
    return Object.assign({}, state, {
      filterQuery: action.query,
      forceVisible: {},
      expanded: {},
    });
  case actions.SET_SORT_KEY:
    return Object.assign({}, state, {sortKey: action.key});
  default:
    return state;
  }
}

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
  return function (dispatch, getState) {
    var selection = Object.assign({}, getState().selectedAnnotationMap);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
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
  return function (dispatch, getState) {
    var forceVisible = Object.assign({}, getState().forceVisible);
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
  return function (dispatch, getState) {
    var expanded = Object.assign({}, getState().expanded);
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

/** De-select an annotation. */
function removeSelectedAnnotation(id) {
  // FIXME: This should be converted to a plain action and accessing the state
  // should happen in the update() function
  return function (dispatch, getState) {
    var selection = Object.assign({}, getState().selectedAnnotationMap);
    if (!selection || !id) {
      return;
    }
    delete selection[id];
    dispatch(select(selection));
  };
}

/** De-select all annotations. */
function clearSelectedAnnotations() {
  return {type: actions.CLEAR_SELECTION};
}

module.exports = {
  init: init,
  update: update,

  // Actions
  clearSelectedAnnotations: clearSelectedAnnotations,
  focusAnnotations: focusAnnotations,
  highlightAnnotations: highlightAnnotations,
  removeSelectedAnnotation: removeSelectedAnnotation,
  selectAnnotations: selectAnnotations,
  selectTab: selectTab,
  setCollapsed: setCollapsed,
  setFilterQuery: setFilterQuery,
  setForceVisible: setForceVisible,
  setSortKey: setSortKey,
  toggleSelectedAnnotations: toggleSelectedAnnotations,

  // Selectors
  hasSelectedAnnotations: hasSelectedAnnotations,
  isAnnotationSelected: isAnnotationSelected,

  // Helpers
  selectTabHelper: selectTabHelper,
};
