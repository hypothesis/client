import type { ToastMessage } from '@hypothesis/frontend-shared';
import { ListenerCollection } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { render } from 'preact';

import { addConfigFragment } from '../shared/config-fragment';
import { sendErrorsTo } from '../shared/frame-error-capture';
import { PortRPC } from '../shared/messaging';
import type {
  AnchorPosition,
  AnnotationTool,
  Destroyable,
  Events,
  KeyboardMode,
  SidebarLayout,
} from '../types/annotator';
import type { Service } from '../types/config';
import type {
  GuestToHostCalls,
  HostToGuestCalls,
  HostToSidebarCalls,
  SidebarToHostCalls,
} from '../types/port-rpc-calls';
import { annotationCounts } from './annotation-counts';
import { BucketBar } from './bucket-bar';
import ToastMessages from './components/ToastMessages';
import { createAppConfig } from './config/app';
import { FeatureFlags } from './features';
import { sidebarTrigger } from './sidebar-trigger';
import { ToolbarController } from './toolbar';
import { DragHandler } from './util/drag-handler';
import type { DragHandlerEvent } from './util/drag-handler';
import type { Emitter, EventBus } from './util/emitter';
import { createShadowRoot } from './util/shadow-root';

// Minimum width to which the iframeContainer can be resized.
export const MIN_RESIZE = 280;

/**
 * Client configuration used to launch the sidebar application.
 *
 * This includes the URL for the iframe and configuration to pass to the
 * application on launch.
 */
export type SidebarConfig = { sidebarAppUrl: string } & Record<string, unknown>;

/**
 * Client configuration used by the sidebar container ({@link Sidebar}).
 */
export type SidebarContainerConfig = {
  /** CSS selector for the container of the bucket bar. */
  bucketContainerSelector?: string;

  /**
   * Details of the annotation service the client should connect to.
   * This includes callbacks provided by the host page to handle certain actions
   * in the sidebar (eg. the Login button).
   */
  services?: Service[];

  /**
   * CSS selector of a container element in the host page which the sidebar
   * should be added into, instead of creating a new container.
   */
  externalContainerSelector?: string;

  /**
   * Callback that allows the host page to react to the sidebar being opened,
   * closed or resized
   */
  onLayoutChange?: (layout: SidebarLayout) => void;
};

/**
 * Create the iframe that will load the sidebar application.
 */
function createSidebarIframe(config: SidebarConfig): HTMLIFrameElement {
  const sidebarURL = config.sidebarAppUrl;
  const sidebarAppSrc = addConfigFragment(
    sidebarURL,
    createAppConfig(sidebarURL, config),
  );

  const sidebarFrame = document.createElement('iframe');

  sidebarFrame.src = sidebarAppSrc;
  sidebarFrame.title = 'Hypothesis annotation viewer';
  sidebarFrame.className = 'sidebar-frame';

  // Enable media in annotations to be shown fullscreen, and allow copying to
  // the clipboard.
  sidebarFrame.allow = 'fullscreen; clipboard-write';

  return sidebarFrame;
}

type DragResizeState = {
  /** Initial position at the start of a drag/pan resize event (in pixels). */
  initial: number | null;
  /** Final position at end of drag resize event. */
  final: number | null;
};

/**
 * The `Sidebar` class creates (1) the sidebar application iframe, (2) its container,
 * as well as (3) the adjacent controls.
 */
export class Sidebar implements Destroyable {
  private _emitter: Emitter<Events>;
  private _config: SidebarContainerConfig & SidebarConfig;
  private _dragResizeHandler: DragHandler | undefined;
  private _dragResizeState: DragResizeState;
  private _listeners: ListenerCollection;
  private _layoutState: SidebarLayout;
  private _hypothesisSidebar: HTMLElement | undefined;
  private _messagesElement: HTMLElement | undefined;
  private _toolbarWidth: number;
  private _renderFrame: number | undefined;

  /**
   * Tracks which `Guest` has a text selection. `null` indicates to default to
   * the first connected guest frame.
   */
  private _guestWithSelection: PortRPC<
    GuestToHostCalls,
    HostToGuestCalls
  > | null;

  /** Channel for host-sidebar communication. */
  private _sidebarRPC: PortRPC<SidebarToHostCalls, HostToSidebarCalls>;

  /** Channels for host-guest communication. */
  private _guestRPC: PortRPC<GuestToHostCalls, HostToGuestCalls>[];

  bucketBar: BucketBar | null;
  features: FeatureFlags;
  externalFrame: Element | undefined;
  iframeContainer: HTMLDivElement | undefined;
  toolbar: ToolbarController;
  onLoginRequest: Service['onLoginRequest'];
  onLogoutRequest: Service['onLogoutRequest'];
  onSignupRequest: Service['onSignupRequest'];
  onProfileRequest: Service['onProfileRequest'];
  onHelpRequest: Service['onHelpRequest'];
  onLayoutChange: SidebarContainerConfig['onLayoutChange'];

  /** The `<iframe>` element containing the sidebar application. */
  iframe: HTMLIFrameElement;

  /**
   * @param eventBus - Enables communication between components sharing the same
   *                   eventBus
   */
  constructor(
    element: HTMLElement,
    eventBus: EventBus<Events>,
    config: SidebarContainerConfig & SidebarConfig,
  ) {
    this._emitter = eventBus.createEmitter();
    this._guestWithSelection = null;
    this._guestRPC = [];
    this._sidebarRPC = new PortRPC();
    this.iframe = createSidebarIframe(config);
    this._config = config;
    this.bucketBar = null;
    this.features = new FeatureFlags();

    const iframeContainerId = 'sidebar-container';

    // Set up the toolbar on the left edge of the sidebar.
    const toolbarContainer = document.createElement('div');
    toolbarContainer.setAttribute('data-testid', 'toolbar-container');
    this.toolbar = new ToolbarController(toolbarContainer, {
      sidebarContainerId: iframeContainerId,
      createAnnotation: (tool: AnnotationTool | null) => {
        if (this._guestRPC.length === 0) {
          return;
        }

        const rpc = this._guestWithSelection ?? this._guestRPC[0];
        rpc.call('createAnnotation', { tool });
      },
      setSidebarOpen: open => (open ? this.open() : this.close()),
      setHighlightsVisible: show => this.setHighlightsVisible(show),
    });

    // Set up callback for mode button click - cycles through modes
    this.toolbar.modeButtonCallbacks = {
      onModeClick: () => {
        const rpc = this._getGuestRPC();
        if (!rpc) {
          return;
        }
        const currentMode = this.toolbar.keyboardModeState?.keyboardMode || 'rect';
        let nextMode: 'move' | 'resize' | 'rect';
        if (currentMode === 'rect') {
          nextMode = 'move';
        } else if (currentMode === 'move') {
          nextMode = 'resize';
        } else {
          nextMode = 'rect';
        }
        rpc.call('setKeyboardMode', { mode: nextMode });
      },
      onActivateMoveMode: () => {
        const rpc = this._getGuestRPC();
        if (!rpc) {
          return;
        }
        rpc.call('activateMoveMode');
      },
      onActivatePointMoveMode: () => {
        const rpc = this._getGuestRPC();
        if (!rpc) {
          return;
        }
        rpc.call('activatePointMoveMode');
      },
    };

    if (config.externalContainerSelector) {
      this.externalFrame =
        document.querySelector(config.externalContainerSelector) ?? element;
      this.externalFrame.appendChild(this.iframe);
    } else {
      this.iframeContainer = document.createElement('div');
      this.iframeContainer.style.display = 'none';
      this.iframeContainer.className = 'sidebar-container';
      this.iframeContainer.id = iframeContainerId;

      if (config.theme === 'clean') {
        this.iframeContainer.classList.add('theme-clean');
        // Append toolbar directly to the iframe container when clean theme is
        // enabled
        this.iframeContainer.append(toolbarContainer);
        this.toolbar.useMinimalControls = true;
      } else {
        let bucketBarContainer: HTMLElement | undefined;
        if (config.bucketContainerSelector) {
          bucketBarContainer = document.querySelector(
            config.bucketContainerSelector,
          ) as HTMLElement | undefined;
          if (!bucketBarContainer) {
            console.warn(
              `Custom bucket container "${config.bucketContainerSelector}" not found`,
            );
          }
        }

        // Create the background for the bucket bar and toolbar. This also
        // serves as the default container for the bucket bar.
        const sidebarEdge = document.createElement('div');
        sidebarEdge.setAttribute('data-testid', 'sidebar-edge');
        sidebarEdge.className = classnames(
          // Position the background along the left edge of the sidebar.
          //
          // `width` is 1px more than `left` to avoid a gap on iOS.
          // See https://github.com/hypothesis/client/pull/2750.
          'absolute top-0 bottom-0 w-[23px] left-[-22px]',

          // Make the bucket bar fill the container, with small padding on the
          // right to align the right edge of the buckets with the right edge
          // of toolbar icons.
          'flex flex-col pr-[5px]',

          // Use a grey background, with lower opacity with the sidebar is
          // collapsed, so the page content behind it can be read.
          'bg-grey-2 sidebar-collapsed:bg-black/[.08]',

          // Allow pointer events to go through this container to page elements
          // (eg. scroll bar thumbs) which are behind it.
          'pointer-events-none',
        );

        // Allow pointer events in the toolbar
        toolbarContainer.className = 'pointer-events-auto';
        sidebarEdge.append(toolbarContainer);

        this.iframeContainer.append(sidebarEdge);

        if (!bucketBarContainer) {
          bucketBarContainer = sidebarEdge;
        }

        this.bucketBar = new BucketBar(bucketBarContainer, {
          onFocusAnnotations: tags =>
            this._guestRPC.forEach(rpc => rpc.call('hoverAnnotations', tags)),
          onScrollToAnnotation: tag =>
            this._guestRPC.forEach(rpc => rpc.call('scrollToAnnotation', tag)),
          onSelectAnnotations: (tags, toggle) =>
            this._guestRPC.forEach(rpc =>
              rpc.call('selectAnnotations', tags, toggle),
            ),
        });
      }

      this.iframeContainer.appendChild(this.iframe);

      // Wrap up the 'iframeContainer' element into a shadow DOM, so it is not
      // affected by host CSS styles
      this._hypothesisSidebar = document.createElement('hypothesis-sidebar');
      const { shadowRoot, stylesLoaded } = createShadowRoot(
        this._hypothesisSidebar,
      );
      shadowRoot.appendChild(this.iframeContainer);

      // If the sidebar is opened before styles have finished loading, then we
      // may need to adjust the size afterwards.
      stylesLoaded.then(() => this._onResize());

      element.appendChild(this._hypothesisSidebar);

      // Render a container for toast messages in the host frame. The sidebar
      // will forward messages to render here while it is collapsed.
      this._messagesElement = document.createElement('div');
      shadowRoot.appendChild(this._messagesElement);
      render(<ToastMessages emitter={this._emitter} />, this._messagesElement);
    }

    // Register the sidebar as a handler for Hypothesis errors in this frame.
    if (this.iframe.contentWindow) {
      sendErrorsTo(this.iframe.contentWindow);
    }

    this._listeners = new ListenerCollection();

    if (this.iframeContainer) {
      // If using our own container frame for the sidebar, infer the width from
      // it.
      this._toolbarWidth = this.toolbar.getWidth();
    } else {
      // If using a host-page provided container for the sidebar, the toolbar is
      // not shown.
      this._toolbarWidth = 0;
    }

    this._listeners.add(window, 'resize', () => this._onResize());

    this._dragResizeState = {
      initial: null,
      final: null,
    };

    const toggleButton = this.toolbar.sidebarToggleButton;
    if (toggleButton) {
      this._dragResizeHandler = new DragHandler({
        target: toggleButton,
        onDrag: event => this._onDragSidebarToggleButton(event),
      });
    }

    this.close();

    // Publisher-provided callback functions
    const [serviceConfig] = config.services || [];
    if (serviceConfig) {
      this.onLoginRequest = serviceConfig.onLoginRequest;
      this.onLogoutRequest = serviceConfig.onLogoutRequest;
      this.onSignupRequest = serviceConfig.onSignupRequest;
      this.onProfileRequest = serviceConfig.onProfileRequest;
      this.onHelpRequest = serviceConfig.onHelpRequest;
    }

    this.onLayoutChange = config.onLayoutChange;

    this._layoutState = {
      expanded: false,
      width: 0,
      height: 0,
      toolbarWidth: 0,
    };

    // Initial layout notification
    this._updateLayoutState(false);
    this._setupSidebarEvents();
  }

  /** First connected guest RPC, or null if none. */
  private _getGuestRPC(): PortRPC<GuestToHostCalls, HostToGuestCalls> | null {
    return this._guestRPC[0] ?? null;
  }

  destroy() {
    this._guestRPC.forEach(rpc => rpc.destroy());
    this._sidebarRPC.destroy();
    this.bucketBar?.destroy();
    this._listeners.removeAll();
    this._dragResizeHandler?.destroy();
    if (this._hypothesisSidebar) {
      // Explicitly unmounting the "messages" element, to make sure effects are clean-up
      render(null, this._messagesElement!);
      this._hypothesisSidebar.remove();
    } else {
      this.iframe.remove();
    }
    this._emitter.destroy();

    // Unregister the sidebar iframe as a handler for errors in this frame.
    sendErrorsTo(null);
  }

  /**
   * Setup communication with a frame that has connected to the host.
   */
  onFrameConnected(source: 'guest' | 'sidebar', port: MessagePort) {
    switch (source) {
      case 'guest':
        this._connectGuest(port);
        break;
      case 'sidebar':
        this._sidebarRPC.connect(port);
        break;
    }
  }

  _connectGuest(port: MessagePort) {
    const guestRPC = new PortRPC<GuestToHostCalls, HostToGuestCalls>();

    guestRPC.on('textSelected', () => {
      this._guestWithSelection = guestRPC;
      this.toolbar.newAnnotationType = 'annotation';
      this._guestRPC
        .filter(port => port !== guestRPC)
        .forEach(rpc => rpc.call('clearSelection'));
    });

    guestRPC.on('textUnselected', () => {
      this._guestWithSelection = null;
      this.toolbar.newAnnotationType = 'note';
      this._guestRPC
        .filter(port => port !== guestRPC)
        .forEach(rpc => rpc.call('clearSelection'));
    });

    guestRPC.on('activeToolChanged', tool => {
      this.toolbar.activeTool = tool;
    });

    guestRPC.on('highlightsVisibleChanged', (visible: boolean) => {
      this.setHighlightsVisible(visible);
    });

    // The listener will do nothing if the sidebar doesn't have a bucket bar
    // (clean theme)
    const bucketBar = this.bucketBar;
    // Currently, we ignore `anchorsChanged` for all the guests except the first connected guest.
    if (bucketBar) {
      guestRPC.on('anchorsChanged', (positions: AnchorPosition[]) => {
        if (this._guestRPC.indexOf(guestRPC) === 0) {
          bucketBar.update(positions);
        }
      });
    }

    guestRPC.on('close', () => {
      guestRPC.destroy();
      if (guestRPC === this._guestWithSelection) {
        this._guestWithSelection = null;
      }
      this._guestRPC = this._guestRPC.filter(rpc => rpc !== guestRPC);
    });

    guestRPC.on('supportedToolsChanged', (tools: AnnotationTool[]) => {
      this.toolbar.supportedAnnotationTools = tools;
    });

    guestRPC.on('keyboardModeChanged', (state: {
      keyboardActive: boolean;
      keyboardMode: KeyboardMode;
    }) => {
      this.toolbar.keyboardModeState = state;
    });

    guestRPC.connect(port);
    this._guestRPC.push(guestRPC);

    guestRPC.call('sidebarLayoutChanged', this._layoutState);
  }

  _setupSidebarEvents() {
    annotationCounts(document.body, this._sidebarRPC);
    sidebarTrigger(document.body, () => this.open());

    this._sidebarRPC.on(
      'featureFlagsUpdated',
      (flags: Record<string, boolean>) => this.features.update(flags),
    );

    this._sidebarRPC.on('connect', () => {
      // Show the UI
      if (this.iframeContainer) {
        this.iframeContainer.style.display = '';
      }

      const showHighlights = this._config.showHighlights === 'always';
      this.setHighlightsVisible(showHighlights);

      if (
        this._config.openSidebar ||
        this._config.annotations ||
        this._config.query ||
        this._config.group
      ) {
        this.open();
      }
    });

    this._sidebarRPC.on('showHighlights', () =>
      this.setHighlightsVisible(true),
    );

    this._sidebarRPC.on('openSidebar', () => this.open());

    this._sidebarRPC.on('closeSidebar', () => this.close());

    // Sidebar listens to the `openNotebook` and `openProfile` events coming
    // from the sidebar's iframe and re-publishes them via the emitter to the
    // Notebook/Profile
    this._sidebarRPC.on('openNotebook', (groupId: string) => {
      this.hide();
      this._emitter.publish('openNotebook', groupId);
    });
    this._sidebarRPC.on('openProfile', () => {
      this.hide();
      this._emitter.publish('openProfile');
    });
    this._emitter.subscribe('closeProfile', () => {
      this.show();
    });

    this._emitter.subscribe('closeNotebook', () => {
      this.show();
    });

    // Sidebar listens to the `toastMessageAdded` and `toastMessageDismissed`
    // events coming from the sidebar's iframe and re-publishes them via the
    // emitter
    this._sidebarRPC.on('toastMessageAdded', (newMessage: ToastMessage) => {
      this._emitter.publish('toastMessageAdded', newMessage);
    });
    this._sidebarRPC.on('toastMessageDismissed', (messageId: string) => {
      this._emitter.publish('toastMessageDismissed', messageId);
    });

    // Suppressing ban-types here because the functions are originally defined
    // as `Function` somewhere else. To be fixed when that is migrated to TS
    const eventHandlers: Array<
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      [keyof SidebarToHostCalls, Function | undefined]
    > = [
      ['loginRequested', this.onLoginRequest],
      ['logoutRequested', this.onLogoutRequest],
      ['signupRequested', this.onSignupRequest],
      ['profileRequested', this.onProfileRequest],
      ['helpRequested', this.onHelpRequest],
    ];
    eventHandlers.forEach(([event, handler]) => {
      if (handler) {
        this._sidebarRPC.on(event, () => handler());
      }
    });
  }

  _resetDragResizeState() {
    this._dragResizeState = { initial: null, final: null };
  }

  // Schedule any changes needed to update the sidebar layout.
  _updateLayout() {
    // Only schedule one frame at a time.
    if (this._renderFrame) {
      return;
    }

    // Schedule a frame.
    this._renderFrame = requestAnimationFrame(() => {
      this._renderFrame = undefined;

      if (
        typeof this._dragResizeState.final === 'number' &&
        this._dragResizeState.final !== this._dragResizeState.initial &&
        this.iframeContainer
      ) {
        const margin = this._dragResizeState.final;
        const width = -margin;
        this.iframeContainer.style.marginLeft = `${margin}px`;
        if (width >= MIN_RESIZE) {
          this.iframeContainer.style.width = `${width}px`;
        }
        this._updateLayoutState();
      }
    });
  }

  /**
   * Update the current layout state and notify the embedder if they provided
   * an `onLayoutChange` callback in the Hypothesis config, as well as guests
   * so they can enable/adapt side-by-side mode.
   *
   * This is called when the sidebar is opened, closed or resized.
   *
   * @param expanded -
   *   `true` or `false` if the sidebar is being directly opened or closed, as
   *   opposed to being resized via the sidebar's drag handles
   */
  _updateLayoutState(expanded?: boolean) {
    // The sidebar structure is:
    //
    // [ Toolbar    ][                                   ]
    // [ ---------- ][ Sidebar iframe container (@frame) ]
    // [ Bucket Bar ][                                   ]
    //
    // The sidebar iframe is hidden or shown by adjusting the left margin of
    // its container.

    const toolbarWidth = (this.iframeContainer && this.toolbar.getWidth()) || 0;
    const frame: Element = this.iframeContainer ?? this.externalFrame!;
    const { height } = frame.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(frame);
    const width = parseInt(computedStyle.width);
    const leftMargin = parseInt(computedStyle.marginLeft);

    // The width of the sidebar that is visible on screen, including the
    // toolbar, which is always visible.
    let frameVisibleWidth = toolbarWidth;

    if (typeof expanded === 'boolean') {
      if (expanded) {
        frameVisibleWidth += width;
      }
    } else {
      if (leftMargin < MIN_RESIZE) {
        frameVisibleWidth -= leftMargin;
      } else {
        frameVisibleWidth += width;
      }

      // Infer expanded state based on whether at least part of the sidebar
      // frame is visible.
      expanded = frameVisibleWidth > toolbarWidth;
    }

    const layoutState: SidebarLayout = {
      expanded,
      width: expanded ? frameVisibleWidth : toolbarWidth,
      height,
      toolbarWidth,
    };

    this._layoutState = layoutState;
    this.onLayoutChange?.(layoutState);

    this._guestRPC.forEach(rpc =>
      rpc.call('sidebarLayoutChanged', layoutState),
    );
  }

  /**
   * Update the horizontal position of the sidebar.
   *
   * This should be invoked when the window is resized or the intrinsic size
   * of the sidebar changes (eg. because asynchronously loaded styles finish
   * loading).
   */
  _onResize() {
    if (!this.toolbar.sidebarOpen) {
      return;
    }

    if (window.innerWidth < MIN_RESIZE) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Return true if the user is currently resizing the sidebar. */
  isResizing() {
    return this._dragResizeState.initial !== null;
  }

  /**
   * Event handler invoked when user drags the sidebar toggle button in order
   * to resize the sidebar.
   */
  _onDragSidebarToggleButton(event: DragHandlerEvent) {
    const frame = this.iframeContainer;
    if (!frame) {
      return;
    }

    switch (event.type) {
      case 'dragstart':
        this._resetDragResizeState();

        // Disable animated transition of sidebar position
        frame.classList.add('sidebar-no-transition');

        // Disable pointer events on the toolbar, so toolbar buttons don't
        // receive clicks when the drag ends.
        this.toolbar.container.style.pointerEvents = 'none';

        this._dragResizeState.initial = parseInt(
          getComputedStyle(frame).marginLeft,
        );

        break;
      case 'dragend':
        frame.classList.remove('sidebar-no-transition');

        // Re-enable pointer events on the toolbar.
        this.toolbar.container.style.pointerEvents = '';

        // Snap open or closed.
        if (
          this._dragResizeState.final === null ||
          this._dragResizeState.final <= -MIN_RESIZE
        ) {
          this.open();
        } else {
          this.close();
        }
        this._resetDragResizeState();
        break;
      case 'dragmove': {
        if (typeof this._dragResizeState.initial !== 'number') {
          return;
        }

        const margin = this._dragResizeState.initial;
        const delta = event.deltaX;
        this._dragResizeState.final = Math.min(Math.round(margin + delta), 0);
        this._updateLayout();
        break;
      }
    }
  }

  open() {
    this._sidebarRPC.call('sidebarOpened');

    if (this.iframeContainer) {
      const width = this.iframeContainer.getBoundingClientRect().width;
      this.iframeContainer.style.marginLeft = `${-1 * width}px`;
      this.iframeContainer.classList.remove('sidebar-collapsed');
    }

    this.toolbar.sidebarOpen = true;

    if (this._config.showHighlights === 'whenSidebarOpen') {
      this.setHighlightsVisible(true);
    }

    this._updateLayoutState(true);
  }

  close() {
    this._sidebarRPC.call('sidebarClosed');

    if (this.iframeContainer) {
      this.iframeContainer.style.marginLeft = '';
      this.iframeContainer.classList.add('sidebar-collapsed');
    }

    this.toolbar.sidebarOpen = false;

    if (this._config.showHighlights === 'whenSidebarOpen') {
      this.setHighlightsVisible(false);
    }

    this._updateLayoutState(false);
  }

  /**
   * Set whether highlights are visible in guest frames.
   */
  setHighlightsVisible(visible: boolean) {
    this.toolbar.highlightsVisible = visible;

    // Notify sidebar app of change which will in turn reflect state to guest frames.
    this._sidebarRPC.call('setHighlightsVisible', visible);
  }

  /**
   * Shows the sidebar's controls
   */
  show() {
    this.iframeContainer?.classList.remove('is-hidden');
  }

  /**
   * Hides the sidebar's controls
   */
  hide() {
    this.iframeContainer?.classList.add('is-hidden');
  }
}
