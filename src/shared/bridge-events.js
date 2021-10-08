/**
 * This module defines the set of global events that are dispatched across the
 * the bridge/s between the sidebar-host and sidebar-guest/s.
 */

/**
 * Events that the host sends to the sidebar
 *
 * @typedef {'destroyFrame'|'setVisibleHighlights'|'sidebarOpened'} HostToSidebarEvent
 * @type {Record<'DESTROY_FRAME'|'SET_VISIBLE_HIGHLIGHTS'|'SIDEBAR_OPENED', HostToSidebarEvent>}
 */
export const hostToSidebarEvents = {
  /**
   * The host is asking the sidebar to delete a frame.
   */
  DESTROY_FRAME: 'destroyFrame',

  /**
   * The host is asking the sidebar to set the annotation highlights on/off.
   */
  SET_VISIBLE_HIGHLIGHTS: 'setVisibleHighlights',

  /**
   * The host informs the sidebar that the sidebar has been opened.
   */
  SIDEBAR_OPENED: 'sidebarOpened',
};

/**
 * Events that the guest sends to the sidebar
 *
 * @typedef {'beforeCreateAnnotation'|'closeSidebar'|'focusAnnotations'|'openSidebar'|'showAnnotations'|'sync'|'toggleAnnotationSelection'} GuestToSidebarEvent
 * @type {Record<'BEFORE_CREATE_ANNOTATION'|'CLOSE_SIDEBAR'|'FOCUS_ANNOTATIONS'|'OPEN_SIDEBAR'|'SHOW_ANNOTATIONS'|'SYNC'|'TOGGLE_ANNOTATION_SELECTION', GuestToSidebarEvent>}
 */
export const guestToSidebarEvents = {
  /**
   * The guest is asking the sidebar to create an annotation.
   */
  BEFORE_CREATE_ANNOTATION: 'beforeCreateAnnotation',

  /**
   * The guest is asking the sidebar to relay the message to open the sidebar.
   */
  CLOSE_SIDEBAR: 'closeSidebar',

  /**
   * The guest is asking the sidebar to focus on certain annotations.
   */
  FOCUS_ANNOTATIONS: 'focusAnnotations',

  /**
   * The guest is asking the sidebar to relay the message to open the sidebar.
   */
  OPEN_SIDEBAR: 'openSidebar',

  /**
   * The guest is asking the sidebar to display some annotations.
   */
  SHOW_ANNOTATIONS: 'showAnnotations',

  /**
   * The guest notifies the sidebar to synchronize about the anchoring status of annotations.
   */
  SYNC: 'sync',

  /**
   * The guest is asking the sidebar to toggle some annotations.
   */
  TOGGLE_ANNOTATION_SELECTION: 'toggleAnnotationSelection',
};

/**
 * Events that the sidebar sends to the guest/s
 *
 * @typedef {'deleteAnnotation'|'focusAnnotations'|'getDocumentInfo'|'loadAnnotations'|'scrollToAnnotation'|'setVisibleHighlights'} SidebarToGuestEvent
 * @type {Record<'DELETE_ANNOTATION'|'FOCUS_ANNOTATIONS'|'GET_DOCUMENT_INFO'|'LOAD_ANNOTATIONS'|'SCROLL_TO_ANNOTATION'|'SET_VISIBLE_HIGHLIGHTS', SidebarToGuestEvent>}
 */
export const sidebarToGuestEvents = {
  /**
   * The sidebar is asking the guest/s to delete an annotation.
   */
  DELETE_ANNOTATION: 'deleteAnnotation',

  /**
   * The sidebar is asking the guest/s to focus on certain annotations.
   */
  FOCUS_ANNOTATIONS: 'focusAnnotations',

  /**
   * The sidebar is asking the guest/s to get the document metadata.
   */
  GET_DOCUMENT_INFO: 'getDocumentInfo',

  /**
   * The sidebar is asking the guest/s to load annotations.
   */
  LOAD_ANNOTATIONS: 'loadAnnotations',

  /**
   * The sidebar is asking the guest/s to scroll to certain annotation.
   */
  SCROLL_TO_ANNOTATION: 'scrollToAnnotation',

  /**
   * The sidebar relays to the guest/s to set the annotation highlights on/off.
   */
  SET_VISIBLE_HIGHLIGHTS: 'setVisibleHighlights',
};

/**
 * Events that the sidebar sends to the host
 *
 * @typedef {'closeSidebar'|'featureFlagsUpdated'|'helpRequested'|'loginRequested'|'logoutRequested'|'openNotebook'|'openSidebar'|'profileRequested'|'publicAnnotationCountChanged'|'signupRequested'} SidebarToHostEvent
 * @type {Record<'CLOSE_SIDEBAR'|'FEATURE_FLAGS_UPDATED'|'HELP_REQUESTED'|'LOGIN_REQUESTED'|'LOGOUT_REQUESTED'|'OPEN_NOTEBOOK'|'OPEN_SIDEBAR'|'PROFILE_REQUESTED'|'PUBLIC_ANNOTATION_COUNT_CHANGED'|'SIGNUP_REQUESTED', SidebarToHostEvent>}
 */
export const sidebarToHostEvents = {
  /**
   * The sidebar relays to the host to open the sidebar.
   */
  CLOSE_SIDEBAR: 'closeSidebar',

  /**
   * The updated feature flags for the user
   */
  FEATURE_FLAGS_UPDATED: 'featureFlagsUpdated',

  /**
   * The sidebar is asking the host to open the partner site help page.
   */
  HELP_REQUESTED: 'helpRequested',

  /**
   * The sidebar is asking the host to do a partner site log in
   * (for example, pop up a log in window). This is used when the client is
   * embedded in a partner site and a log in button in the client is clicked.
   */
  LOGIN_REQUESTED: 'loginRequested',

  /**
   * The sidebar is asking the host to do a partner site log out.
   * This is used when the client is embedded in a partner site and a log out
   * button in the client is clicked.
   */
  LOGOUT_REQUESTED: 'logoutRequested',

  /**
   * The sidebar is asking the host to open the notebook.
   */
  OPEN_NOTEBOOK: 'openNotebook',

  /**
   * The sidebar is asking the host to open the sidebar (side-effect of
   * creating an annotation).
   */
  OPEN_SIDEBAR: 'openSidebar',

  /**
   * The sidebar is asking the host to open the partner site profile page.
   */
  PROFILE_REQUESTED: 'profileRequested',

  /**
   * The sidebar inform the host to update the number of annotations in the partner site.
   */
  PUBLIC_ANNOTATION_COUNT_CHANGED: 'publicAnnotationCountChanged',

  /**
   * The sidebar is asking the host to do a partner site sign-up.
   */
  SIGNUP_REQUESTED: 'signupRequested',
};

/**
 * @typedef {HostToSidebarEvent|GuestToSidebarEvent|SidebarToGuestEvent|SidebarToHostEvent} BridgeEvent
 */
