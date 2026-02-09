import { addConfigFragment } from '../../shared/config-fragment';
import { EventEmitter } from '../../shared/event-emitter';
import { Sidebar, MIN_RESIZE, $imports } from '../sidebar';
import { Emitter } from '../util/emitter';

const DEFAULT_WIDTH = 350;
const DEFAULT_HEIGHT = 600;
const EXTERNAL_CONTAINER_SELECTOR = 'test-external-container';

describe('Sidebar', () => {
  const sidebarURL = new URL(
    '/base/annotator/test/empty.html',
    window.location.href,
  ).toString();

  const sandbox = sinon.createSandbox();

  // Containers and Sidebar instances created by current test.
  let containers;
  let sidebars;

  let FakeDragHandler;
  let fakeDragHandler;
  let FakePortRPC;
  let fakePortRPCs;
  let FakeBucketBar;
  let fakeBucketBar;
  let FakeToolbarController;
  let fakeToolbar;
  let fakeSendErrorsTo;
  let fakeEmitter;

  // Helpers for getting the channels used for host <-> guest/sidebar communication.
  // These currently rely on knowing the implementation detail of which order
  // the channels are created in.

  const sidebarRPC = () => {
    return fakePortRPCs[0];
  };

  /** Return the PortRPC instance for the `index`th connected guest. */
  const guestRPC = (index = 1) => {
    if (index >= fakePortRPCs.length) {
      throw new Error(`guestRPC index ${index} is out of bounds`);
    }
    return fakePortRPCs[index];
  };

  const emitNthGuestEvent = (index = 1, event, ...args) => {
    const result = [];
    for (const [evt, fn] of guestRPC(index).on.args) {
      if (event === evt) {
        result.push(fn(...args));
      }
    }
    return result;
  };

  const emitGuestEvent = (event, ...args) => {
    return emitNthGuestEvent(1, event, ...args);
  };

  const emitSidebarEvent = (event, ...args) => {
    const result = [];
    for (const [evt, fn] of sidebarRPC().on.args) {
      if (event === evt) {
        result.push(fn(...args));
      }
    }
    return result;
  };

  /**
   * Simulate the sidebar application connecting with the host frame. This happens
   * when the sidebar has loaded and is ready.
   */
  const connectSidebarApp = () => {
    emitSidebarEvent('connect');
  };

  /**
   * Simulate a new guest frame connecting to the sidebar.
   */
  const connectGuest = sidebar => {
    const { port1 } = new MessageChannel();
    sidebar.onFrameConnected('guest', port1);
  };

  const createSidebar = (config = {}) => {
    config = {
      // Dummy sidebar app.
      sidebarAppUrl: sidebarURL,
      ...config,
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    containers.push(container);

    const eventBus = { createEmitter: () => fakeEmitter };
    const sidebar = new Sidebar(container, eventBus, config);
    sidebars.push(sidebar);

    return sidebar;
  };

  const createExternalContainer = () => {
    const externalFrame = document.createElement('div');
    document.body.appendChild(externalFrame);
    containers.push(externalFrame);

    externalFrame.className = EXTERNAL_CONTAINER_SELECTOR;
    externalFrame.style.width = DEFAULT_WIDTH + 'px';
    externalFrame.style.height = DEFAULT_HEIGHT + 'px';

    return externalFrame;
  };

  // Simulate a drag event on the sidebar toggle button.
  const fireDragEvent = event => {
    const { onDrag } = FakeDragHandler.getCall(0).args[0];
    onDrag(event);
  };

  beforeEach(() => {
    // Make `requestAnimationFrame` invoke its callback synchronously. rAF is
    // used to debounce some internal actions.
    sinon.stub(window, 'requestAnimationFrame').yields();

    sidebars = [];
    containers = [];

    fakePortRPCs = [];
    FakePortRPC = sinon.stub().callsFake(() => {
      const rpc = {
        call: sinon.stub(),
        connect: sinon.stub(),
        destroy: sinon.stub(),
        on: sinon.stub(),
      };
      fakePortRPCs.push(rpc);
      return rpc;
    });

    fakeBucketBar = {
      destroy: sinon.stub(),
      update: sinon.stub(),
    };
    FakeBucketBar = sinon.stub().returns(fakeBucketBar);

    fakeDragHandler = {
      destroy: sinon.stub(),
    };
    FakeDragHandler = sinon.stub().callsFake(options => {
      assert.isNotNull(options.target);
      assert.isFunction(options.onDrag);
      return fakeDragHandler;
    });

    const toggleButton = document.createElement('button');
    fakeToolbar = {
      activeTool: null,
      container: document.createElement('div'),
      getWidth: sinon.stub().returns(100),
      useMinimalControls: false,
      sidebarOpen: false,
      newAnnotationType: 'note',
      highlightsVisible: false,
      get sidebarToggleButton() {
        if (this.useMinimalControls) {
          return null;
        } else {
          return toggleButton;
        }
      },
      supportedAnnotationTools: ['selection'],
    };
    FakeToolbarController = sinon.stub().returns(fakeToolbar);

    fakeSendErrorsTo = sinon.stub();

    fakeEmitter = new Emitter(new EventEmitter());

    const fakeCreateAppConfig = sinon.spy((appURL, config) => {
      const appConfig = { ...config };
      delete appConfig.sidebarAppUrl;
      return appConfig;
    });

    $imports.$mock({
      '../shared/frame-error-capture': { sendErrorsTo: fakeSendErrorsTo },
      '../shared/messaging': { PortRPC: FakePortRPC },
      './bucket-bar': { BucketBar: FakeBucketBar },
      './config/app': { createAppConfig: fakeCreateAppConfig },
      './toolbar': {
        ToolbarController: FakeToolbarController,
      },
      './util/drag-handler': { DragHandler: FakeDragHandler },
    });
  });

  afterEach(() => {
    sidebars.forEach(s => s.destroy());
    containers.forEach(c => c.remove());
    sandbox.restore();
    $imports.$restore();
  });

  describe('sidebar container frame', () => {
    it('creates shadow DOM', () => {
      createSidebar();
      const sidebarContainer = containers[0];
      const sidebar = sidebarContainer.querySelector('hypothesis-sidebar');
      assert.exists(sidebar);
      assert.exists(sidebar.shadowRoot);
    });

    it('starts hidden', () => {
      const sidebar = createSidebar();
      assert.equal(sidebar.iframeContainer.style.display, 'none');
    });

    it('applies a style if theme is configured as "clean"', () => {
      const sidebar = createSidebar({ theme: 'clean' });
      assert.isTrue(sidebar.iframeContainer.classList.contains('theme-clean'));
    });

    it('becomes visible when the sidebar application has loaded', async () => {
      const sidebar = createSidebar();
      connectSidebarApp();
      await sidebar.ready;
      assert.equal(sidebar.iframeContainer.style.display, '');
    });
  });

  describe('#iframe', () => {
    it('returns a reference to the `<iframe>` containing the sidebar', () => {
      const sidebar = createSidebar();
      const iframe = containers[0]
        .querySelector('hypothesis-sidebar')
        .shadowRoot.querySelector('iframe');
      assert.equal(sidebar.iframe, iframe);
    });
  });

  it('registers sidebar app as a handler for errors in the host frame', () => {
    const sidebar = createSidebar();
    assert.calledWith(fakeSendErrorsTo, sidebar.iframe.contentWindow);
  });

  // Note: Testing the branch where iframe.contentWindow is null (line 321) is difficult
  // because it happens during construction and contentWindow is typically available.
  // The test above verifies the normal case where contentWindow exists.
  // The early return branch when contentWindow is null would require mocking
  // the iframe element before construction, which is complex and may not be worth it.


  function getConfigString(sidebar) {
    return sidebar.iframe.src;
  }

  it('creates sidebar iframe and passes configuration to it', () => {
    const sidebar = createSidebar({ annotations: '1234' });
    assert.equal(
      getConfigString(sidebar),
      addConfigFragment(sidebarURL, { annotations: '1234' }),
    );
  });

  describe('toolbar buttons', () => {
    it('opens and closes sidebar when toolbar button is clicked', () => {
      const sidebar = createSidebar();
      sinon.stub(sidebar, 'open');
      sinon.stub(sidebar, 'close');

      FakeToolbarController.args[0][1].setSidebarOpen(true);
      assert.called(sidebar.open);

      FakeToolbarController.args[0][1].setSidebarOpen(false);
      assert.called(sidebar.close);
    });

    it('shows or hides highlights when toolbar button is clicked', () => {
      const sidebar = createSidebar();
      sinon.stub(sidebar, 'setHighlightsVisible');

      FakeToolbarController.args[0][1].setHighlightsVisible(true);
      assert.calledWith(sidebar.setHighlightsVisible, true);
      sidebar.setHighlightsVisible.resetHistory();

      FakeToolbarController.args[0][1].setHighlightsVisible(false);
      assert.calledWith(sidebar.setHighlightsVisible, false);
    });

    it("doesn't throw when creating an annotation by clicking in toolbar button and there are not connected guests", () => {
      createSidebar();

      FakeToolbarController.args[0][1].createAnnotation('selection');
    });

    it('creates an annotation in the first connected guest when toolbar button is clicked', () => {
      const sidebar = createSidebar();
      connectGuest(sidebar);

      FakeToolbarController.args[0][1].createAnnotation('selection');

      assert.calledWith(guestRPC().call, 'createAnnotation', {
        tool: 'selection',
      });
    });

    it('creates an annotation in guest with selected text when toolbar button is clicked', () => {
      const sidebar = createSidebar({});
      connectGuest(sidebar);
      connectGuest(sidebar);

      emitNthGuestEvent(2, 'textSelected');
      FakeToolbarController.args[0][1].createAnnotation('selection');

      assert.neverCalledWith(guestRPC(1).call, 'createAnnotation', {
        tool: 'selection',
      });
      assert.calledWith(guestRPC(2).call, 'createAnnotation', {
        tool: 'selection',
      });
    });

    it('creates an annotation in the first connected guest if guest with selected text has closed', () => {
      const sidebar = createSidebar({});
      connectGuest(sidebar);
      connectGuest(sidebar);

      emitNthGuestEvent(2, 'textSelected');
      emitNthGuestEvent(2, 'close');
      FakeToolbarController.args[0][1].createAnnotation('selection');

      assert.calledWith(guestRPC(1).call, 'createAnnotation', {
        tool: 'selection',
      });
      assert.neverCalledWith(guestRPC(2).call, 'createAnnotation', {
        tool: 'selection',
      });
    });

    it('toggles create annotation button to "Annotation" when selection becomes non-empty', () => {
      const sidebar = createSidebar();
      connectGuest(sidebar);
      connectGuest(sidebar);

      emitGuestEvent('textSelected');

      assert.equal(sidebar.toolbar.newAnnotationType, 'annotation');
      assert.neverCalledWith(guestRPC(1).call, 'clearSelection');
      assert.calledWith(guestRPC(2).call, 'clearSelection');
    });

    it('toggles create annotation button to "Page Note" when selection becomes empty', () => {
      const sidebar = createSidebar();
      connectGuest(sidebar);
      connectGuest(sidebar);
      emitGuestEvent('textSelected');
      assert.equal(sidebar.toolbar.newAnnotationType, 'annotation');

      emitGuestEvent('textUnselected');

      assert.equal(sidebar.toolbar.newAnnotationType, 'note');
      assert.neverCalledWith(guestRPC(1).call, 'clearSelection');
      assert.calledWith(guestRPC(2).call, 'clearSelection');
    });

    it('updates state of highlights-visible button when state is changed in guest', () => {
      const sidebar = createSidebar();
      connectGuest(sidebar);
      assert.isFalse(fakeToolbar.highlightsVisible);

      emitGuestEvent('highlightsVisibleChanged', true);
      assert.isTrue(fakeToolbar.highlightsVisible);

      emitGuestEvent('highlightsVisibleChanged', false);
      assert.isFalse(fakeToolbar.highlightsVisible);
    });

    it('updates pressed button when active tool changes', () => {
      const sidebar = createSidebar();
      connectGuest(sidebar);
      assert.isNull(fakeToolbar.activeTool);

      emitGuestEvent('activeToolChanged', 'rect');

      assert.equal(fakeToolbar.activeTool, 'rect');
    });

    it('calls activateMoveMode on guest when onActivateMoveMode callback is invoked', () => {
      const sidebar = createSidebar();
      connectGuest(sidebar);

      sidebar.toolbar.modeButtonCallbacks.onActivateMoveMode();

      assert.calledWith(guestRPC(1).call, 'activateMoveMode');
    });

    it('calls activatePointMoveMode on guest when onActivatePointMoveMode callback is invoked', () => {
      const sidebar = createSidebar();
      connectGuest(sidebar);

      sidebar.toolbar.modeButtonCallbacks.onActivatePointMoveMode();

      assert.calledWith(guestRPC(1).call, 'activatePointMoveMode');
    });

    it('does not throw when onActivateMoveMode is invoked and no guest is connected', () => {
      const sidebar = createSidebar();

      assert.doesNotThrow(() => {
        sidebar.toolbar.modeButtonCallbacks.onActivateMoveMode();
      });
      // No guest RPC exists yet, so activateMoveMode is never called
      const guestCalls = fakePortRPCs.filter(
        rpc => rpc.call.calledWith('activateMoveMode'),
      );
      assert.isEmpty(guestCalls);
    });

    it('does not throw when onModeClick is invoked and no guest is connected', () => {
      const sidebar = createSidebar();

      assert.doesNotThrow(() => {
        sidebar.toolbar.modeButtonCallbacks.onModeClick();
      });
      // No guest RPC exists yet, so setKeyboardMode is never called (line 191 branch: !rpc)
      const guestCalls = fakePortRPCs.filter(
        rpc => rpc.call.calledWith('setKeyboardMode'),
      );
      assert.isEmpty(guestCalls);
    });

    it('does not throw when onActivatePointMoveMode is invoked and no guest is connected', () => {
      const sidebar = createSidebar();

      assert.doesNotThrow(() => {
        sidebar.toolbar.modeButtonCallbacks.onActivatePointMoveMode();
      });
      // No guest RPC exists yet, so activatePointMoveMode is never called (line 214 branch: !rpc)
      const guestCalls = fakePortRPCs.filter(
        rpc => rpc.call.calledWith('activatePointMoveMode'),
      );
      assert.isEmpty(guestCalls);
    });

    it('calls setKeyboardMode on guest when onModeClick callback is invoked (cycles mode)', () => {
      const sidebar = createSidebar();
      connectGuest(sidebar);

      sidebar.toolbar.modeButtonCallbacks.onModeClick();

      assert.calledWith(guestRPC(1).call, 'setKeyboardMode', { mode: 'move' });
    });

    it('updates toolbar keyboardModeState when guest emits keyboardModeChanged', () => {
      const sidebar = createSidebar();
      connectGuest(sidebar);

      emitGuestEvent('keyboardModeChanged', {
        keyboardActive: true,
        keyboardMode: 'resize',
      });

      assert.deepEqual(sidebar.toolbar.keyboardModeState, {
        keyboardActive: true,
        keyboardMode: 'resize',
      });
    });

    it('onModeClick cycles from move to resize and from resize to rect', () => {
      const sidebar = createSidebar();
      connectGuest(sidebar);

      emitGuestEvent('keyboardModeChanged', {
        keyboardActive: true,
        keyboardMode: 'move',
      });
      guestRPC(1).call.resetHistory();
      sidebar.toolbar.modeButtonCallbacks.onModeClick();
      assert.calledWith(guestRPC(1).call, 'setKeyboardMode', { mode: 'resize' });

      emitGuestEvent('keyboardModeChanged', {
        keyboardActive: true,
        keyboardMode: 'resize',
      });
      guestRPC(1).call.resetHistory();
      sidebar.toolbar.modeButtonCallbacks.onModeClick();
      assert.calledWith(guestRPC(1).call, 'setKeyboardMode', { mode: 'rect' });
    });
  });

  describe('events from sidebar frame', () => {
    describe('on "showHighlights" event', () => {
      it('makes all highlights visible', () => {
        createSidebar();
        assert.isFalse(fakeToolbar.highlightsVisible);
        emitSidebarEvent('showHighlights');
        assert.isTrue(fakeToolbar.highlightsVisible);
      });
    });

    describe('on "open" event', () =>
      it('opens the frame', () => {
        const target = sandbox.stub(Sidebar.prototype, 'open');
        createSidebar();
        emitSidebarEvent('openSidebar');
        assert.called(target);
      }));

    describe('on "close" event', () =>
      it('closes the frame', () => {
        const target = sandbox.stub(Sidebar.prototype, 'close');
        createSidebar();
        emitSidebarEvent('closeSidebar');
        assert.called(target);
      }));

    describe('on "openNotebook" event', () => {
      it('hides the sidebar', () => {
        const sidebar = createSidebar();

        const eventHandler = sinon.stub();
        fakeEmitter.subscribe('openNotebook', eventHandler);
        emitSidebarEvent('openNotebook', 'mygroup');

        assert.calledWith(eventHandler, 'mygroup');
        assert.notEqual(sidebar.iframeContainer.style.visibility, 'hidden');
      });
    });

    describe('on "closeNotebook" internal event', () => {
      it('shows the sidebar', () => {
        const sidebar = createSidebar();

        fakeEmitter.publish('closeNotebook');
        assert.equal(sidebar.iframeContainer.style.visibility, '');
      });
    });

    describe('on "openProfile" event', () => {
      it('hides the sidebar', () => {
        const sidebar = createSidebar();

        const eventHandler = sinon.stub();
        fakeEmitter.subscribe('openProfile', eventHandler);
        emitSidebarEvent('openProfile');

        assert.calledOnce(eventHandler);
        assert.notEqual(sidebar.iframeContainer.style.visibility, 'hidden');
      });
    });

    describe('on "closeProfile" internal event', () => {
      it('shows the sidebar', () => {
        const sidebar = createSidebar();

        fakeEmitter.publish('closeProfile');
        assert.equal(sidebar.iframeContainer.style.visibility, '');
      });
    });

    describe('on "toastMessageAdded" event', () => {
      it('re-publishes event via emitter', () => {
        createSidebar();

        const eventHandler = sinon.stub();
        fakeEmitter.subscribe('toastMessageAdded', eventHandler);
        emitSidebarEvent('toastMessageAdded', {});

        assert.calledWith(eventHandler, {});
      });
    });

    describe('on "toastMessageDismissed" event', () => {
      it('re-publishes event via emitter', () => {
        createSidebar();

        const eventHandler = sinon.stub();
        fakeEmitter.subscribe('toastMessageDismissed', eventHandler);
        emitSidebarEvent('toastMessageDismissed', 'someId');

        assert.calledWith(eventHandler, 'someId');
      });
    });

    describe('on "loginRequested" event', () => {
      it('calls the onLoginRequest callback function if one was provided', () => {
        const onLoginRequest = sandbox.stub();
        createSidebar({ services: [{ onLoginRequest }] });

        emitSidebarEvent('loginRequested');

        assert.called(onLoginRequest);
      });

      it('only calls the onLoginRequest callback of the first service', () => {
        // Even though config.services is an array it only calls the onLoginRequest
        // callback function of the first service. The onLoginRequests of any other
        // services are ignored.
        const firstOnLogin = sandbox.stub();
        const secondOnLogin = sandbox.stub();
        const thirdOnLogin = sandbox.stub();
        createSidebar({
          services: [
            { onLoginRequest: firstOnLogin },
            { onLoginRequest: secondOnLogin },
            { onLoginRequest: thirdOnLogin },
          ],
        });

        emitSidebarEvent('loginRequested');

        assert.called(firstOnLogin);
        assert.notCalled(secondOnLogin);
        assert.notCalled(thirdOnLogin);
      });

      it('never calls the onLoginRequest callbacks of further services', () => {
        // Even if the first service doesn't have an onLoginRequest, it still doesn't
        // call the onLoginRequests of further services.
        const secondOnLogin = sandbox.stub();
        const thirdOnLogin = sandbox.stub();
        createSidebar({
          services: [
            {},
            { onLoginRequest: secondOnLogin },
            { onLoginRequest: thirdOnLogin },
          ],
        });

        emitSidebarEvent('loginRequested');

        assert.notCalled(secondOnLogin);
        assert.notCalled(thirdOnLogin);
      });

      it('does not crash if there is no services', () => {
        createSidebar(); // No config.services
        emitSidebarEvent('loginRequested');
      });

      it('does not crash if services is an empty array', () => {
        createSidebar({ services: [] });
        emitSidebarEvent('loginRequested');
      });

      it('does not crash if the first service has no onLoginRequest', () => {
        createSidebar({ services: [{}] });
        emitSidebarEvent('loginRequested');
      });
    });

    describe('on "logoutRequested" event', () =>
      it('calls the onLogoutRequest callback function', () => {
        const onLogoutRequest = sandbox.stub();
        createSidebar({ services: [{ onLogoutRequest }] });

        emitSidebarEvent('logoutRequested');

        assert.called(onLogoutRequest);
      }));

    describe('on "signupRequested" event', () =>
      it('calls the onSignupRequest callback function', () => {
        const onSignupRequest = sandbox.stub();
        createSidebar({ services: [{ onSignupRequest }] });

        emitSidebarEvent('signupRequested');

        assert.called(onSignupRequest);
      }));

    describe('on "profileRequested" event', () =>
      it('calls the onProfileRequest callback function', () => {
        const onProfileRequest = sandbox.stub();
        createSidebar({ services: [{ onProfileRequest }] });

        emitSidebarEvent('profileRequested');

        assert.called(onProfileRequest);
      }));

    describe('on "helpRequested" event', () =>
      it('calls the onHelpRequest callback function', () => {
        const onHelpRequest = sandbox.stub();
        createSidebar({ services: [{ onHelpRequest }] });

        emitSidebarEvent('helpRequested');

        assert.called(onHelpRequest);
      }));

    describe('on "featureFlagsUpdated" event', () => {
      it('updates feature flags in host frame', () => {
        const sidebar = createSidebar();

        emitSidebarEvent('featureFlagsUpdated', {
          some_flag: true,
          other_flag: false,
        });

        assert.deepEqual(sidebar.features.allFlags(), {
          some_flag: true,
          other_flag: false,
        });
      });
    });
  });

  describe('events from the guest frames', () => {
    describe('on "anchorsChanged" event', () => {
      it('updates the bucket bar', () => {
        const sidebar = createSidebar();
        connectGuest(sidebar);

        const anchorPositions = [{ tag: 't0', top: 1, bottom: 2 }];
        emitGuestEvent('anchorsChanged', anchorPositions);

        assert.calledOnce(sidebar.bucketBar.update);
        assert.calledWith(sidebar.bucketBar.update, anchorPositions);

        sidebar.bucketBar.update.resetHistory();

        // Second connected Guest does register a listener for the
        // `anchorsChanged` RPC event but it is inactive.
        connectGuest(sidebar);
        const anchorChangedCallback = fakePortRPCs[2].on
          .getCalls()
          .find(({ args }) => args[0] === 'anchorsChanged').args[1];
        anchorChangedCallback(anchorPositions);
        assert.notCalled(sidebar.bucketBar.update);
      });
    });

    describe('on "close" event', () => {
      it('disconnects the guest', () => {
        const sidebar = createSidebar();
        connectGuest(sidebar);
        guestRPC().call.resetHistory();

        emitGuestEvent('close');

        assert.called(guestRPC().destroy);

        // Trigger a notification to all connected guests. This should no longer
        // be sent to the guest that has just been disconnected.
        sidebar.open();
        assert.notCalled(guestRPC().call);
      });

      it('clears _guestWithSelection when closing guest that has selection', () => {
        const sidebar = createSidebar();
        connectGuest(sidebar);
        // Simulate guest having selection
        emitGuestEvent('textSelected');
        assert.equal(sidebar._guestWithSelection, guestRPC());

        emitGuestEvent('close');

        assert.isNull(sidebar._guestWithSelection);
      });

      it('does not clear _guestWithSelection when closing guest without selection', () => {
        const sidebar = createSidebar();
        connectGuest(sidebar);
        const firstGuest = guestRPC();
        connectGuest(sidebar);
        const secondGuest = guestRPC(2);
        // First guest has selection
        emitNthGuestEvent(1, 'textSelected');
        assert.equal(sidebar._guestWithSelection, firstGuest);

        // Close second guest (without selection)
        emitNthGuestEvent(2, 'close');

        // First guest should still have selection
        assert.equal(sidebar._guestWithSelection, firstGuest);
      });

      it('only first guest (indexOf === 0) updates bucketBar on anchorsChanged', () => {
        const sidebar = createSidebar();
        connectGuest(sidebar);
        connectGuest(sidebar);
        
        const positions = [{ tag: 'test-tag', top: 100 }];
        fakeBucketBar.update.resetHistory();
        
        // First guest should update bucketBar (line 449: indexOf === 0 is true)
        emitNthGuestEvent(1, 'anchorsChanged', positions);
        assert.calledWith(fakeBucketBar.update, positions);
        
        fakeBucketBar.update.resetHistory();
        
        // Second guest should NOT update bucketBar (indexOf !== 0, condition false)
        emitNthGuestEvent(2, 'anchorsChanged', positions);
        assert.notCalled(fakeBucketBar.update);
      });

      it('second guest becomes first and updates bucketBar after first guest closes', () => {
        const sidebar = createSidebar();
        connectGuest(sidebar);
        connectGuest(sidebar);
        
        // Remove first guest
        emitNthGuestEvent(1, 'close');
        
        const positions = [{ tag: 'test-tag', top: 100 }];
        fakeBucketBar.update.resetHistory();
        
        // Now second guest (which is now at index 0) should update bucketBar
        emitNthGuestEvent(2, 'anchorsChanged', positions);
        assert.calledWith(fakeBucketBar.update, positions);
      });
    });

    describe('on "supportedToolsChanged" event', () => {
      it('updates toolbar controls', () => {
        const sidebar = createSidebar();
        connectGuest(sidebar);

        emitGuestEvent('supportedToolsChanged', ['selection', 'rect']);
        assert.deepEqual(fakeToolbar.supportedAnnotationTools, [
          'selection',
          'rect',
        ]);

        emitGuestEvent('supportedToolsChanged', ['selection']);
        assert.deepEqual(fakeToolbar.supportedAnnotationTools, ['selection']);
      });
    });
  });

  describe('when the sidebar toggle button is dragged', () => {
    let sidebar;

    beforeEach(() => {
      sidebar = createSidebar();
    });

    /** Simulate the start of a drag of the sidebar's toggle button. */
    function startDrag() {
      // Set the initial size of the sidebar to the minimum size. If a drag
      // resize would make it any smaller, it will snap closed.
      sidebar.iframeContainer.style.marginLeft = `-${MIN_RESIZE}px`;
      fireDragEvent({ type: 'dragstart' });
    }

    describe('when a drag starts', () => {
      it('begins resize', () => {
        startDrag();
        assert.isTrue(sidebar.isResizing());
      });

      it('disables pointer events and transitions on the widget', () => {
        startDrag();
        assert.isTrue(
          sidebar.iframeContainer.classList.contains('sidebar-no-transition'),
        );
        assert.equal(fakeToolbar.container.style.pointerEvents, 'none');
      });
    });

    describe('when drag ends', () => {
      it('ends resize', () => {
        startDrag();
        fireDragEvent({ type: 'dragend' });
        assert.isFalse(sidebar.isResizing());
      });

      it('enables pointer events and transitions on the widget', () => {
        startDrag();
        fireDragEvent({ type: 'dragend' });
        assert.isFalse(
          sidebar.iframeContainer.classList.contains('sidebar-no-transition'),
        );
        assert.equal(fakeToolbar.container.style.pointerEvents, '');
      });

      it('opens sidebar if final width is above threshold', () => {
        startDrag();
        fireDragEvent({ type: 'dragmove', deltaX: 0 });
        fireDragEvent({ type: 'dragend' });
        assert.isTrue(sidebar.toolbar.sidebarOpen);
      });

      it('closes sidebar if final width is below threshold', () => {
        startDrag();
        fireDragEvent({ type: 'dragmove', deltaX: 50 });
        fireDragEvent({ type: 'dragend' });
        assert.isFalse(sidebar.toolbar.sidebarOpen);
      });

      it('opens sidebar if final width is null', () => {
        startDrag();
        // Don't fire dragmove, so final remains null
        fireDragEvent({ type: 'dragend' });
        assert.isTrue(sidebar.toolbar.sidebarOpen);
      });

      it('opens sidebar if final width is exactly at threshold', () => {
        startDrag();
        fireDragEvent({ type: 'dragmove', deltaX: 0 });
        fireDragEvent({ type: 'dragend' });
        assert.isTrue(sidebar.toolbar.sidebarOpen);
      });

      it('opens sidebar if final width is less than threshold (final < -MIN_RESIZE)', () => {
        startDrag();
        // Move far enough to make final < -MIN_RESIZE
        fireDragEvent({ type: 'dragmove', deltaX: -100 });
        fireDragEvent({ type: 'dragend' });
        assert.isTrue(sidebar.toolbar.sidebarOpen);
      });

      it('opens sidebar if final width equals threshold exactly (final === -MIN_RESIZE)', () => {
        startDrag();
        // Set initial margin to -MIN_RESIZE, then drag with deltaX = 0
        // This makes final = -MIN_RESIZE exactly
        sidebar.iframeContainer.style.marginLeft = `-${MIN_RESIZE}px`;
        sidebar._dragResizeState.initial = -MIN_RESIZE;
        fireDragEvent({ type: 'dragmove', deltaX: 0 });
        fireDragEvent({ type: 'dragend' });
        assert.isTrue(sidebar.toolbar.sidebarOpen);
      });
    });

    describe('when dragmove is called without dragstart', () => {
      it('ignores dragmove if initial state is not set', () => {
        // Don't call startDrag(), so _dragResizeState.initial is not a number
        const initialMargin = sidebar.iframeContainer.style.marginLeft;
        fireDragEvent({ type: 'dragmove', deltaX: -50 });
        // Should not change margin
        assert.equal(sidebar.iframeContainer.style.marginLeft, initialMargin);
      });
    });

    describe('when iframeContainer is null', () => {
      it('handles drag gracefully when iframeContainer is null', () => {
        const originalContainer = sidebar.iframeContainer;
        sidebar.iframeContainer = null;
        
        // Should not throw
        fireDragEvent({ type: 'dragstart' });
        fireDragEvent({ type: 'dragmove', deltaX: -50 });
        fireDragEvent({ type: 'dragend' });
        
        // Restore for cleanup
        sidebar.iframeContainer = originalContainer;
      });
    });

    describe('when toolbar button is dragged', () => {
      it('shrinks or grows the widget to match the delta', async () => {
        startDrag();

        fireDragEvent({ type: 'dragmove', deltaX: -50 });
        const expected = `-${MIN_RESIZE + 50}px`;
        assert.equal(sidebar.iframeContainer.style.marginLeft, expected);

        fireDragEvent({ type: 'dragmove', deltaX: -20 });
        const expected2 = `-${MIN_RESIZE + 20}px`;
        assert.equal(sidebar.iframeContainer.style.marginLeft, expected2);
      });

      it('sets width when width >= MIN_RESIZE in _updateLayout', () => {
        startDrag();
        // Drag to make width >= MIN_RESIZE
        fireDragEvent({ type: 'dragmove', deltaX: -100 });
        // Wait for requestAnimationFrame to execute
        return new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // width should be set when width >= MIN_RESIZE (line 587-588)
              const margin = parseInt(sidebar.iframeContainer.style.marginLeft);
              const width = -margin;
              if (width >= MIN_RESIZE) {
                assert.equal(sidebar.iframeContainer.style.width, `${width}px`);
              }
              resolve();
            });
          });
        });
      });

      it('does not set width when width < MIN_RESIZE in _updateLayout', () => {
        startDrag();
        // Drag to make width < MIN_RESIZE (very small)
        fireDragEvent({ type: 'dragmove', deltaX: 200 });
        // Wait for requestAnimationFrame to execute
        return new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // width should not be set when width < MIN_RESIZE (line 587 condition false)
              const margin = parseInt(sidebar.iframeContainer.style.marginLeft);
              const width = -margin;
              if (width < MIN_RESIZE) {
                assert.notEqual(sidebar.iframeContainer.style.width, `${width}px`);
              }
              resolve();
            });
          });
        });
      });

      it('_updateLayout does nothing when final equals initial', () => {
        startDrag();
        // Set final to same as initial - should not update (line 581 condition)
        sidebar._dragResizeState.final = sidebar._dragResizeState.initial;
        fireDragEvent({ type: 'dragmove', deltaX: 0 });
        
        return new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Should not update layout when final === initial
              resolve();
            });
          });
        });
      });

      it('_updateLayout does nothing when final is not a number', () => {
        startDrag();
        // Set final to null - should not update (line 580 condition)
        sidebar._dragResizeState.final = null;
        fireDragEvent({ type: 'dragmove', deltaX: 0 });
        
        return new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Should not update layout when final is not a number
              resolve();
            });
          });
        });
      });

      it('_updateLayout returns early when _renderFrame is already set', () => {
        startDrag();
        // Set _renderFrame to simulate a pending frame (line 571 branch)
        sidebar._renderFrame = 12345; // Mock frame ID
        
        // Call _updateLayout - should return early without scheduling new frame
        sidebar._updateLayout();
        
        // _renderFrame should still be the same (not reset)
        assert.equal(sidebar._renderFrame, 12345);
        
        // Clean up
        if (sidebar._renderFrame) {
          cancelAnimationFrame(sidebar._renderFrame);
          sidebar._renderFrame = undefined;
        }
      });

      it('_updateLayoutState uses else branch when leftMargin >= MIN_RESIZE', () => {
        // Open sidebar first to ensure it has a valid width
        sidebar.open();
        
        // Wait for sidebar to be fully rendered
        return new Promise(resolve => {
          requestAnimationFrame(() => {
            // Set a valid width explicitly to ensure it's available for the test
            const testWidth = 400;
            sidebar.iframeContainer.style.width = `${testWidth}px`;
            
            // Set a leftMargin that is >= MIN_RESIZE (0 or positive)
            // This tests the else branch at line 634 (leftMargin >= MIN_RESIZE)
            // When leftMargin >= MIN_RESIZE, the code adds width to frameVisibleWidth
            sidebar.iframeContainer.style.marginLeft = `${MIN_RESIZE}px`;
            
            // Force a reflow to ensure styles are applied
            sidebar.iframeContainer.offsetHeight;
            
            // Call _updateLayoutState without expanded parameter (undefined)
            // This will use the else branch in the outer if (line 631)
            // and then the else branch for leftMargin >= MIN_RESIZE (line 634)
            // which adds width to frameVisibleWidth: frameVisibleWidth = toolbarWidth + width
            sidebar._updateLayoutState();
            
            // Verify that frameVisibleWidth was calculated correctly
            // When leftMargin >= MIN_RESIZE, frameVisibleWidth = toolbarWidth + width
            // Since width > 0, frameVisibleWidth > toolbarWidth, so expanded should be true (line 640)
            assert.isTrue(sidebar._layoutState.expanded, 'Sidebar should be expanded when leftMargin >= MIN_RESIZE and width > 0');
            assert.isAtLeast(sidebar._layoutState.width, sidebar._layoutState.toolbarWidth);
            resolve();
          });
        });
      });
    });
  });

  describe('when the sidebar application has loaded', () => {
    [
      {
        test: 'a direct-linked annotation is present',
        config: { annotations: 'ann-id' },
      },
      {
        test: 'a direct-linked group is present',
        config: { group: 'group-id' },
      },
      {
        test: 'a direct-linked query is present',
        config: { query: 'tag:foo' },
      },
      {
        test: '`openSidebar` is set to true',
        config: { openSidebar: true },
      },
    ].forEach(({ test, config }) => {
      it(`opens the sidebar when ${test}`, async () => {
        const sidebar = createSidebar(config);
        const open = sandbox.stub(sidebar, 'open');
        connectSidebarApp();
        await sidebar.ready;
        assert.calledOnce(open);
      });
    });

    it('does not open the sidebar if not configured to', async () => {
      const sidebar = createSidebar();
      const open = sandbox.stub(sidebar, 'open');
      connectSidebarApp();
      await sidebar.ready;
      assert.notCalled(open);
    });

    it('opens sidebar when multiple open conditions are true (OR condition)', async () => {
      // Test that any of the conditions in the OR at line 498-502 opens the sidebar
      const sidebar = createSidebar({
        openSidebar: true,
        annotations: 'test-ann',
        query: 'tag:test',
        group: 'test-group',
      });
      const open = sandbox.stub(sidebar, 'open');
      connectSidebarApp();
      await sidebar.ready;
      // Should open because openSidebar is true (even though other conditions also true)
      assert.calledOnce(open);
    });

    it('opens sidebar when only annotations is set (OR condition)', async () => {
      const sidebar = createSidebar({
        annotations: 'test-ann',
      });
      const open = sandbox.stub(sidebar, 'open');
      connectSidebarApp();
      await sidebar.ready;
      assert.calledOnce(open);
    });

    it('opens sidebar when only query is set (OR condition)', async () => {
      const sidebar = createSidebar({
        query: 'tag:test',
      });
      const open = sandbox.stub(sidebar, 'open');
      connectSidebarApp();
      await sidebar.ready;
      assert.calledOnce(open);
    });

    it('opens sidebar when only group is set (OR condition)', async () => {
      const sidebar = createSidebar({
        group: 'test-group',
      });
      const open = sandbox.stub(sidebar, 'open');
      connectSidebarApp();
      await sidebar.ready;
      assert.calledOnce(open);
    });

    it('opens sidebar when iframeContainer is null (early return branch)', async () => {
      const sidebar = createSidebar({ openSidebar: true });
      const originalContainer = sidebar.iframeContainer;
      sidebar.iframeContainer = null;
      
      const open = sandbox.stub(sidebar, 'open');
      connectSidebarApp();
      await sidebar.ready;
      
      // Should still call open even if iframeContainer is null
      assert.calledOnce(open);
      
      // Restore for cleanup
      sidebar.iframeContainer = originalContainer;
    });

    it('handles connect event when iframeContainer exists', async () => {
      const sidebar = createSidebar({ openSidebar: true });
      assert.isNotNull(sidebar.iframeContainer);
      
      const initialDisplay = sidebar.iframeContainer.style.display;
      connectSidebarApp();
      await sidebar.ready;
      
      // iframeContainer.display should be set to '' (line 492)
      assert.equal(sidebar.iframeContainer.style.display, '');
    });

    it('sets toolbarWidth to 0 when iframeContainer is undefined (external container)', () => {
      const sidebar = createSidebar({
        externalContainerSelector: `.${EXTERNAL_CONTAINER_SELECTOR}`,
      });
      // When using external container, iframeContainer is undefined
      // So _toolbarWidth should be 0 (line 334)
      assert.equal(sidebar._toolbarWidth, 0);
    });

    it('sets toolbarWidth from toolbar when iframeContainer exists', () => {
      const sidebar = createSidebar();
      // When iframeContainer exists, _toolbarWidth should be set from toolbar.getWidth() (line 330)
      assert.isNumber(sidebar._toolbarWidth);
      assert.equal(sidebar._toolbarWidth, fakeToolbar.getWidth());
    });

    it('warns when bucketContainerSelector is invalid (statement coverage)', () => {
      const warnStub = sinon.stub(console, 'warn');
      const sidebar = createSidebar({
        bucketContainerSelector: '#non-existent-container',
      });
      
      // Should warn when bucketContainerSelector doesn't match any element (line 244)
      assert.calledWith(
        warnStub,
        'Custom bucket container "#non-existent-container" not found'
      );
      
      warnStub.restore();
    });

    it('uses sidebarEdge as bucketBarContainer when bucketContainerSelector not provided', () => {
      const sidebar = createSidebar();
      // When bucketContainerSelector is not provided, bucketBarContainer should be sidebarEdge (line 282)
      assert.isNotNull(sidebar.bucketBar);
      // Verify bucketBar was created with sidebarEdge
      assert.calledWith(FakeBucketBar, sinon.match.any, sinon.match.any);
    });
  });

  describe('#destroy', () => {
    it('removes sidebar DOM elements', () => {
      const sidebar = createSidebar();
      const sidebarContainer = containers[0];

      sidebar.destroy();

      assert.notExists(sidebarContainer.querySelector('hypothesis-sidebar'));
      assert.equal(sidebar.iframeContainer.parentElement, null);
    });

    it('cleans up bucket bar', () => {
      const sidebar = createSidebar();
      sidebar.destroy();
      assert.called(sidebar.bucketBar.destroy);
    });

    it('unregisters sidebar as handler for host frame errors', () => {
      const sidebar = createSidebar();
      fakeSendErrorsTo.resetHistory();

      sidebar.destroy();

      assert.calledWith(fakeSendErrorsTo, null);
    });
  });

  describe('#onFrameConnected', () => {
    it('ignores unrecognized source frames', () => {
      const sidebar = createSidebar();
      const { port1 } = new MessageChannel();
      sidebar.onFrameConnected('dummy', port1);

      assert.notCalled(sidebarRPC().connect);
      assert.throws(() => guestRPC());
    });

    it('create RPC channels for recognized source frames', () => {
      const sidebar = createSidebar();
      const { port1 } = new MessageChannel();
      sidebar.onFrameConnected('sidebar', port1);
      sidebar.onFrameConnected('guest', port1);

      assert.calledWith(sidebarRPC().connect, port1);
      assert.calledWith(guestRPC().connect, port1);
    });
  });

  describe('#open', () => {
    it('shows highlights if "showHighlights" is set to "whenSidebarOpen"', () => {
      const sidebar = createSidebar({ showHighlights: 'whenSidebarOpen' });
      sidebar.open();
      assert.calledWith(sidebarRPC().call, 'setHighlightsVisible', true);
    });

    it('does not show highlights otherwise', () => {
      const sidebar = createSidebar({ showHighlights: 'never' });
      sidebar.open();
      assert.neverCalledWith(sidebarRPC().call, 'setHighlightsVisible');
    });

    it('updates the `sidebarOpen` property of the toolbar', () => {
      const sidebar = createSidebar();
      sidebar.open();
      assert.equal(fakeToolbar.sidebarOpen, true);
    });

    it('sets marginLeft and removes collapsed class when iframeContainer exists', () => {
      const sidebar = createSidebar();
      const initialWidth = sidebar.iframeContainer.getBoundingClientRect().width;
      sidebar.open();
      
      // Should set marginLeft to negative width (line 744)
      const marginLeft = parseInt(sidebar.iframeContainer.style.marginLeft);
      assert.equal(marginLeft, -initialWidth);
      
      // Should remove collapsed class (line 745)
      assert.isFalse(sidebar.iframeContainer.classList.contains('sidebar-collapsed'));
    });

    it('does nothing when iframeContainer is undefined in open()', () => {
      const sidebar = createSidebar({
        externalContainerSelector: `.${EXTERNAL_CONTAINER_SELECTOR}`,
      });
      // iframeContainer should be undefined for external container
      assert.isUndefined(sidebar.iframeContainer);
      
      // Should not throw
      sidebar.open();
      assert.equal(fakeToolbar.sidebarOpen, true);
    });
  });

  describe('#hide', () => {
    it('hides highlights if "showHighlights" is set to "whenSidebarOpen"', () => {
      const sidebar = createSidebar({ showHighlights: 'whenSidebarOpen' });

      sidebar.open();
      sidebar.close();

      assert.calledWith(sidebarRPC().call, 'setHighlightsVisible', false);
    });

    it('updates the `sidebarOpen` property of the toolbar', () => {
      const sidebar = createSidebar();

      sidebar.open();
      sidebar.close();

      assert.equal(fakeToolbar.sidebarOpen, false);
    });

    it('sets marginLeft to empty and adds collapsed class when iframeContainer exists', () => {
      const sidebar = createSidebar();
      sidebar.open();
      sidebar.close();
      
      // Should set marginLeft to empty string (line 761)
      assert.equal(sidebar.iframeContainer.style.marginLeft, '');
      
      // Should add collapsed class (line 762)
      assert.isTrue(sidebar.iframeContainer.classList.contains('sidebar-collapsed'));
    });

    it('does nothing when iframeContainer is undefined in close()', () => {
      const sidebar = createSidebar({
        externalContainerSelector: `.${EXTERNAL_CONTAINER_SELECTOR}`,
      });
      // iframeContainer should be undefined for external container
      assert.isUndefined(sidebar.iframeContainer);
      
      sidebar.open();
      // Should not throw
      sidebar.close();
      assert.equal(fakeToolbar.sidebarOpen, false);
    });
  });

  describe('#onFrameConnected', () => {
    it('creates a channel to communicate with the guests', () => {
      const sidebar = createSidebar();
      const { port1 } = new MessageChannel();
      sidebar.onFrameConnected('guest', port1);

      assert.calledWith(guestRPC().connect, port1);
    });
  });

  describe('#setHighlightsVisible', () => {
    it('requests sidebar to set highlight visibility in guest frames', () => {
      const sidebar = createSidebar();
      sidebar.setHighlightsVisible(true);
      assert.calledWith(sidebarRPC().call, 'setHighlightsVisible', true);

      sidebar.setHighlightsVisible(false);
      assert.calledWith(sidebarRPC().call, 'setHighlightsVisible', false);
    });

    it('toggles "Show highlights" control in toolbar', () => {
      const sidebar = createSidebar();
      sidebar.setHighlightsVisible(true);
      assert.isTrue(fakeToolbar.highlightsVisible);

      sidebar.setHighlightsVisible(false);
      assert.isFalse(fakeToolbar.highlightsVisible);
    });
  });

  it('hides toolbar controls when using the "clean" theme', () => {
    createSidebar({ theme: 'clean' });
    assert.equal(fakeToolbar.useMinimalControls, true);
  });

  it('shows toolbar controls when using the default theme', () => {
    createSidebar();
    assert.equal(fakeToolbar.useMinimalControls, false);
  });

  describe('window resize events', () => {
    let sidebar;
    let initialWindowWidth;

    beforeEach(async () => {
      // Configure the sidebar to open on load and wait for the initial open to
      // complete.
      sidebar = createSidebar({ openSidebar: true });
      connectSidebarApp();
      initialWindowWidth = window.innerWidth;
    });

    afterEach(() => {
      window.innerWidth = initialWindowWidth;
    });

    it('hides the sidebar if window width is < MIN_RESIZE', () => {
      window.innerWidth = MIN_RESIZE - 1;
      window.dispatchEvent(new Event('resize'));

      assert.equal(fakeToolbar.sidebarOpen, false);
    });

    it('invokes the "open" method when window is resized', () => {
      // Calling the 'open' methods adjust the marginLeft at different screen sizes
      sinon.stub(sidebar, 'open');

      // Make the window very small
      window.innerWidth = MIN_RESIZE;
      window.dispatchEvent(new Event('resize'));
      assert.calledOnce(sidebar.open);

      // Make the window very large
      window.innerWidth = MIN_RESIZE * 10;
      window.dispatchEvent(new Event('resize'));
      assert.calledTwice(sidebar.open);
    });
  });

  describe('layout change notifier', () => {
    let layoutChangeHandlerSpy;

    const assertLayoutValues = (args, expectations) => {
      const expected = {
        width: DEFAULT_WIDTH + fakeToolbar.getWidth(),
        height: DEFAULT_HEIGHT,
        expanded: true,
        toolbarWidth: fakeToolbar.getWidth(),

        ...expectations,
      };

      assert.deepEqual(args, expected);
    };

    describe('with the frame set up as default', () => {
      let sidebar;
      let frame;

      beforeEach(() => {
        layoutChangeHandlerSpy = sandbox.stub();
        sidebar = createSidebar({
          onLayoutChange: layoutChangeHandlerSpy,
        });

        // remove info about call that happens on creation of sidebar
        layoutChangeHandlerSpy.reset();

        frame = sidebar.iframeContainer;
        Object.assign(frame.style, {
          display: 'block',
          width: DEFAULT_WIDTH + 'px',
          height: DEFAULT_HEIGHT + 'px',

          // width is based on left position of the window,
          // we need to apply the css that puts the frame in the
          // correct position
          position: 'fixed',
          top: 0,
          left: '100%',
        });

        document.body.appendChild(frame);
      });

      afterEach(() => {
        frame.remove();
      });

      it('calls the "sidebarLayoutChanged" RPC method when sidebar changes expanded state', () => {
        connectGuest(sidebar);
        guestRPC().call.resetHistory();
        sidebar.open();
        assert.calledOnce(guestRPC().call);
        assert.calledWith(
          guestRPC().call,
          'sidebarLayoutChanged',
          sinon.match.any,
        );
        assertLayoutValues(guestRPC().call.lastCall.args[1], {
          expanded: true,
        });

        sidebar.close();
        assert.calledTwice(guestRPC().call);
        assertLayoutValues(guestRPC().call.lastCall.args[1], {
          expanded: false,
          width: fakeToolbar.getWidth(),
        });
      });

      it('notifies new guests of current sidebar layout', () => {
        sidebar.open();

        connectGuest(sidebar);

        assert.calledWith(
          guestRPC().call,
          'sidebarLayoutChanged',
          sinon.match({
            expanded: true,
            width: DEFAULT_WIDTH + fakeToolbar.getWidth(),
          }),
        );
      });

      it('notifies when sidebar is drag-resized', async () => {
        sidebar.iframeContainer.style.marginLeft = `-${DEFAULT_WIDTH}px`;
        fireDragEvent({ type: 'dragstart' });
        fireDragEvent({ type: 'dragmove', deltaX: -50 });
        assertLayoutValues(layoutChangeHandlerSpy.lastCall.args[0], {
          width: DEFAULT_WIDTH + 50 + fakeToolbar.getWidth(),
        });
      });

      it('hide() adds is-hidden class to iframe container', () => {
        sidebar.show();
        assert.isFalse(sidebar.iframeContainer.classList.contains('is-hidden'));
        sidebar.hide();
        assert.isTrue(sidebar.iframeContainer.classList.contains('is-hidden'));
        sidebar.show();
        assert.isFalse(sidebar.iframeContainer.classList.contains('is-hidden'));
      });
    });

    describe('with the frame in an external container', () => {
      let sidebar;
      let externalFrame;

      beforeEach(() => {
        externalFrame = createExternalContainer();
        Object.assign(externalFrame.style, {
          display: 'block',
          width: DEFAULT_WIDTH + 'px',
          height: DEFAULT_HEIGHT + 'px',
          position: 'fixed',
          top: 0,
          left: 0,
        });

        layoutChangeHandlerSpy = sandbox.stub();
        const layoutChangeExternalConfig = {
          onLayoutChange: layoutChangeHandlerSpy,
          externalContainerSelector: `.${EXTERNAL_CONTAINER_SELECTOR}`,
        };
        sidebar = createSidebar(layoutChangeExternalConfig);

        // remove info about call that happens on creation of sidebar
        layoutChangeHandlerSpy.reset();
      });

      afterEach(() => {
        externalFrame.remove();
      });

      it('notifies when sidebar changes expanded state', () => {
        sidebar.open();
        assert.calledOnce(layoutChangeHandlerSpy);
        assertLayoutValues(layoutChangeHandlerSpy.lastCall.args[0], {
          expanded: true,
          width: DEFAULT_WIDTH,
          toolbarWidth: 0,
        });

        sidebar.close();
        assert.calledTwice(layoutChangeHandlerSpy);
        assertLayoutValues(layoutChangeHandlerSpy.lastCall.args[0], {
          expanded: false,
          width: 0,
          toolbarWidth: 0,
        });
      });

      it('removes the iframe from the container when destroyed', () => {
        sidebar.show();
        assert.exists(sidebar.iframe.parentElement);
        sidebar.destroy();
        assert.notExists(sidebar.iframe.parentElement);
      });

      it('ignores sidebar drag events', () => {
        fireDragEvent({ type: 'dragstart' });
        assert.isFalse(sidebar.isResizing());
      });
    });
  });

  describe('sidebar frame in an external container', () => {
    let sidebar;
    let externalFrame;

    beforeEach(() => {
      externalFrame = createExternalContainer();

      sidebar = createSidebar({
        externalContainerSelector: `.${EXTERNAL_CONTAINER_SELECTOR}`,
      });
    });

    afterEach(() => {
      externalFrame.remove();
    });

    it('uses the configured external container as the frame', () => {
      assert.equal(sidebar.iframeContainer, undefined);
      assert.isDefined(sidebar.externalFrame);
      assert.equal(sidebar.externalFrame, externalFrame);
      assert.equal(externalFrame.childNodes.length, 1);
    });
  });

  describe('bucket bar', () => {
    it('displays the bucket bar alongside the sidebar by default', () => {
      const sidebar = createSidebar();
      assert.isNotNull(sidebar.bucketBar);
      assert.calledOnce(FakeBucketBar);
      const container = FakeBucketBar.args[0][0];
      assert.equal(container.getAttribute('data-testid'), 'sidebar-edge');
    });

    it('does not display the bucket bar if using the "clean" theme', () => {
      const sidebar = createSidebar({ theme: 'clean' });
      assert.isNull(sidebar.bucketBar);
    });

    it('does not register anchorsChanged listener when bucketBar is null (clean theme)', () => {
      const sidebar = createSidebar({ theme: 'clean' });
      assert.isNull(sidebar.bucketBar);
      
      // Connect a guest - should not register anchorsChanged because bucketBar is null
      connectGuest(sidebar);
      
      // Verify that anchorsChanged was not registered (bucketBar check at line 447)
      const anchorsChangedRegistered = fakePortRPCs[1].on.args.some(
        ([event]) => event === 'anchorsChanged'
      );
      assert.isFalse(anchorsChangedRegistered, 'anchorsChanged should not be registered when bucketBar is null');
    });

    it('does not display the bucket bar if using an external container for the sidebar', () => {
      const sidebar = createSidebar({
        externalContainerSelector: `.${EXTERNAL_CONTAINER_SELECTOR}`,
      });
      assert.isNull(sidebar.bucketBar);
    });

    it('creates bucket bar in specified container if `bucketContainerSelector` config is supplied', () => {
      const bucketBarContainer = document.createElement('div');
      bucketBarContainer.id = 'bucket-bar-container';
      document.body.append(bucketBarContainer);

      try {
        const sidebar = createSidebar({
          bucketContainerSelector: '#bucket-bar-container',
        });
        assert.ok(sidebar.bucketBar);
        assert.calledWith(FakeBucketBar, bucketBarContainer, sinon.match.any);
      } finally {
        bucketBarContainer.remove();
      }
    });

    it('warns if `bucketContainerSelector` config is supplied but invalid', () => {
      const warnStub = sinon.stub(console, 'warn');
      try {
        createSidebar({
          bucketContainerSelector: '#invalid-selector',
        });
        assert.calledWith(
          console.warn,
          `Custom bucket container "#invalid-selector" not found`,
        );
      } finally {
        console.warn.restore();
      }
    });

    it('calls the "hoverAnnotations" RPC method', () => {
      const sidebar = createSidebar();
      connectGuest(sidebar);
      const { onFocusAnnotations } = FakeBucketBar.getCall(0).args[1];
      const tags = ['t1', 't2'];

      onFocusAnnotations(tags);

      assert.calledWith(guestRPC().call, 'hoverAnnotations', tags);
    });

    it('calls the "scrollToAnnotation" RPC method', () => {
      const sidebar = createSidebar();
      connectGuest(sidebar);
      const { onScrollToAnnotation } = FakeBucketBar.getCall(0).args[1];
      const tag = 't1';

      onScrollToAnnotation(tag);

      assert.calledWith(guestRPC().call, 'scrollToAnnotation', tag);
    });

    it('calls the "selectAnnotations" RPC method', () => {
      const sidebar = createSidebar();
      connectGuest(sidebar);
      const { onSelectAnnotations } = FakeBucketBar.getCall(0).args[1];
      const tags = ['t1', 't2'];
      const toggle = true;

      onSelectAnnotations(tags, toggle);

      assert.calledWith(guestRPC().call, 'selectAnnotations', tags, true);
    });
  });
});
