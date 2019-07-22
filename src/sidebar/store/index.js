'use strict';

/**
 * Central store of state for the sidebar application, managed using
 * [Redux](http://redux.js.org/).
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

const createStore = require('./create-store');
const debugMiddleware = require('./debug-middleware');

const activity = require('./modules/activity');
const annotations = require('./modules/annotations');
const directLinked = require('./modules/direct-linked');
const drafts = require('./modules/drafts');
const frames = require('./modules/frames');
const links = require('./modules/links');
const groups = require('./modules/groups');
const realTimeUpdates = require('./modules/real-time-updates');
const selection = require('./modules/selection');
const session = require('./modules/session');
const viewer = require('./modules/viewer');

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
  return function(next) {
    return function(action) {
      next(action);

      // '$$phase' is set if Angular is in the middle of a digest cycle already
      if (!$rootScope.$$phase) {
        // $applyAsync() is similar to $apply() but provides debouncing.
        // See http://stackoverflow.com/questions/30789177
        $rootScope.$applyAsync(function() {});
      }
    };
  };
}

/**
 * Factory which creates the sidebar app's state store.
 *
 * Returns a Redux store augmented with methods for each action and selector in
 * the individual state modules. ie. `store.actionName(args)` dispatches an
 * action through the store and `store.selectorName(args)` invokes a selector
 * passing the current state of the store.
 */
// @ngInject
function store($rootScope, settings) {
  const middleware = [
    debugMiddleware,
    angularDigestMiddleware.bind(null, $rootScope),
  ];

  const modules = [
    activity,
    annotations,
    directLinked,
    drafts,
    frames,
    links,
    groups,
    realTimeUpdates,
    selection,
    session,
    viewer,
  ];
  return createStore(modules, [settings], middleware);
}

module.exports = store;
