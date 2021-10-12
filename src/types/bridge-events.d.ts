/**
 * This module defines the set of global events that are dispatched across the
 * the bridge/s between the sidebar-host, and sidebar-guest/s.
 */

/**
 * Events that the sidebar sends to the host
 */
type SidebarToHostEvents = {
  /**
   * The sidebar is asking the host to open the sidebar.
   */
  CLOSE_SIDEBAR: 'closeSidebar';

  /**
   * The updated feature flags for the user
   */
  FEATURE_FLAGS_UPDATED: 'featureFlagsUpdated';

  /**
   * The sidebar is asking the host to open the partner site help page.
   */
  HELP_REQUESTED: 'helpRequested';

  /**
   * The sidebar is asking the host to do a partner site log in
   * (for example, pop up a log in window). This is used when the client is
   * embedded in a partner site and a log in button in the client is clicked.
   */
  LOGIN_REQUESTED: 'loginRequested';

  /**
   * The sidebar is asking the host to do a partner site log out.
   * This is used when the client is embedded in a partner site and a log out
   * button in the client is clicked.
   */
  LOGOUT_REQUESTED: 'logoutRequested';

  /**
   * The sidebar is asking the host to open the notebook.
   */
  OPEN_NOTEBOOK: 'openNotebook';

  /**
   * The sidebar is asking the host to open the sidebar.
   */
  OPEN_SIDEBAR: 'openSidebar';

  /**
   * The sidebar is asking the host to open the partner site profile page.
   */
  PROFILE_REQUESTED: 'profileRequested';

  /**
   * The sidebar is updating the number of annotations in the partner site.
   */
  PUBLIC_ANNOTATION_COUNT_CHANGED: 'publicAnnotationCountChanged';

  /**
   * The sidebar is asking the host to do a partner site sign-up.
   */
  SIGNUP_REQUESTED: 'signupRequested';
};

/**
 * Events that the host sends to the sidebar
 */
type HostToSidebarEvents = {
  /**
   * The host is asking the sidebar to delete a frame using an identifier
   */
  DESTROY_FRAME: 'destroyFrame';

  /**
   * The host informs the sidebar that the sidebar has been opened
   */
  SIDEBAR_OPENED: 'sidebarOpened';
};

/**
 * Events that the sidebar sends to the guest/s
 */
type SidebarToGuestEvents = {
  /**
   * The sidebar is asking the guest/s to focus on certain annotations.
   */
  FOCUS_ANNOTATIONS: 'focusAnnotations';

  /**
   * The sidebar is asking the guest/s to get the document metadata.
   */
  GET_DOCUMENT_INFO: 'getDocumentInfo';

  /**
   * The sidebar is asking the guest/s to load annotations.
   */
  LOAD_ANNOTATIONS: 'loadAnnotations';

  /**
   * The sidebar is asking the guest/s to scroll to certain annotation.
   */
  SCROLL_TO_ANNOTATION: 'scrollToAnnotation';

  /**
   * The sidebar is asking the guest/s to set the annotation highlights on/off.
   */
  SET_VISIBLE_HIGHLIGHTS: 'setVisibleHighlights';
};

/**
 * Events that the guest sends to the sidebar
 */
type GuestToSidebarEvents = {
  /**
   * The guest is asking the sidebar to create an annotation
   */
  BEFORE_CREATE_ANNOTATION: 'beforeCreateAnnotation';

  /**
   * The guest is asking the sidebar to delete an annotation
   */
  DELETE_ANNOTATION: 'deleteAnnotation';

  /**
   * The guest is asking the sidebar to open the sidebar.
   */
  OPEN_SIDEBAR: 'openSidebar';

  /**
   * The guest is asking the sidebar to display some annotations
   */
  SHOW_ANNOTATIONS: 'showAnnotations';

  /**
   * The guest is asking the sidebar to sync the annotations
   */
  SYNC: 'sync';

  /**
   * The guest is asking the host to toggle some annotations
   */
  TOGGLE_ANNOTATION_SELECTION: 'toggleAnnotationSelection';
};

export type BridgeEvents =
  | 'connect'
  | SidebarToHostEvents[keyof SidebarToHostEvents]
  | HostToSidebarEvents[keyof HostToSidebarEvents]
  | SidebarToGuestEvents[keyof SidebarToGuestEvents]
  | GuestToSidebarEvents[keyof GuestToSidebarEvents];
