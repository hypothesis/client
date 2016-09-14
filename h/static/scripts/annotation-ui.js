'use strict';

/**
 * AnnotationUI is the central store of state for the sidebar application,
 * managed using [Redux](http://redux.js.org/).
 *
 * State management in Redux apps work as follows:
 *
 *  1. All important application state is stored in a single, immutable object.
 *  2. The user interface is a presentation of this state. Interaction with the
 *     UI triggers updates by creating `actions`.
 *  3. Actions are plain JS objects which describe some event that happened in
 *     the application. Updates happen by passing actions to a `reducer`
 *     function which takes the current application state, the action and
 *     returns the new application state.
 *
 *     The process of updating the app state using an action is known as
 *     'dispatching' the action.
 *  4. Other parts of the app can subscribe to changes in the app state.
 *     This is used to to update the UI etc.
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

var redux = require('redux');

// `.default` is needed because 'redux-thunk' is built as an ES2015 module
var thunk = require('redux-thunk').default;

var reducers = require('./reducers');
var annotationsReducer = require('./reducers/annotations');
var selectionReducer = require('./reducers/selection');
var viewerReducer = require('./reducers/viewer');

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

/**
 * Stores the UI state of the annotator in connected clients.
 *
 * This includes:
 * - The IDs of annotations that are currently selected or focused
 * - The state of the bucket bar
 */
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

  return {
    /**
     * Return the current UI state of the sidebar. This should not be modified
     * directly but only though the helper methods below.
     */
    getState: store.getState,

    /** Listen for changes to the UI state of the sidebar. */
    subscribe: store.subscribe,

    // Wrappers around annotation actions
    addAnnotations: function (annotations, now) {
      store.dispatch(annotationsReducer.addAnnotations(annotations, now));
    },

    removeAnnotations: function (annotations) {
      store.dispatch(annotationsReducer.removeAnnotations(annotations));
    },

    clearAnnotations: function () {
      store.dispatch(annotationsReducer.clearAnnotations());
    },

    updateAnchorStatus: function (id, tag, isOrphan) {
      store.dispatch(annotationsReducer.updateAnchorStatus(id, tag, isOrphan));
    },

    // Wrappers around selection actions
    clearSelectedAnnotations: function () {
      store.dispatch(selectionReducer.clearSelectedAnnotations());
    },
    focusAnnotations: function (tags) {
      store.dispatch(selectionReducer.focusAnnotations(tags));
    },
    highlightAnnotations: function (ids) {
      store.dispatch(selectionReducer.highlightAnnotations(ids));
    },
    removeSelectedAnnotation: function (id) {
      store.dispatch(selectionReducer.removeSelectedAnnotation(id));
    },
    selectAnnotations: function (ids) {
      store.dispatch(selectionReducer.selectAnnotations(ids));
    },
    selectTab: function (tab) {
      store.dispatch(selectionReducer.selectTab(tab));
    },
    setCollapsed: function (id, collapsed) {
      store.dispatch(selectionReducer.setCollapsed(id, collapsed));
    },
    setFilterQuery: function (query) {
      store.dispatch(selectionReducer.setFilterQuery(query));
    },
    setForceVisible: function (id, visible) {
      store.dispatch(selectionReducer.setForceVisible(id, visible));
    },
    setSortKey: function (key) {
      store.dispatch(selectionReducer.setSortKey(key));
    },
    toggleSelectedAnnotations: function (ids) {
      store.dispatch(selectionReducer.toggleSelectedAnnotations(ids));
    },

    // Wrappers around selection selectors
    isAnnotationSelected: function (id) {
      return selectionReducer.isAnnotationSelected(store.getState(), id);
    },
    hasSelectedAnnotations: function () {
      return selectionReducer.hasSelectedAnnotations(store.getState());
    },

    // Wrappers around viewer actions
    setShowHighlights: function (show) {
      store.dispatch(viewerReducer.setShowHighlights(show));
    },
    setAppIsSidebar: function (isSidebar) {
      store.dispatch(viewerReducer.setAppIsSidebar(isSidebar));
    },
  };
};
