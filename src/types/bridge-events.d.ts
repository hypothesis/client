/**
 * This module defines the set of global events that are dispatched across the
 * the bridge(s) between the sidebar-host and sidebar-guest(s).
 */

/**
 * Events that the host sends to the sidebar
 */
export type HostToSidebarEvent =
  /**
   * The host is asking the sidebar to delete a frame.
   */
  | 'destroyFrame'

  /**
   * The host is asking the sidebar to set the annotation highlights on/off.
   */
  | 'setVisibleHighlights'

  /**
   * The host informs the sidebar that the sidebar has been opened.
   */
  | 'sidebarOpened';

/**
 * Events that the guest sends to the sidebar
 */
export type GuestToSidebarEvent =
  /**
   * The guest is asking the sidebar to create an annotation.
   */
  | 'beforeCreateAnnotation'

  /**
   * The guest is asking the sidebar to relay the message to open the sidebar.
   */
  | 'closeSidebar'

  /**
   * The guest is asking the sidebar to focus on certain annotations.
   */
  | 'focusAnnotations'

  /**
   * The guest is asking the sidebar to relay the message to open the sidebar.
   */
  | 'openSidebar'

  /**
   * The guest is asking the sidebar to display some annotations.
   */
  | 'showAnnotations'

  /**
   * The guest notifies the sidebar to synchronize about the anchoring status of annotations.
   */
  | 'sync'

  /**
   * The guest is asking the sidebar to toggle some annotations.
   */
  | 'toggleAnnotationSelection';

/**
 * Events that the sidebar sends to the guest(s)
 */
export type SidebarToGuestEvent =
  /**
   * The sidebar is asking the guest(s) to delete an annotation.
   */
  | 'deleteAnnotation'

  /**
   * The sidebar is asking the guest(s) to focus on certain annotations.
   */
  | 'focusAnnotations'

  /**
   * The sidebar is asking the guest(s) to get the document metadata.
   */
  | 'getDocumentInfo'

  /**
   * The sidebar is asking the guest(s) to load annotations.
   */
  | 'loadAnnotations'

  /**
   * The sidebar is asking the guest(s) to scroll to certain annotation.
   */
  | 'scrollToAnnotation'

  /**
   * The sidebar relays to the guest(s) to set the annotation highlights on/off.
   */
  | 'setVisibleHighlights';

/**
 * Events that the sidebar sends to the host
 */
export type SidebarToHostEvent =
  /**
   * The sidebar relays to the host to open the sidebar.
   */
  | 'closeSidebar'

  /**
   * The updated feature flags for the user
   */
  | 'featureFlagsUpdated'

  /**
   * The sidebar is asking the host to open the partner site help page.
   */
  | 'helpRequested'

  /**
   * The sidebar is asking the host to do a partner site log in
   * (for example pop up a log in window). This is used when the client is
   * embedded in a partner site and a log in button in the client is clicked.
   */
  | 'loginRequested'

  /**
   * The sidebar is asking the host to do a partner site log out.
   * This is used when the client is embedded in a partner site and a log out
   * button in the client is clicked.
   */
  | 'logoutRequested'

  /**
   * The sidebar is asking the host to open the notebook.
   */
  | 'openNotebook'

  /**
   * The sidebar is asking the host to open the sidebar (side-effect of
   * creating an annotation).
   */
  | 'openSidebar'

  /**
   * The sidebar is asking the host to open the partner site profile page.
   */
  | 'profileRequested'

  /**
   * The sidebar inform the host to update the number of annotations in the partner site.
   */
  | 'publicAnnotationCountChanged'

  /**
   * The sidebar is asking the host to do a partner site sign-up.
   */
  | 'signupRequested';

export type BridgeEvent =
  | HostToSidebarEvent
  | GuestToSidebarEvent
  | SidebarToGuestEvent
  | SidebarToHostEvent;
