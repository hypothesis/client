'use strict';

/**
 * AnnotationUI provides the central store of UI state for the application,
 * using [Redux](http://redux.js.org/).
 *
 * Redux is used to provide a predictable way of updating UI state and
 * responding to UI state changes.
 */

var redux = require('redux');
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
