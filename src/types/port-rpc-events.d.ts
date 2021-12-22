/**
 * This module defines the events that are sent between frames with different
 * roles in the client (guest, host, sidebar).
 */

/**
 * Events that the guest sends to the host
 */
export type GuestToHostEvent =
  /**
   * The guest informs the host that text has been unselected at a frame with that identifier.
   */
  | 'textUnselectedIn'

  /**
   * The guest informs the host that text has been selected at a frame with that identifier.
   */
  | 'textSelectedIn'

  /**
   * The guest informs the host that the anchors have been changed in the main annotatable frame.
   */
  | 'anchorsChanged';

/**
 * Events that the guest sends to the sidebar
 */
export type GuestToSidebarEvent =
  /**
   * The guest is asking the sidebar to create an annotation.
   */
  | 'createAnnotation'

  /**
   * The guest is asking the sidebar to relay the message to the host to close the sidebar.
   */
  | 'closeSidebar'

  /**
   * The guest is asking the sidebar to focus on certain annotations.
   */
  | 'focusAnnotations'

  /**
   * The guest is asking the sidebar to relay the message to the host to open the sidebar.
   */
  | 'openSidebar'

  /** The guest is notifying the sidebar of the current document metadata and URIs. */
  | 'documentInfoChanged'

  /**
   * The guest is asking the sidebar to display some annotations.
   */
  | 'showAnnotations'

  /**
   * The guest informs the sidebar whether annotations were successfully anchored
   */
  | 'syncAnchoringStatus'

  /**
   * The guest is asking the sidebar to toggle some annotations.
   */
  | 'toggleAnnotationSelection';

/**
 * Events that the host sends to the guest
 */
export type HostToGuestEvent =
  /**
   * The host requests a guest with a specific frame identifier to create an annotation.
   */
  | 'createAnnotationIn'

  /**
   * The host informs guests that text should be unselected, except in the guest with a given frame identifier
   */
  | 'clearSelectionExceptIn'

  /**
   * The host informs guests to focus on a set of annotations
   */
  | 'focusAnnotations'

  /**
   * The host informs guests to select/toggle on a set of annotations
   */
  | 'selectAnnotations'

  /**
   * The host informs guests that the sidebar layout has been changed.
   */
  | 'sidebarLayoutChanged'

  /**
   * The host informs guests to scroll to the closest off-screen anchor associated with a set of annotations.
   */
  | 'scrollToClosestOffScreenAnchor';

/**
 * Events that the host sends to the sidebar
 */
export type HostToSidebarEvent =
  /**
   * The host informs the sidebar that a guest frame has been destroyed
   */
  | 'frameDestroyed'

  /**
   * Highlights have been toggled on/off.
   */
  | 'setHighlightsVisible'

  /**
   * The host informs the sidebar that the sidebar has been opened.
   */
  | 'sidebarOpened';

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
  | 'setHighlightsVisible';

/**
 * Events that the sidebar sends to the host
 */
export type SidebarToHostEvent =
  /**
   * The sidebar notifies the host that it has loaded and is ready to be displayed.
   */
  | 'ready'

  /**
   * The sidebar relays to the host to close the sidebar.
   */
  | 'closeSidebar'

  /**
   * The sidebar informs the host to update the Hypothesis configuration to enable/disable additional features
   */
  | 'featureFlagsUpdated'

  /**
   * The sidebar is asking the host to open the partner site help page.
   * https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-onhelprequest
   */
  | 'helpRequested'

  /**
   * The sidebar is asking the host to do a partner site log in
   * (for example pop up a log in window). This is used when the client is
   * embedded in a partner site and a log in button in the client is clicked.
   * https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-onloginrequest
   */
  | 'loginRequested'

  /**
   * The sidebar is asking the host to do a partner site log out.
   * This is used when the client is embedded in a partner site and a log out
   * button in the client is clicked.
   * https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-onlogoutrequest
   */
  | 'logoutRequested'

  /**
   * The sidebar is asking the host to open the notebook.
   */
  | 'openNotebook'

  /**
   * The sidebar is asking the host to open the sidebar (side-effect of creating
   * an annotation).
   */
  | 'openSidebar'

  /**
   * The sidebar requests the host to enable the "Show highlights" control.
   */
  | 'showHighlights'

  /**
   * The sidebar is asking the host to open the partner site profile page.
   * https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-onprofilerequest
   */
  | 'profileRequested'

  /**
   * The sidebar informs the host to update the annotation counter in the partner site.
   * https://h.readthedocs.io/projects/client/en/latest/publishers/host-page-integration/#cmdoption-arg-data-hypothesis-annotation-count
   */
  | 'publicAnnotationCountChanged'

  /**
   * The sidebar is asking the host to do a partner site sign-up.
   * https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-onsignuprequest
   */
  | 'signupRequested';

export type BridgeEvent =
  | HostToGuestEvent
  | HostToSidebarEvent
  | GuestToHostEvent
  | GuestToSidebarEvent
  | SidebarToGuestEvent
  | SidebarToHostEvent;
