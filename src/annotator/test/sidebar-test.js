import { addConfigFragment } from '../../shared/config-fragment';
import { Sidebar, MIN_RESIZE, $imports } from '../sidebar';
import { EventBus } from '../util/emitter';

const DEFAULT_WIDTH = 350;
const DEFAULT_HEIGHT = 600;
const EXTERNAL_CONTAINER_SELECTOR = 'test-external-container';

describe('Sidebar', () => {
  const sidebarURL = new URL(
    '/base/annotator/test/empty.html',
    window.location.href
  ).toString();

  const sandbox = sinon.createSandbox();

  // Containers and Sidebar instances created by current test.
  let containers;
  let sidebars;

  let FakePortRPC;
  let fakePortRPCs;
  let FakeBucketBar;
  let fakeBucketBar;
  let FakeToolbarController;
  let fakeToolbar;
  let fakeSendErrorsTo;

  before(() => {
    sinon.stub(window, 'requestAnimationFrame').yields();
  });

  after(() => {
    window.requestAnimationFrame.restore();
  });

  // Helpers for getting the channels used for host <-> guest/sidebar communication.
  // These currently rely on knowing the implementation detail of which order
  // the channels are created in.

  const sidebarRPC = () => {
    return fakePortRPCs[0];
  };

  /** Return the PortRPC instance for the first connected guest. */
  const guestRPC = (index = 1) => {
    return fakePortRPCs[index];
  };

  const emitNthGuestEvent = (index = 1, event, ...args) => {
    const result = [];
    for (let [evt, fn] of guestRPC(index).on.args) {
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
    for (let [evt, fn] of sidebarRPC().on.args) {
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

    const eventBus = new EventBus();
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

  beforeEach(() => {
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

    fakeToolbar = {
      getWidth: sinon.stub().returns(100),
      useMinimalControls: false,
      sidebarOpen: false,
      newAnnotationType: 'note',
      highlightsVisible: false,
      sidebarToggleButton: document.createElement('button'),
    };
    FakeToolbarController = sinon.stub().returns(fakeToolbar);

    fakeSendErrorsTo = sinon.stub();

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

  function getConfigString(sidebar) {
    return sidebar.iframe.src;
  }

  it('creates sidebar iframe and passes configuration to it', () => {
    const sidebar = createSidebar({ annotations: '1234' });
    assert.equal(
      getConfigString(sidebar),
      addConfigFragment(sidebarURL, { annotations: '1234' })
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

      FakeToolbarController.args[0][1].createAnnotation();
    });

    it('creates an annotation in the first connected guest when toolbar button is clicked', () => {
      const sidebar = createSidebar();
      connectGuest(sidebar);

      FakeToolbarController.args[0][1].createAnnotation();

      assert.calledWith(guestRPC().call, 'createAnnotation');
    });

    it('creates an annotation in guest with selected text when toolbar button is clicked', () => {
      const sidebar = createSidebar({});
      connectGuest(sidebar);
      connectGuest(sidebar);

      emitNthGuestEvent(2, 'textSelected');
      FakeToolbarController.args[0][1].createAnnotation();

      assert.neverCalledWith(guestRPC(1).call, 'createAnnotation');
      assert.calledWith(guestRPC(2).call, 'createAnnotation');
    });

    it('creates an annotation in the first connected guest if guest with selected text has closed', () => {
      const sidebar = createSidebar({});
      connectGuest(sidebar);
      connectGuest(sidebar);

      emitNthGuestEvent(2, 'textSelected');
      emitNthGuestEvent(2, 'close');
      FakeToolbarController.args[0][1].createAnnotation();

      assert.calledWith(guestRPC(1).call, 'createAnnotation');
      assert.neverCalledWith(guestRPC(2).call, 'createAnnotation');
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
        sinon.stub(sidebar, 'hide').callThrough();
        sinon.stub(sidebar._emitter, 'publish');
        emitSidebarEvent('openNotebook', 'mygroup');
        assert.calledWith(sidebar._emitter.publish, 'openNotebook', 'mygroup');
        assert.calledOnce(sidebar.hide);
        assert.notEqual(sidebar.iframeContainer.style.visibility, 'hidden');
      });
    });

    describe('on "closeNotebook" internal event', () => {
      it('shows the sidebar', () => {
        const sidebar = createSidebar();
        sinon.stub(sidebar, 'show').callThrough();
        sidebar._emitter.publish('closeNotebook');
        assert.calledOnce(sidebar.show);
        assert.equal(sidebar.iframeContainer.style.visibility, '');
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
    });
  });

  describe('pan gestures', () => {
    let sidebar;

    beforeEach(() => {
      sidebar = createSidebar();
    });

    describe('panstart event', () => {
      it('disables pointer events and transitions on the widget', () => {
        sidebar._onPan({ type: 'panstart' });

        assert.isTrue(
          sidebar.iframeContainer.classList.contains('sidebar-no-transition')
        );
        assert.equal(sidebar.iframeContainer.style.pointerEvents, 'none');
      });

      it('captures the left margin as the gesture initial state', () => {
        sandbox
          .stub(window, 'getComputedStyle')
          .returns({ marginLeft: '100px' });
        sidebar._onPan({ type: 'panstart' });
        assert.equal(sidebar._gestureState.initial, '100');
      });
    });

    describe('panend event', () => {
      it('enables pointer events and transitions on the widget', () => {
        sidebar._gestureState = { final: 0 };
        sidebar._onPan({ type: 'panend' });
        assert.isFalse(
          sidebar.iframeContainer.classList.contains('sidebar-no-transition')
        );
        assert.equal(sidebar.iframeContainer.style.pointerEvents, '');
      });

      it('calls `open` if the widget is fully visible', () => {
        sidebar._gestureState = { final: -500 };
        const open = sandbox.stub(sidebar, 'open');
        sidebar._onPan({ type: 'panend' });
        assert.calledOnce(open);
      });

      it('calls `close` if the widget is not fully visible', () => {
        sidebar._gestureState = { final: -100 };
        const close = sandbox.stub(sidebar, 'close');
        sidebar._onPan({ type: 'panend' });
        assert.calledOnce(close);
      });
    });

    describe('panleft and panright events', () =>
      it('shrinks or grows the widget to match the delta', () => {
        sidebar._gestureState = { initial: -100 };

        sidebar._onPan({ type: 'panleft', deltaX: -50 });
        assert.equal(sidebar._gestureState.final, -150);

        sidebar._onPan({ type: 'panright', deltaX: 100 });
        assert.equal(sidebar._gestureState.final, 0);
      }));
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
      assert.isUndefined(guestRPC());
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

    beforeEach(async () => {
      // Configure the sidebar to open on load and wait for the initial open to
      // complete.
      sidebar = createSidebar({ openSidebar: true });
      connectSidebarApp();
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
          sinon.match.any
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
          })
        );
      });

      it('notifies when sidebar is panned left', () => {
        sidebar._gestureState = { initial: -DEFAULT_WIDTH };
        sidebar._onPan({ type: 'panleft', deltaX: -50 });
        assertLayoutValues(layoutChangeHandlerSpy.lastCall.args[0], {
          width: DEFAULT_WIDTH + 50 + fakeToolbar.getWidth(),
        });
      });

      it('notifies when sidebar is panned right', () => {
        sidebar._gestureState = { initial: -DEFAULT_WIDTH };
        sidebar._onPan({ type: 'panright', deltaX: 50 });
        assertLayoutValues(layoutChangeHandlerSpy.lastCall.args[0], {
          width: DEFAULT_WIDTH - 50 + fakeToolbar.getWidth(),
        });
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

      it('ignores pan events', () => {
        sandbox
          .stub(window, 'getComputedStyle')
          .returns({ marginLeft: '100px' });
        sidebar._onPan({ type: 'panstart' });
        assert.isNull(sidebar._gestureState.initial);
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
    it('displays the bucket bar by default', () => {
      const sidebar = createSidebar();
      assert.isNotNull(sidebar.bucketBar);
    });

    it('does not display the bucket bar if using the "clean" theme', () => {
      const sidebar = createSidebar({ theme: 'clean' });
      assert.isNull(sidebar.bucketBar);
    });

    it('does not display the bucket bar if using an external container for the sidebar', () => {
      const sidebar = createSidebar({
        externalContainerSelector: `.${EXTERNAL_CONTAINER_SELECTOR}`,
      });
      assert.isNull(sidebar.bucketBar);
    });

    it('calls the "focusAnnotations" RPC method', () => {
      const sidebar = createSidebar();
      connectGuest(sidebar);
      const { onFocusAnnotations } = FakeBucketBar.getCall(0).args[1];
      const tags = ['t1', 't2'];

      onFocusAnnotations(tags);

      assert.calledWith(guestRPC().call, 'focusAnnotations', tags);
    });

    it('calls the "scrollToClosestOffScreenAnchor" RPC method', () => {
      const sidebar = createSidebar();
      connectGuest(sidebar);
      const { onScrollToClosestOffScreenAnchor } =
        FakeBucketBar.getCall(0).args[1];
      const tags = ['t1', 't2'];
      const direction = 'down';

      onScrollToClosestOffScreenAnchor(tags, direction);

      assert.calledWith(
        guestRPC().call,
        'scrollToClosestOffScreenAnchor',
        tags,
        direction
      );
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
