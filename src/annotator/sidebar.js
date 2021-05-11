import Hammer from 'hammerjs';

import annotationCounts from './annotation-counts';
import sidebarTrigger from './sidebar-trigger';
import { createSidebarConfig } from './config/sidebar';
import events from '../shared/bridge-events';
import features from './features';

import Guest from './guest';
import { ToolbarController } from './toolbar';
import { createShadowRoot } from './util/shadow-root';
import BucketBar from './plugin/bucket-bar';
import { DoodleController } from '../doodle/doodleController';

/**
 * @typedef LayoutState
 * @prop {boolean} expanded
 * @prop {number} width
 * @prop {number} height
 */

// Minimum width to which the frame can be resized.
const MIN_RESIZE = 280;

/**
 * Create the iframe that will load the sidebar application.
 *
 * @return {HTMLIFrameElement}
 */
function createSidebarIframe(config) {
  const sidebarConfig = createSidebarConfig(config);
  const configParam =
    'config=' + encodeURIComponent(JSON.stringify(sidebarConfig));
  const sidebarAppSrc = config.sidebarAppUrl + '#' + configParam;

  const sidebarFrame = document.createElement('iframe');

  // Enable media in annotations to be shown fullscreen
  sidebarFrame.setAttribute('allowfullscreen', '');

  sidebarFrame.src = sidebarAppSrc;
  sidebarFrame.title = 'Hypothesis annotation viewer';
  sidebarFrame.className = 'h-sidebar-iframe';

  return sidebarFrame;
}

/**
 * The `Sidebar` class creates the sidebar application iframe and its container,
 * as well as the adjacent controls.
 */
export default class Sidebar extends Guest {
  /**
   * @param {HTMLElement} element
   * @param {Record<string, any>} config
   */
  constructor(element, config) {
    super(element, config);

    let externalFrame;
    let frame;
    let hypothesisSidebar; // refers to <hypothesis-sidebar> element

    if (config.externalContainerSelector) {
      externalFrame =
        document.querySelector(config.externalContainerSelector) || element;
    } else {
      frame = document.createElement('div');
      frame.style.display = 'none';
      frame.className = 'annotator-frame';

      if (config.theme === 'clean') {
        frame.classList.add('annotator-frame--theme-clean');
      } else {
        // BucketBar is a "plugin" for legacy reasons and is now constructed here so
        // that the parent element can be passed into the constructor.
        this.plugins.BucketBar = new BucketBar(frame, {}, this);
      }

      // Undocumented switch to enable/disable the wrapping of the sidebar inside a shadow DOM
      // 2021-01-22: remove this switch after the 2021-02-05
      if (config.disableShadowSidebar) {
        element.appendChild(frame);
      } else {
        // Wrap up the 'frame' element into a shadow DOM so it is not affected by host CSS styles
        hypothesisSidebar = document.createElement('hypothesis-sidebar');
        const shadowDom = createShadowRoot(hypothesisSidebar);
        shadowDom.appendChild(frame);

        element.appendChild(hypothesisSidebar);
      }
    }

    const sidebarFrame = createSidebarIframe(config);
    (frame || externalFrame).appendChild(sidebarFrame);

    this.externalFrame = externalFrame;
    this.frame = frame;
    this.hypothesisSidebar = hypothesisSidebar;

    this.subscribe('panelReady', () => {
      // Show the UI
      if (this.frame) {
        this.frame.style.display = '';
      }
    });

    this.subscribe('beforeAnnotationCreated', annotation => {
      // When a new non-highlight annotation is created, focus
      // the sidebar so that the text editor can be focused as
      // soon as the annotation card appears
      if (!annotation.$highlight) {
        /** @type {Window} */ (sidebarFrame.contentWindow).focus();
      }
    });

    if (
      config.openSidebar ||
      config.annotations ||
      config.query ||
      config.group
    ) {
      this.subscribe('panelReady', () => this.show());
    }

    if (this.plugins.BucketBar) {
      this.plugins.BucketBar.element.addEventListener('click', () =>
        this.show()
      );
    }

    // Set up the toolbar on the left edge of the sidebar.
    const toolbarContainer = document.createElement('div');
    this.toolbar = new ToolbarController(toolbarContainer, {
      createAnnotation: () => this.createAnnotation(),
      setSidebarOpen: open => (open ? this.show() : this.hide()),
      setHighlightsVisible: show => this.setAllVisibleHighlights(show),
      setUserCanDoodle: show => this.setAllDoodleability(show),
      setDoodleOptions: options => this.setAllDoodleOptions(options),
      saveDoodle: () => this.saveDoodle(),
    });
    this.toolbar.useMinimalControls = config.theme === 'clean';

    this.doodleCanvasController = new DoodleController(
      document.getElementById('main-content'),
      {
        tool: 'pen',
        size: 5,
        color: 'red',
      }
    );

    if (this.frame) {
      // If using our own container frame for the sidebar, add the toolbar to it.
      this.frame.prepend(toolbarContainer);
      this.toolbarWidth = this.toolbar.getWidth();
    } else {
      // If using a host-page provided container for the sidebar, the toolbar is
      // not shown.
      this.toolbarWidth = 0;
    }

    this._gestureState = {
      // Initial position at the start of a drag/pan resize event (in pixels).
      initial: /** @type {number|null} */ (null),

      // Final position at end of drag resize event.
      final: /** @type {number|null} */ (null),
    };
    this._setupGestures();
    this.hide();

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

    // Initial layout notification
    this._notifyOfLayoutChange(false);
    this._setupSidebarEvents();
  }

  destroy() {
    this._hammerManager?.destroy();
    this.frame?.remove();
    this.hypothesisSidebar?.remove();
    super.destroy();
  }

  _setupSidebarEvents() {
    annotationCounts(document.body, this.crossframe);
    sidebarTrigger(document.body, () => this.show());
    features.init(this.crossframe);

    this.crossframe.on('showSidebar', () => this.show());
    this.crossframe.on('hideSidebar', () => this.hide());

    // Re-publish the crossframe event so that anything extending Delegator
    // can subscribe to it (without need for crossframe)
    this.crossframe.on('showNotebook', groupId => {
      this.hide();
      this.publish('showNotebook', [groupId]);
    });
    this.crossframe.on('hideNotebook', () => {
      this.show();
      this.publish('hideNotebook');
    });

    const eventHandlers = [
      [events.LOGIN_REQUESTED, this.onLoginRequest],
      [events.LOGOUT_REQUESTED, this.onLogoutRequest],
      [events.SIGNUP_REQUESTED, this.onSignupRequest],
      [events.PROFILE_REQUESTED, this.onProfileRequest],
      [events.HELP_REQUESTED, this.onHelpRequest],
    ];
    eventHandlers.forEach(([event, handler]) => {
      if (handler) {
        this.crossframe.on(event, () => handler());
      }
    });
  }

  _resetGestureState() {
    this._gestureState = { initial: null, final: null };
  }

  _setupGestures() {
    const toggleButton = this.toolbar.sidebarToggleButton;
    if (toggleButton) {
      // Prevent any default gestures on the handle.
      toggleButton.addEventListener('touchmove', e => e.preventDefault());

      this._hammerManager = new Hammer.Manager(toggleButton)
        // eslint-disable-next-line no-restricted-properties
        .on('panstart panend panleft panright', this._onPan.bind(this));
      this._hammerManager.add(
        new Hammer.Pan({ direction: Hammer.DIRECTION_HORIZONTAL })
      );
    }
  }

  // Schedule any changes needed to update the sidebar layout.
  _updateLayout() {
    // Only schedule one frame at a time.
    if (this.renderFrame) {
      return;
    }

    // Schedule a frame.
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = null;

      if (
        this._gestureState.final !== this._gestureState.initial &&
        this.frame
      ) {
        const margin = /** @type {number} */ (this._gestureState.final);
        const width = -margin;
        this.frame.style.marginLeft = `${margin}px`;
        if (width >= MIN_RESIZE) {
          this.frame.style.width = `${width}px`;
        }
        this._notifyOfLayoutChange();
      }
    });
  }

  /**
   * Notify integrator when sidebar is opened, closed or resized.
   *
   * @param {boolean} [expanded] -
   *   `true` or `false` if the sidebar is being directly opened or closed, as
   *   opposed to being resized via the sidebar's drag handles
   */
  _notifyOfLayoutChange(expanded) {
    // The sidebar structure is:
    //
    // [ Toolbar    ][                                   ]
    // [ ---------- ][ Sidebar iframe container (@frame) ]
    // [ Bucket Bar ][                                   ]
    //
    // The sidebar iframe is hidden or shown by adjusting the left margin of
    // its container.

    const toolbarWidth = (this.frame && this.toolbar.getWidth()) || 0;
    const frame = this.frame || this.externalFrame;
    const rect = frame.getBoundingClientRect();
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

    const layoutState = /** @type LayoutState */ ({
      expanded,
      width: expanded ? frameVisibleWidth : toolbarWidth,
      height: rect.height,
    });

    if (this.onLayoutChange) {
      this.onLayoutChange(layoutState);
    }
    this.publish('sidebarLayoutChanged', [layoutState]);
  }

  _onPan(event) {
    const frame = this.frame;
    if (!frame) {
      return;
    }

    switch (event.type) {
      case 'panstart':
        this._resetGestureState();

        // Disable animated transition of sidebar position
        frame.classList.add('annotator-no-transition');

        // Disable pointer events on the iframe.
        frame.style.pointerEvents = 'none';

        this._gestureState.initial = parseInt(
          getComputedStyle(frame).marginLeft
        );

        break;
      case 'panend':
        frame.classList.remove('annotator-no-transition');

        // Re-enable pointer events on the iframe.
        frame.style.pointerEvents = '';

        // Snap open or closed.
        if (
          this._gestureState.final === null ||
          this._gestureState.final <= -MIN_RESIZE
        ) {
          this.show();
        } else {
          this.hide();
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

  show() {
    this.crossframe.call('sidebarOpened');
    this.publish('sidebarOpened');

    if (this.frame) {
      const width = this.frame.getBoundingClientRect().width;
      this.frame.style.marginLeft = `${-1 * width}px`;
      this.frame.classList.remove('annotator-collapsed');
    }

    this.toolbar.sidebarOpen = true;

    if (this.options.showHighlights === 'whenSidebarOpen') {
      this.setVisibleHighlights(true);
    }

    this._notifyOfLayoutChange(true);
  }

  hide() {
    if (this.frame) {
      this.frame.style.marginLeft = '';
      this.frame.classList.add('annotator-collapsed');
    }

    this.toolbar.sidebarOpen = false;

    if (this.options.showHighlights === 'whenSidebarOpen') {
      this.setVisibleHighlights(false);
    }

    this._notifyOfLayoutChange(false);
  }

  /**
   * Hide or show highlights associated with annotations in the document.
   *
   * @param {boolean} shouldShowHighlights
   */
  setAllVisibleHighlights(shouldShowHighlights) {
    this.crossframe.call('setVisibleHighlights', shouldShowHighlights);
  }

  /**
   * (CreativeNTR) Toggle doodle ability on and off
   *
   * @param {boolean} shouldBeDoodleable
   */
  setAllDoodleability(shouldBeDoodleable) {
    this.crossframe.call('setDoodleability', shouldBeDoodleable);
  }

  /**
   * (CreativeNTR) Set the doodle options
   *
   * @param {object} options
   */
  setAllDoodleOptions(options) {
    this.crossframe.call('setDoodleOptions', options);
  }

  /**
   * (CreativeNTR) Save the doodle
   */
  saveDoodle() {
    this.crossframe.call('saveCurrentDoodle');
  }
}
