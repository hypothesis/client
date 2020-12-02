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

import createStore from './create-store';
import debugMiddleware from './debug-middleware';
import activity from './modules/activity';
import annotations from './modules/annotations';
import defaults from './modules/defaults';
import directLinked from './modules/direct-linked';
import drafts from './modules/drafts';
import filters from './modules/filters';
import frames from './modules/frames';
import groups from './modules/groups';
import links from './modules/links';
import realTimeUpdates from './modules/real-time-updates';
import route from './modules/route';
import selection from './modules/selection';
import session from './modules/session';
import sidebarPanels from './modules/sidebar-panels';
import toastMessages from './modules/toast-messages';
import viewer from './modules/viewer';

/**
 * // Base redux store
 * @typedef {import("redux").Store} ReduxStore
 *
 * // Custom stores
 * @typedef {import("./modules/activity").ActivityStore} ActivityStore
 * @typedef {import("./modules/annotations").AnnotationsStore} AnnotationsStore
 * @typedef {import("./modules/defaults").DefaultsStore} DefaultsStore
 * @typedef {import("./modules/direct-linked").DirectLinkedStore} DirectLinkedStore
 * @typedef {import("./modules/drafts").DraftsStore} DraftsStore
 * @typedef {import("./modules/filters").FiltersStore} FiltersStore
 * @typedef {import("./modules/frames").FramesStore} FramesStore
 * @typedef {import("./modules/groups").GroupsStore} GroupsStore
 * @typedef {import("./modules/links").LinksStore} LinksStore
 * @typedef {import("./modules/real-time-updates").RealTimeUpdatesStore} RealTimeUpdatesStore
 * @typedef {import("./modules/route").RouteStore} RouteStore
 * @typedef {import("./modules/selection").SelectionStore} SelectionStore
 * @typedef {import("./modules/session").SessionStore} SessionStore
 * @typedef {import("./modules/sidebar-panels").SidebarPanelsStore} SidebarPanelsStore
 * @typedef {import("./modules/toast-messages").ToastMessagesStore} ToastMessagesStore
 * @typedef {import("./modules/viewer").ViewerStore} ViewerStore
 * // TODO: add more stores
 *
 * // Combine all stores
 * @typedef {ReduxStore &
 *  ActivityStore &
 *  AnnotationsStore &
 *  DefaultsStore &
 *  DirectLinkedStore &
 *  DraftsStore &
 *  FiltersStore &
 *  FramesStore &
 *  GroupsStore &
 *  LinksStore &
 *  RealTimeUpdatesStore &
 *  RouteStore &
 *  SelectionStore &
 *  SessionStore &
 *  SidebarPanelsStore &
 *  ToastMessagesStore &
 *  ViewerStore} SidebarStore
 */

/**
 * Factory which creates the sidebar app's state store.
 *
 * Returns a Redux store augmented with methods for each action and selector in
 * the individual state modules. ie. `store.actionName(args)` dispatches an
 * action through the store and `store.selectorName(args)` invokes a selector
 * passing the current state of the store.
 *
 * @param {import('../../types/config').SidebarConfig} settings
 * @return {SidebarStore}
 */
// @inject
export default function store(settings) {
  const middleware = [debugMiddleware];

  const modules = [
    activity,
    annotations,
    defaults,
    directLinked,
    drafts,
    filters,
    frames,
    links,
    groups,
    realTimeUpdates,
    route,
    selection,
    session,
    sidebarPanels,
    toastMessages,
    viewer,
  ];
  return /** @type {SidebarStore} */ (createStore(
    modules,
    [settings],
    middleware
  ));
}
