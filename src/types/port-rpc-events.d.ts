/**
 * This module defines the messages that are sent between frames with different
 * roles in the client (guest, host, sidebar). Some messages are events in the
 * source frame (eg. the active feature flags changed, text was selected)
 * others are commands for the target frame (eg. "close the sidebar").
 */

/**
 * Events that guests send to the host.
 */
export type GuestToHostEvent =
  /** Text has been deselected in the guest frame. */
  | 'textUnselected'

  /** Text has been selected in the guest frame. */
  | 'textSelected'

  /** Anchors have changed in the guest frame. */
  | 'anchorsChanged'

  /**
   * Visibility of highlights was toggled from the guest frame. This event is
   * not sent if highlights are turned on/off in the frame in response to a
   * command from the sidebar or host frames.
   */
  | 'highlightsVisibleChanged';

/**
 * Events that guests send to the sidebar.
 */
export type GuestToSidebarEvent =
  /**
   * A new annotation was created in the guest frame via the Annotate/Highlight controls.
   */
  | 'createAnnotation'

  /** Request to close the sidebar. */
  | 'closeSidebar'

  /**
   * Indicate in the sidebar which annotation cards correspond to hovered
   * highlights in the guest.
   */
  | 'hoverAnnotations'

  /** Request to open the sidebar. */
  | 'openSidebar'

  /** The URIs or metadata of the document in the guest frame changed. */
  | 'documentInfoChanged'

  /** Set the selected annotations. Emitted when the user clicks highlights in the guest frame. */
  | 'showAnnotations'

  /** The anchoring status of annotations changed. */
  | 'syncAnchoringStatus'

  /** Toggle whether annotations are selected. */
  | 'toggleAnnotationSelection';

/**
 * Events that the host sends to guests.
 */
export type HostToGuestEvent =
  /**
   * The host requests that the guest frame create a new annotation.
   *
   * This is used for the toolbar button that creates a new annotation or
   * page note for the main guest frame, depending on whether there is a
   * selection.
   */
  | 'createAnnotation'

  /** Clear the selection in the guest frame. */
  | 'clearSelection'

  /**
   * Indicate in the guest which highlights correspond to hovered buckets in
   * the bucket bar.
   */
  | 'hoverAnnotations'

  /**
   * Select annotations in the guest frame.
   *
   * This is used to select annotations when the corresponding items in the
   * bucket bar are clicked.
   */
  | 'selectAnnotations'

  /** The layout (width, open/closed state) of the sidebar changed. */
  | 'sidebarLayoutChanged'

  /** Scroll a highlight into view. */
  | 'scrollToAnnotation';

/**
 * Events that the host sends to the sidebar.
 */
export type HostToSidebarEvent =
  /**
   * Highlights have been toggled on/off.
   */
  | 'setHighlightsVisible'

  /** Notify the sidebar iframe that it has become visible. */
  | 'sidebarOpened'

  /** Notify the sidebar iframe that it has become hidden. */
  | 'sidebarClosed';

/**
 * Events that the sidebar sends to guests.
 */
export type SidebarToGuestEvent =
  /** Remove an annotation from the guest frame. */
  | 'deleteAnnotation'

  /** The active feature flags changed. */
  | 'featureFlagsUpdated'

  /**
   * Indicate in the guest which highlights correspond to hovered annotations
   * in the sidebar.
   */
  | 'hoverAnnotations'

  /** Load new annotations into the guest frame. */
  | 'loadAnnotations'

  /** Navigate to the segment of a book associated with an annotation. */
  | 'navigateToSegment'

  /** Scroll an annotation into view. */
  | 'scrollToAnnotation'
  | 'setHighlightsVisible'

  /**
   * Show a banner with information about the current content.
   */
  | 'showContentInfo'

  /**
   * Show a notice that the user is outside the region of the document for the
   * current activity / assignment.
   */
  | 'setOutsideAssignmentNoticeVisible';

/**
 * Events that the sidebar sends to the host
 */
export type SidebarToHostEvent =
  /**
   * Request from the sidebar iframe to close (ie. hide/move offscreen) its
   * container in the host frame.
   */
  | 'closeSidebar'

  /** The active feature flags changed. */
  | 'featureFlagsUpdated'

  /**
   * Open the partner site help page.
   *
   * See https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-onhelprequest
   */
  | 'helpRequested'

  /**
   * Initiate a login.
   *
   * This is used when the client is embedded in a partner site where a custom
   * Hypothesis login method is used (aka. a third-party authority) and the
   * login button in the client is clicked.
   *
   * See https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-onloginrequest
   */
  | 'loginRequested'

  /**
   * Log the user out.
   *
   * This is used when the client is embedded in a partner site where a custom
   * Hypothesis login method is used (aka. a third-party authority) and the
   * logout button in the client is clicked.
   *
   * See https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-onlogoutrequest
   */
  | 'logoutRequested'

  /** Open the notebook dialog. */
  | 'openNotebook'

  /** Open the account settings dialog. */
  | 'openProfile'

  /** Open the sidebar container. */
  | 'openSidebar'

  /** Make highlights visible in guest frames. */
  | 'showHighlights'

  /**
   * Open the profile page for the current user.
   *
   * This is used when the client is embedded in a partner site where a custom
   * Hypothesis login method is used (aka. a third-party authority) and the
   * profile menu item in the client is clicked.
   *
   * See https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-onprofilerequest
   */
  | 'profileRequested'

  /**
   * The count of public annotations on the current page changed.
   *
   * See https://h.readthedocs.io/projects/client/en/latest/publishers/host-page-integration/#cmdoption-arg-data-hypothesis-annotation-count
   */
  | 'publicAnnotationCountChanged'

  /**
   * Initiate an account sign-up.
   *
   * This is used when the client is embedded in a partner site where a custom
   * Hypothesis login method is used (aka. a third-party authority) and the
   * sign-up link in the client is clicked.
   *
   * See https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-onsignuprequest
   */
  | 'signupRequested'

  /** Display a toast message in the host frame. */
  | 'toastMessageAdded'

  /** Dismiss a toast message in the host frame. */
  | 'toastMessageDismissed';
