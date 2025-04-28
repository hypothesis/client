/**
 * This module defines the messages that are sent between frames with different
 * roles in the client (guest, host, sidebar). Some messages are events in the
 * source frame (eg. the active feature flags changed, text was selected)
 * others are commands for the target frame (eg. "close the sidebar").
 */
import type { ToastMessage } from '@hypothesis/frontend-shared';

import type {
  AnchorPosition,
  AnnotationData,
  AnnotationTool,
  ContentInfoConfig,
  DocumentInfo,
  RenderToBitmapOptions,
  SidebarLayout,
} from './annotator';

/**
 * Handlers available on all RPC connections.
 *
 * These are invoked automatically when a connection is established or disconnected.
 */
export type CommonCalls = {
  /** Handler invoked when a connection is established. */
  connect(): void;

  /** Handler invoked when a connection is broken. */
  close(): void;
};

/** Represents an operation that succeeded. */
export type Success<T> = {
  ok: true;
  value: T;
};

/** Represents an operation that failed. */
export type Failure<E> = {
  ok: false;
  error: E;
};

/**
 * Result of an RPC call between frames.
 *
 * The payload on success or error must be a type that is serializable or
 * transferable. For errors note that {@link Error} is *not* serializable in
 * some older browsers. See
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#browser_compatibility.
 */
export type Result<T, E = string> = Success<T> | Failure<E>;

/** Calls that guests make to the host. */
export type GuestToHostCalls = CommonCalls & {
  /** Text has been deselected in the guest frame. */
  textUnselected(): void;

  /** Text has been selected in the guest frame. */
  textSelected(): void;

  /**
   * The active annotation tool changed.
   *
   * This is emitted when a tool like rect or point selection is activated and
   * the guest is waiting for the user to make a selection.
   */
  activeToolChanged(tool: AnnotationTool | null): void;

  /** Anchors have changed in the guest frame. */
  anchorsChanged(positions: AnchorPosition[]): void;

  /**
   * Visibility of highlights was toggled from the guest frame. This event is
   * not sent if highlights are turned on/off in the frame in response to a
   * command from the sidebar or host frames.
   */
  highlightsVisibleChanged(visible: boolean): void;

  /** The annotation tools supported by this guest have changed. */
  supportedToolsChanged(tools: AnnotationTool[]): void;
};

/**
 * Events that guests send to the sidebar.
 */
export type GuestToSidebarCalls = CommonCalls & {
  /**
   * A new annotation was created in the guest frame via the Annotate/Highlight controls.
   */
  createAnnotation(ann: AnnotationData): void;

  /** Request to close the sidebar. */
  closeSidebar(): void;

  /**
   * Indicate in the sidebar which annotation cards correspond to hovered
   * highlights in the guest.
   */
  hoverAnnotations(tags: string[]): void;

  /** Request to open the sidebar. */
  openSidebar(): void;

  /** The URIs or metadata of the document in the guest frame changed. */
  documentInfoChanged(info: DocumentInfo): void;

  /** Set the selected annotations. Emitted when the user clicks highlights in the guest frame. */
  showAnnotations(tags: string[], focusInSidebar: boolean): void;

  /** The anchoring status of annotations changed. */
  syncAnchoringStatus(ann: AnnotationData): void;

  /** Toggle whether annotations are selected. */
  toggleAnnotationSelection(tags: string[]): void;
};

/** Calls that the host makes to guest frames. */
export type HostToGuestCalls = CommonCalls & {
  /** Create a new annotation in the guest. */
  createAnnotation(opts: { tool: AnnotationTool }): void;

  /** Clear the selection in the guest frame. */
  clearSelection(): void;

  /**
   * Indicate in the guest which highlights correspond to hovered buckets in
   * the bucket bar.
   */
  hoverAnnotations(tags: string[]): void;

  /**
   * Select annotations in the guest frame.
   *
   * This is used to select annotations when the corresponding items in the
   * bucket bar are clicked.
   */
  selectAnnotations(tags: string[], toggle: boolean): void;

  /** The layout (width, open/closed state) of the sidebar changed. */
  sidebarLayoutChanged(layout: SidebarLayout): void;

  /** Scroll a highlight into view. */
  scrollToAnnotation(tag: string): void;
};

/** Calls that the host makes to the sidebar. */
export type HostToSidebarCalls = {
  /** Highlights have been toggled on/off. */
  setHighlightsVisible(visible: boolean): void;
  /** Notify the sidebar iframe that it has become visible. */
  sidebarOpened(): void;
  /** Notify the sidebar iframe that it has become hidden. */
  sidebarClosed(): void;
};

/** Calls that the sidebar makes to guests. */
export type SidebarToGuestCalls = {
  /** Remove an annotation from the guest frame. */
  deleteAnnotation(tag: string): void;

  /** The active feature flags changed. */
  featureFlagsUpdated(flags: Record<string, boolean>): void;

  /**
   * Indicate in the guest which highlights correspond to hovered annotations
   * in the sidebar.
   */
  hoverAnnotations(tags: string[]): void;

  /** Load new annotations into the guest frame. */
  loadAnnotations(anns: AnnotationData[]): void;

  /** Navigate to the segment of a book associated with an annotation. */
  navigateToSegment(ann: AnnotationData): void;

  /**
   * Render a thumbnail of the region of a document associated with an
   * annotation.
   */
  renderThumbnail(
    tag: string,
    options: RenderToBitmapOptions,
    callback: (result: Result<ImageBitmap>) => void,
  ): void;

  /** Scroll an annotation into view. */
  scrollToAnnotation(tag: string): void;

  setHighlightsVisible(visible: boolean): void;

  /**
   * Show a banner with information about the current content.
   */
  showContentInfo(info: ContentInfoConfig | null): void;

  /**
   * Show a notice that the user is outside the region of the document for the
   * current activity / assignment.
   */
  setOutsideAssignmentNoticeVisible(visible: boolean): void;
};

/** Calls that the sidebar makes to the host. */
export type SidebarToHostCalls = CommonCalls & {
  /**
   * Request from the sidebar iframe to close (ie. hide/move offscreen) its
   * container in the host frame.
   */
  closeSidebar(): void;

  /** The active feature flags changed. */
  featureFlagsUpdated(flags: Record<string, boolean>): void;

  /**
   * Open the partner site help page.
   *
   * See https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-onhelprequest
   */
  helpRequested(): void;

  /**
   * Initiate a login.
   *
   * This is used when the client is embedded in a partner site where a custom
   * Hypothesis login method is used (aka. a third-party authority) and the
   * login button in the client is clicked.
   *
   * See https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-onloginrequest
   */
  loginRequested(): void;

  /**
   * Log the user out.
   *
   * This is used when the client is embedded in a partner site where a custom
   * Hypothesis login method is used (aka. a third-party authority) and the
   * logout button in the client is clicked.
   *
   * See https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-onlogoutrequest
   */
  logoutRequested(): void;

  /** Open the notebook dialog. */
  openNotebook(groupId: string): void;

  /** Open the account settings dialog. */
  openProfile(): void;

  /** Open the sidebar container. */
  openSidebar(): void;

  /** Make highlights visible in guest frames. */
  showHighlights(): void;

  /**
   * Open the profile page for the current user.
   *
   * This is used when the client is embedded in a partner site where a custom
   * Hypothesis login method is used (aka. a third-party authority) and the
   * profile menu item in the client is clicked.
   *
   * See https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-onprofilerequest
   */
  profileRequested(): void;

  /**
   * The count of public annotations on the current page changed.
   *
   * See https://h.readthedocs.io/projects/client/en/latest/publishers/host-page-integration/#cmdoption-arg-data-hypothesis-annotation-count
   */
  publicAnnotationCountChanged(newCount: number): void;

  /**
   * Initiate an account sign-up.
   *
   * This is used when the client is embedded in a partner site where a custom
   * Hypothesis login method is used (aka. a third-party authority) and the
   * sign-up link in the client is clicked.
   *
   * See https://h.readthedocs.io/projects/client/en/latest/publishers/config/#cmdoption-arg-onsignuprequest
   */
  signupRequested(): void;

  /** Display a toast message in the host frame. */
  toastMessageAdded(message: ToastMessage): void;

  /** Dismiss a toast message in the host frame. */
  toastMessageDismissed(id: string): void;
};
