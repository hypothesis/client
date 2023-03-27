import * as Hammer from 'hammerjs';
import { render } from 'preact';

import type { ToastMessage } from '../shared/components/BaseToastMessages';
import { addConfigFragment } from '../shared/config-fragment';
import { sendErrorsTo } from '../shared/frame-error-capture';
import { ListenerCollection } from '../shared/listener-collection';
import { PortRPC } from '../shared/messaging';
import type {
  AnchorPosition,
  SidebarLayout,
  Destroyable,
} from '../types/annotator';
import type { Service } from '../types/config';
import type {
  GuestToHostEvent,
  HostToGuestEvent,
  HostToSidebarEvent,
  SidebarToHostEvent,
} from '../types/port-rpc-events';
import { annotationCounts } from './annotation-counts';
import { BucketBar } from './bucket-bar';
import ToastMessages from './components/ToastMessages';
import { createAppConfig } from './config/app';
import { FeatureFlags } from './features';
import { sidebarTrigger } from './sidebar-trigger';
import { ToolbarController } from './toolbar';
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
    createAppConfig(sidebarURL, config)
  );

  const sidebarFrame = document.createElement('iframe');

  // Enable media in annotations to be shown fullscreen
  sidebarFrame.setAttribute('allowfullscreen', '');

  sidebarFrame.src = sidebarAppSrc;
  sidebarFrame.title = 'Hypothesis annotation viewer';
  sidebarFrame.className = 'sidebar-frame';

  return sidebarFrame;
}

type GestureState = {
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
  private _emitter: Emitter;
  private _config: SidebarContainerConfig & SidebarConfig;
  private _listeners: ListenerCollection;
  private _gestureState: GestureState;
  private _layoutState: SidebarLayout;
  private _hammerManager: HammerManager | undefined;
  private _hypothesisSidebar: HTMLElement | undefined;
  private _messagesElement: HTMLElement | undefined;
  private _toolbarWidth: number;
  private _renderFrame: number | undefined;

  /**
   * Tracks which `Guest` has a text selection. `null` indicates to default to
   * the first connected guest frame.
   */
  private _guestWithSelection: PortRPC<
    GuestToHostEvent,
    HostToGuestEvent
  > | null;

  /** Channel for host-sidebar communication. */
  private _sidebarRPC: PortRPC<SidebarToHostEvent, HostToSidebarEvent>;

  /** Channels for host-guest communication. */
  private _guestRPC: PortRPC<GuestToHostEvent, HostToGuestEvent>[];

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
    eventBus: EventBus,
    config: SidebarContainerConfig & SidebarConfig
  ) {
    this._emitter = eventBus.createEmitter();
    this._guestWithSelection = null;
    this._guestRPC = [];
    this._sidebarRPC = new PortRPC();
    this.iframe = createSidebarIframe(config);
    this._config = config;
    this.bucketBar = null;
    this.features = new FeatureFlags();

    if (config.externalContainerSelector) {
      this.externalFrame =
        document.querySelector(config.externalContainerSelector) ?? element;
      this.externalFrame.appendChild(this.iframe);
    } else {
      this.iframeContainer = document.createElement('div');
      this.iframeContainer.style.display = 'none';
      this.iframeContainer.className = 'sidebar-container';

      if (config.theme === 'clean') {
        this.iframeContainer.classList.add('theme-clean');
      } else {
        this.bucketBar = new BucketBar(this.iframeContainer, {
          onFocusAnnotations: tags =>
            this._guestRPC.forEach(rpc => rpc.call('hoverAnnotations', tags)),
          onScrollToClosestOffScreenAnchor: (tags, direction) =>
            this._guestRPC.forEach(rpc =>
              rpc.call('scrollToClosestOffScreenAnchor', tags, direction)
            ),
          onSelectAnnotations: (tags, toggle) =>
            this._guestRPC.forEach(rpc =>
              rpc.call('selectAnnotations', tags, toggle)
            ),
        });
      }

      this.iframeContainer.appendChild(this.iframe);

      // Wrap up the 'iframeContainer' element into a shadow DOM, so it is not
      // affected by host CSS styles
      this._hypothesisSidebar = document.createElement('hypothesis-sidebar');
      const shadowRoot = createShadowRoot(this._hypothesisSidebar);
      shadowRoot.appendChild(this.iframeContainer);

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

    // Set up the toolbar on the left edge of the sidebar.
    const toolbarContainer = document.createElement('div');
    this.toolbar = new ToolbarController(toolbarContainer, {
      createAnnotation: () => {
        if (this._guestRPC.length === 0) {
          return;
        }

        const rpc = this._guestWithSelection ?? this._guestRPC[0];
        rpc.call('createAnnotation');
      },
      setSidebarOpen: open => (open ? this.open() : this.close()),
      setHighlightsVisible: show => this.setHighlightsVisible(show),
    });

    if (config.theme === 'clean') {
      this.toolbar.useMinimalControls = true;
    } else {
      this.toolbar.useMinimalControls = false;
    }

    if (this.iframeContainer) {
      // If using our own container frame for the sidebar, add the toolbar to it.
      this.iframeContainer.prepend(toolbarContainer);
      this._toolbarWidth = this.toolbar.getWidth();
    } else {
      // If using a host-page provided container for the sidebar, the toolbar is
      // not shown.
      this._toolbarWidth = 0;
    }

    this._listeners.add(window, 'resize', () => this._onResize());

    this._gestureState = {
      initial: null,
      final: null,
    };
    this._setupGestures();
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

  destroy() {
    this._guestRPC.forEach(rpc => rpc.destroy());
    this._sidebarRPC.destroy();
    this.bucketBar?.destroy();
    this._listeners.removeAll();
    this._hammerManager?.destroy();
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
    const guestRPC = new PortRPC<GuestToHostEvent, HostToGuestEvent>();

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

    guestRPC.connect(port);
    this._guestRPC.push(guestRPC);

    guestRPC.call('sidebarLayoutChanged', this._layoutState);
  }

  _setupSidebarEvents() {
    annotationCounts(document.body, this._sidebarRPC);
    sidebarTrigger(document.body, () => this.open());

    this._sidebarRPC.on(
      'featureFlagsUpdated',
      (flags: Record<string, boolean>) => this.features.update(flags)
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
      this.setHighlightsVisible(true)
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
    // eslint-disable-next-line @typescript-eslint/ban-types
    const eventHandlers: Array<[SidebarToHostEvent, Function | undefined]> = [
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

  _resetGestureState() {
    this._gestureState = { initial: null, final: null };
  }

  _setupGestures() {
    const toggleButton = this.toolbar.sidebarToggleButton;
    if (toggleButton) {
      this._hammerManager = new Hammer.Manager(toggleButton);
      this._hammerManager.on(
        'panstart panend panleft panright',
        /* istanbul ignore next */
        event => this._onPan(event)
      );
      this._hammerManager.add(
        new Hammer.Pan({ direction: Hammer.DIRECTION_HORIZONTAL })
      );
    }
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
        this._gestureState.final !== this._gestureState.initial &&
        this.iframeContainer
      ) {
        const margin: number = this._gestureState.final!;
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
      rpc.call('sidebarLayoutChanged', layoutState)
    );
  }

  /**
   *  On window resize events, update the marginLeft of the sidebar by calling hide/show methods.
   */
  _onResize() {
    if (this.toolbar.sidebarOpen === true) {
      if (window.innerWidth < MIN_RESIZE) {
        this.close();
      } else {
        this.open();
      }
    }
  }

  _onPan(event: HammerInput) {
    const frame = this.iframeContainer;
    if (!frame) {
      return;
    }

    switch (event.type) {
      case 'panstart':
        this._resetGestureState();

        // Disable animated transition of sidebar position
        frame.classList.add('sidebar-no-transition');

        // Disable pointer events on the iframe.
        frame.style.pointerEvents = 'none';

        this._gestureState.initial = parseInt(
          getComputedStyle(frame).marginLeft
        );

        break;
      case 'panend':
        frame.classList.remove('sidebar-no-transition');

        // Re-enable pointer events on the iframe.
        frame.style.pointerEvents = '';

        // Snap open or closed.
        if (
          this._gestureState.final === null ||
          this._gestureState.final <= -MIN_RESIZE
        ) {
          this.open();
        } else {
          this.close();
        }
        this._resetGestureState();
        break;
      case 'panleft':
      case 'panright': {
        if (typeof this._gestureState.initial !== 'number') {
          return;
        }

        const margin = this._gestureState.initial;
        const delta = event.deltaX;
        this._gestureState.final = Math.min(Math.round(margin + delta), 0);
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
