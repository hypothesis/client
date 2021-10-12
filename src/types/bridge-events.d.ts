/**
 * This module defines the set of global events that are dispatched across the
 * the bridge/s between the sidebar-host, and sidebar-guest/s.
 */

/**
 * Events that the sidebar sends to the host
 */
export type SidebarToHostEvent =
  /**
   * The sidebar is asking the host to open the sidebar.
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
   * (for example, pop up a log in window). This is used when the client is
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
   * The sidebar is asking the host to open the sidebar.
   */
  | 'openSidebar'

  /**
   * The sidebar is asking the host to open the partner site profile page.
   */
  | 'profileRequested'

  /**
   * The sidebar is updating the number of annotations in the partner site.
   */
  | 'publicAnnotationCountChanged'

  /**
   * The sidebar is asking the host to do a partner site sign-up.
   */
  | 'signupRequested';

/**
 * Events that the host sends to the sidebar
 */
type HostToSidebarEvent =
  /**
   * The host is asking the sidebar to delete a frame using an identifier
   */
  | 'destroyFrame'

  /**
   * The host informs the sidebar that the sidebar has been opened
   */
  | 'sidebarOpened';

/**
 * Events that the sidebar sends to the guest/s
 */
export type SidebarToGuestEvent =
  /**
   * The sidebar is asking the guest/s to focus on certain annotations.
   */
  | 'focusAnnotations'

  /**
   * The sidebar is asking the guest/s to get the document metadata.
   */
  | 'getDocumentInfo'

  /**
   * The sidebar is asking the guest/s to load annotations.
   */
  | 'loadAnnotations'

  /**
   * The sidebar is asking the guest/s to scroll to certain annotation.
   */
  | 'scrollToAnnotation'

  /**
   * The sidebar is asking the guest/s to set the annotation highlights on/off.
   */
  | 'setVisibleHighlights';

/**
 * Events that the guest sends to the sidebar
 */
export type GuestToSidebarEvent =
  /**
   * The guest is asking the sidebar to create an annotation
   */
  | 'beforeCreateAnnotation'

  /**
   * The guest is asking the sidebar to delete an annotation
   */
  | 'deleteAnnotation'

  /**
   * The guest is asking the sidebar to open the sidebar.
   */
  | 'openSidebar'

  /**
   * The guest is asking the sidebar to display some annotations
   */
  | 'showAnnotations'

  /**
   * The guest is asking the sidebar to sync the annotations
   */
  | 'sync'

  /**
   * The guest is asking the host to toggle some annotations
   */
  | 'toggleAnnotationSelection';

export type BridgeEvent =
  | 'connect'
  | SidebarToHostEvent
  | HostToSidebarEvent
  | SidebarToGuestEvent
  | GuestToSidebarEvent;
