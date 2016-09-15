'use strict';

/**
 * AnnotationUI is the central store of state for the sidebar application,
 * managed using [Redux](http://redux.js.org/).
 *
 * Redux is used to provide a predictable way of updating UI state and
 * responding to UI state changes.
 */

var immutable = require('seamless-immutable');
var redux = require('redux');

var metadata = require('./annotation-metadata');
var uiConstants = require('./ui-constants');
var arrayUtil = require('./util/array-util');

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
TAB_SORTKEY_DEFAULT[uiConstants.TAB_ACTIONS] = 'Oldest';

/**
 * Available sort keys for each tab.
 */
var TAB_SORTKEYS_AVAILABLE = {};
TAB_SORTKEYS_AVAILABLE[uiConstants.TAB_ANNOTATIONS] = ['Newest', 'Oldest', 'Location'];
TAB_SORTKEYS_AVAILABLE[uiConstants.TAB_NOTES] = ['Newest', 'Oldest'];
TAB_SORTKEYS_AVAILABLE[uiConstants.TAB_ORPHANS] = ['Newest', 'Oldest', 'Location'];
TAB_SORTKEYS_AVAILABLE[uiConstants.TAB_ACTIONS] = ['Newest', 'Oldest'];

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

function initialSelection(settings) {
  var selection = {};
  if (settings.annotations) {
    selection[settings.annotations] = true;
  }
  return freeze(selection);
}

function initialState(settings) {
  return Object.freeze({
    // Flag that indicates whether the app is the sidebar and connected to
    // a page where annotations are being shown in context
    isSidebar: true,

    // List of all loaded annotations
    annotations: [],

    visibleHighlights: false,

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
  });
}

var types = {
  CLEAR_SELECTION: 'CLEAR_SELECTION',
  SELECT_ANNOTATIONS: 'SELECT_ANNOTATIONS',
  FOCUS_ANNOTATIONS: 'FOCUS_ANNOTATIONS',
  HIGHLIGHT_ANNOTATIONS: 'HIGHLIGHT_ANNOTATIONS',
  SET_HIGHLIGHTS_VISIBLE: 'SET_HIGHLIGHTS_VISIBLE',
  SET_FORCE_VISIBLE: 'SET_FORCE_VISIBLE',
  SET_EXPANDED: 'SET_EXPANDED',
  ADD_ANNOTATIONS: 'ADD_ANNOTATIONS',
  REMOVE_ANNOTATIONS: 'REMOVE_ANNOTATIONS',
  CLEAR_ANNOTATIONS: 'CLEAR_ANNOTATIONS',
  SET_FILTER_QUERY: 'SET_FILTER_QUERY',
  SET_SORT_KEY: 'SET_SORT_KEY',
  SELECT_TAB: 'SELECT_TAB',
  /**
   * Update an annotation's status flags after attempted anchoring in the
   * document completes.
   */
  UPDATE_ANCHOR_STATUS: 'UPDATE_ANCHOR_STATUS',
  /**
   * Set whether the app is the sidebar or not.
   *
   * When not in the sidebar, we do not expect annotations to anchor and always
   * display all annotations, rather than only those in the current tab.
   */
  SET_SIDEBAR: 'SET_SIDEBAR',
};

/**
 * Return a copy of `current` with all matching annotations in `annotations`
 * removed.
 */
function excludeAnnotations(current, annotations) {
  var ids = {};
  var tags = {};
  annotations.forEach(function (annot) {
    if (annot.id) {
      ids[annot.id] = true;
    }
    if (annot.$$tag) {
      tags[annot.$$tag] = true;
    }
  });
  return current.filter(function (annot) {
    var shouldRemove = (annot.id && (annot.id in ids)) ||
                       (annot.$$tag && (annot.$$tag in tags));
    return !shouldRemove;
  });
}

function findByID(annotations, id) {
  return annotations.find(function (annot) {
    return annot.id === id;
  });
}

function findByTag(annotations, tag) {
  return annotations.find(function (annot) {
    return annot.$$tag === tag;
  });
}

/**
 * Initialize the status flags and properties of a new annotation.
 */
function initializeAnnot(annotation) {
  if (annotation.id) {
    return annotation;
  }

  // Currently the user ID, permissions and group of new annotations are
  // initialized in the <annotation> component controller because the session
  // state and focused group are not stored in the Redux store. Once they are,
  // that initialization should be moved here.

  return Object.assign({}, annotation, {
    // Copy $$tag explicitly because it is non-enumerable.
    //
    // FIXME: change $$tag to $tag and make it enumerable so annotations can be
    // handled more simply in the sidebar.
    $$tag: annotation.$$tag,
    // New annotations must be anchored
    $orphan: false,
  });
}


/**
 * Return state updates necessary to select a different tab.
 *
 * "middleware" functions can wrap the dispatch process in order to implement
 *  logging, trigger side effects etc.
 *
 * Tests for a given action consist of:
 *
 *  1. Checking that the UI (or other event source) dispatches the correct
 *     action when something happens.
 *  2. Checking that given an initial state, and an action, a reducer returns
 *     the correct resulting state.
 *  3. Checking that the UI correctly presents a given state.
 */
function selectTab(state, newTab) {
  // Do nothing if the "new tab" is not a valid tab.
  if ([uiConstants.TAB_ANNOTATIONS,
       uiConstants.TAB_NOTES,
       uiConstants.TAB_ACTIONS,
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


function annotationsReducer(state, action) {
  switch (action.type) {
  case types.ADD_ANNOTATIONS:
    {
      var updatedIDs = {};
      var updatedTags = {};

      var added = [];
      var unchanged = [];
      var updated = [];

var redux = require('redux');

// `.default` is needed because 'redux-thunk' is built as an ES2015 module
var thunk = require('redux-thunk').default;

var reducers = require('./reducers');
var annotationsReducer = require('./reducers/annotations');
var selectionReducer = require('./reducers/selection');
var viewerReducer = require('./reducers/viewer');
var util = require('./reducers/util');

/**
 * Redux middleware which triggers an Angular change-detection cycle
 * if no cycle is currently in progress.
 *
 * This ensures that Angular UI components are updated after the UI
 * state changes in response to external inputs (eg. WebSocket messages,
 * messages arriving from other frames in the page, async network responses).
 *
 * See http://redux.js.org/docs/advanced/Middleware.html
 */
function angularDigestMiddleware($rootScope) {
  return function (next) {
    return function (action) {
      next(action);

      // '$$phase' is set if Angular is in the middle of a digest cycle already
      if (!$rootScope.$$phase) {
        // $applyAsync() is similar to $apply() but provides debouncing.
        // See http://stackoverflow.com/questions/30789177
        $rootScope.$applyAsync(function () {});
      }
    };
  };
}

// @ngInject
module.exports = function ($rootScope, settings) {
  var enhancer = redux.applyMiddleware(
    // The `thunk` middleware handles actions which are functions.
    // This is used to implement actions which have side effects or are
    // asynchronous (see https://github.com/gaearon/redux-thunk#motivation)
    thunk,
    angularDigestMiddleware.bind(null, $rootScope)
  );
  var store = redux.createStore(reducers.update, reducers.init(settings),
    enhancer);

  // Expose helper functions that create actions as methods of the
  // `annotationUI` service to make using them easier from app code. eg.
  //
  // Instead of:
  //   annotationUI.dispatch(annotations.actions.addAnnotations(annotations))
  // You can use:
  //   annotationUI.addAnnotations(annotations)
  //
  var actionCreators = redux.bindActionCreators(Object.assign({},
    annotationsReducer.actions,
    selectionReducer.actions,
    viewerReducer.actions
  ), store.dispatch);

  // Expose selectors as methods of the `annotationUI` to make using them easier
  // from app code.
  //
  // eg. Instead of:
  //   selection.isAnnotationSelected(annotationUI.getState(), id)
  // You can use:
  //   annotationUI.isAnnotationSelected(id)
  var selectors = util.bindSelectors({
    isAnnotationSelected: selectionReducer.isAnnotationSelected,
    hasSelectedAnnotations: selectionReducer.hasSelectedAnnotations,
  }, store.getState);

  return Object.assign(store, actionCreators, selectors);
};
