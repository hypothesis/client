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

    annotationExists: annotationsReducer.annotationExists,
    savedAnnotations: annotationsReducer.savedAnnotations,

    isSidebar: viewerReducer.isSidebar,
  }, store.getState);

  return Object.assign(store, actionCreators, selectors);
};
