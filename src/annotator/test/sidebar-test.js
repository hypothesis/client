import events from '../../shared/bridge-events';

import Sidebar from '../sidebar';
import { $imports } from '../sidebar';

const DEFAULT_WIDTH = 350;
const DEFAULT_HEIGHT = 600;
const EXTERNAL_CONTAINER_SELECTOR = 'test-external-container';

describe('Sidebar', () => {
  const sandbox = sinon.createSandbox();
  let CrossFrame;
  let fakeCrossFrame;
  const sidebarConfig = { pluginClasses: {} };

  // `Sidebar` instances created by current test.
  let sidebars;

  let FakeToolbarController;
  let fakeToolbar;

  before(() => {
    sinon.stub(window, 'requestAnimationFrame').yields();
  });

  after(() => {
    window.requestAnimationFrame.restore();
  });

  const createSidebar = (config = {}) => {
    config = Object.assign(
      {
        // Dummy sidebar app.
        sidebarAppUrl: '/base/annotator/test/empty.html',
      },
      sidebarConfig,
      config
    );
    const element = document.createElement('div');
    const sidebar = new Sidebar(element, config);

    sidebars.push(sidebar);

    return sidebar;
  };

  const createExternalContainer = () => {
    const externalFrame = document.createElement('div');
    externalFrame.className = EXTERNAL_CONTAINER_SELECTOR;
    externalFrame.style.width = DEFAULT_WIDTH + 'px';
    externalFrame.style.height = DEFAULT_HEIGHT + 'px';
    return externalFrame;
  };

  beforeEach(() => {
    fakeCrossFrame = {};
    fakeCrossFrame.onConnect = sandbox.stub().returns(fakeCrossFrame);
    fakeCrossFrame.on = sandbox.stub().returns(fakeCrossFrame);
    fakeCrossFrame.call = sandbox.spy();
    fakeCrossFrame.destroy = sandbox.stub();

    fakeToolbar = {
      getWidth: sinon.stub().returns(100),
      useMinimalControls: false,
      sidebarOpen: false,
      newAnnotationType: 'note',
      highlightsVisible: false,
      sidebarToggleButton: document.createElement('button'),
    };
    FakeToolbarController = sinon.stub().returns(fakeToolbar);

    const fakeBucketBar = {};
    fakeBucketBar.element = document.createElement('div');
    fakeBucketBar.destroy = sandbox.stub();

    CrossFrame = sandbox.stub();
    CrossFrame.returns(fakeCrossFrame);

    const BucketBar = sandbox.stub();
    BucketBar.returns(fakeBucketBar);

    sidebarConfig.pluginClasses.CrossFrame = CrossFrame;
    sidebarConfig.pluginClasses.BucketBar = BucketBar;

    sidebars = [];

    $imports.$mock({
      './toolbar': {
        ToolbarController: FakeToolbarController,
      },
    });
  });

  afterEach(() => {
    sidebars.forEach(s => s.destroy());
    sandbox.restore();
    $imports.$restore();
  });

  describe('sidebar container frame', () => {
    it('starts hidden', () => {
      const sidebar = createSidebar();
      assert.equal(sidebar.frame.style.display, 'none');
    });

    it('applies a style if theme is configured as "clean"', () => {
      const sidebar = createSidebar({ theme: 'clean' });
      assert.isTrue(
        sidebar.frame.classList.contains('annotator-frame--theme-clean')
      );
    });

    it('becomes visible when the "panelReady" event fires', () => {
      const sidebar = createSidebar();
      sidebar.publish('panelReady');
      assert.equal(sidebar.frame.style.display, '');
    });
  });

  function getConfigString(sidebar) {
    return sidebar.frame.querySelector('iframe').src;
  }

  function configFragment(config) {
    return '#config=' + encodeURIComponent(JSON.stringify(config));
  }

  it('creates sidebar iframe and passes configuration to it', () => {
    const appURL = new URL(
      '/base/annotator/test/empty.html',
      window.location.href
    );
    const sidebar = createSidebar({ annotations: '1234' });
    assert.equal(
      getConfigString(sidebar),
      appURL + configFragment({ annotations: '1234' })
    );
  });

  context('when a new annotation is created', () => {
    function stubIframeWindow(sidebar) {
      const iframe = sidebar.frame.querySelector('iframe');
      const fakeIframeWindow = { focus: sinon.stub() };
      sinon.stub(iframe, 'contentWindow').get(() => fakeIframeWindow);
      return iframe;
    }

    it('focuses the sidebar if the annotation is not a highlight', () => {
      const sidebar = createSidebar();
      const iframe = stubIframeWindow(sidebar);

      sidebar.publish('beforeAnnotationCreated', [
        {
          $highlight: false,
        },
      ]);

      assert.called(iframe.contentWindow.focus);
    });

    it('does not focus the sidebar if the annotation is a highlight', () => {
      const sidebar = createSidebar();
      const iframe = stubIframeWindow(sidebar);

      sidebar.publish('beforeAnnotationCreated', [
        {
          $highlight: true,
        },
      ]);

      assert.notCalled(iframe.contentWindow.focus);
    });
  });

  describe('toolbar buttons', () => {
    it('shows or hides sidebar when toolbar button is clicked', () => {
      const sidebar = createSidebar({});
      sinon.stub(sidebar, 'show');
      sinon.stub(sidebar, 'hide');

      FakeToolbarController.args[0][1].setSidebarOpen(true);
      assert.called(sidebar.show);

      FakeToolbarController.args[0][1].setSidebarOpen(false);
      assert.called(sidebar.hide);
    });

    it('shows or hides highlights when toolbar button is clicked', () => {
      const sidebar = createSidebar({});
      sinon.stub(sidebar, 'setAllVisibleHighlights');

      FakeToolbarController.args[0][1].setHighlightsVisible(true);
      assert.calledWith(sidebar.setAllVisibleHighlights, true);
      sidebar.setAllVisibleHighlights.resetHistory();

      FakeToolbarController.args[0][1].setHighlightsVisible(false);
      assert.calledWith(sidebar.setAllVisibleHighlights, false);
    });

    it('creates an annotation when toolbar button is clicked', () => {
      const sidebar = createSidebar({});
      sinon.stub(sidebar, 'createAnnotation');

      FakeToolbarController.args[0][1].createAnnotation();

      assert.called(sidebar.createAnnotation);
    });
  });

  describe('crossframe listeners', () => {
    const emitEvent = (event, ...args) => {
      const result = [];
      for (let [evt, fn] of fakeCrossFrame.on.args) {
        if (event === evt) {
          result.push(fn(...args));
        }
      }
      return result;
    };

    describe('on "show" event', () =>
      it('shows the frame', () => {
        const target = sandbox.stub(Sidebar.prototype, 'show');
        createSidebar();
        emitEvent('showSidebar');
        assert.called(target);
      }));

    describe('on "hide" event', () =>
      it('hides the frame', () => {
        const target = sandbox.stub(Sidebar.prototype, 'hide');
        createSidebar();
        emitEvent('hideSidebar');
        assert.called(target);
      }));

    describe('on "showNotebook" event', () => {
      it('hides itself and republishes the event', () => {
        const sidebar = createSidebar();
        sinon.stub(sidebar, 'publish');
        sinon.stub(sidebar, 'hide');
        emitEvent('showNotebook', 'mygroup');
        assert.calledWith(
          sidebar.publish,
          'showNotebook',
          sinon.match(['mygroup'])
        );
        assert.calledOnce(sidebar.hide);
      });
    });

    describe('on "hideNotebook" event', () => {
      it('shows itself and republishes the event', () => {
        const sidebar = createSidebar();
        sinon.stub(sidebar, 'publish');
        sinon.stub(sidebar, 'show');
        emitEvent('hideNotebook');
        assert.calledWith(sidebar.publish, 'hideNotebook');
        assert.calledOnce(sidebar.show);
      });
    });

    describe('on LOGIN_REQUESTED event', () => {
      it('calls the onLoginRequest callback function if one was provided', () => {
        const onLoginRequest = sandbox.stub();
        createSidebar({ services: [{ onLoginRequest }] });

        emitEvent(events.LOGIN_REQUESTED);

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

        emitEvent(events.LOGIN_REQUESTED);

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

        emitEvent(events.LOGIN_REQUESTED);

        assert.notCalled(secondOnLogin);
        assert.notCalled(thirdOnLogin);
      });

      it('does not crash if there is no services', () => {
        createSidebar({}); // No config.services
        emitEvent(events.LOGIN_REQUESTED);
      });

      it('does not crash if services is an empty array', () => {
        createSidebar({ services: [] });
        emitEvent(events.LOGIN_REQUESTED);
      });

      it('does not crash if the first service has no onLoginRequest', () => {
        createSidebar({ services: [{}] });
        emitEvent(events.LOGIN_REQUESTED);
      });
    });

    describe('on LOGOUT_REQUESTED event', () =>
      it('calls the onLogoutRequest callback function', () => {
        const onLogoutRequest = sandbox.stub();
        createSidebar({ services: [{ onLogoutRequest }] });

        emitEvent(events.LOGOUT_REQUESTED);

        assert.called(onLogoutRequest);
      }));

    describe('on SIGNUP_REQUESTED event', () =>
      it('calls the onSignupRequest callback function', () => {
        const onSignupRequest = sandbox.stub();
        createSidebar({ services: [{ onSignupRequest }] });

        emitEvent(events.SIGNUP_REQUESTED);

        assert.called(onSignupRequest);
      }));

    describe('on PROFILE_REQUESTED event', () =>
      it('calls the onProfileRequest callback function', () => {
        const onProfileRequest = sandbox.stub();
        createSidebar({ services: [{ onProfileRequest }] });

        emitEvent(events.PROFILE_REQUESTED);

        assert.called(onProfileRequest);
      }));

    describe('on HELP_REQUESTED event', () =>
      it('calls the onHelpRequest callback function', () => {
        const onHelpRequest = sandbox.stub();
        createSidebar({ services: [{ onHelpRequest }] });

        emitEvent(events.HELP_REQUESTED);

        assert.called(onHelpRequest);
      }));
  });

  describe('pan gestures', () => {
    let sidebar;

    beforeEach(() => {
      sidebar = createSidebar({});
    });

    describe('panstart event', () => {
      it('disables pointer events and transitions on the widget', () => {
        sidebar._onPan({ type: 'panstart' });

        assert.isTrue(
          sidebar.frame.classList.contains('annotator-no-transition')
        );
        assert.equal(sidebar.frame.style.pointerEvents, 'none');
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
          sidebar.frame.classList.contains('annotator-no-transition')
        );
        assert.equal(sidebar.frame.style.pointerEvents, '');
      });

      it('calls `show` if the widget is fully visible', () => {
        sidebar._gestureState = { final: -500 };
        const show = sandbox.stub(sidebar, 'show');
        sidebar._onPan({ type: 'panend' });
        assert.calledOnce(show);
      });

      it('calls `hide` if the widget is not fully visible', () => {
        sidebar._gestureState = { final: -100 };
        const hide = sandbox.stub(sidebar, 'hide');
        sidebar._onPan({ type: 'panend' });
        assert.calledOnce(hide);
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

  describe('panelReady event', () => {
    it('opens the sidebar when a direct-linked annotation is present.', () => {
      const sidebar = createSidebar({
        annotations: 'ann-id',
      });
      const show = sandbox.stub(sidebar, 'show');
      sidebar.publish('panelReady');
      assert.calledOnce(show);
    });

    it('opens the sidebar when a direct-linked group is present.', () => {
      const sidebar = createSidebar({
        group: 'group-id',
      });
      const show = sandbox.stub(sidebar, 'show');
      sidebar.publish('panelReady');
      assert.calledOnce(show);
    });

    it('opens the sidebar when a direct-linked query is present.', () => {
      const sidebar = createSidebar({
        query: 'tag:foo',
      });
      const show = sandbox.stub(sidebar, 'show');
      sidebar.publish('panelReady');
      assert.calledOnce(show);
    });

    it('opens the sidebar when openSidebar is set to true.', () => {
      const sidebar = createSidebar({
        openSidebar: true,
      });
      const show = sandbox.stub(sidebar, 'show');
      sidebar.publish('panelReady');
      assert.calledOnce(show);
    });

    it('does not show the sidebar if not configured to.', () => {
      const sidebar = createSidebar({});
      const show = sandbox.stub(sidebar, 'show');
      sidebar.publish('panelReady');
      assert.notCalled(show);
    });
  });

  describe('destruction', () => {
    let sidebar;

    beforeEach(() => {
      sidebar = createSidebar({});
    });

    it('the sidebar is destroyed and the frame is detached', () => {
      sidebar.destroy();
      assert.called(fakeCrossFrame.destroy);
      assert.equal(sidebar.frame.parentElement, null);
    });
  });

  describe('#show', () => {
    it('shows highlights if "showHighlights" is set to "whenSidebarOpen"', () => {
      const sidebar = createSidebar({ showHighlights: 'whenSidebarOpen' });
      assert.isFalse(sidebar.visibleHighlights);
      sidebar.show();
      assert.isTrue(sidebar.visibleHighlights);
    });

    it('does not show highlights otherwise', () => {
      const sidebar = createSidebar({ showHighlights: 'never' });
      assert.isFalse(sidebar.visibleHighlights);
      sidebar.show();
      assert.isFalse(sidebar.visibleHighlights);
    });

    it('updates the `sidebarOpen` property of the toolbar', () => {
      const sidebar = createSidebar();
      sidebar.show();
      assert.equal(fakeToolbar.sidebarOpen, true);
    });
  });

  describe('#hide', () => {
    it('hides highlights if "showHighlights" is set to "whenSidebarOpen"', () => {
      const sidebar = createSidebar({ showHighlights: 'whenSidebarOpen' });

      sidebar.show();
      sidebar.hide();

      assert.isFalse(sidebar.visibleHighlights);
    });

    it('updates the `sidebarOpen` property of the toolbar', () => {
      const sidebar = createSidebar();

      sidebar.show();
      sidebar.hide();

      assert.equal(fakeToolbar.sidebarOpen, false);
    });
  });

  describe('#setAllVisibleHighlights', () =>
    it('sets the state through crossframe and emits', () => {
      const sidebar = createSidebar({});
      sidebar.setAllVisibleHighlights(true);
      assert.calledWith(fakeCrossFrame.call, 'setVisibleHighlights', true);
    }));

  it('hides toolbar controls when using the "clean" theme', () => {
    createSidebar({ theme: 'clean' });
    assert.equal(fakeToolbar.useMinimalControls, true);
  });

  it('shows toolbar controls when using the default theme', () => {
    createSidebar({});
    assert.equal(fakeToolbar.useMinimalControls, false);
  });

  describe('layout change notifier', () => {
    let layoutChangeHandlerSpy;

    const assertLayoutValues = (args, expectations) => {
      const expected = Object.assign(
        {
          width: DEFAULT_WIDTH + fakeToolbar.getWidth(),
          height: DEFAULT_HEIGHT,
          expanded: true,
        },
        expectations
      );

      assert.deepEqual(args, expected);
    };

    describe('with the frame set up as default', () => {
      let sidebar;
      let frame;

      beforeEach(() => {
        layoutChangeHandlerSpy = sandbox.stub();
        sidebar = createSidebar({
          onLayoutChange: layoutChangeHandlerSpy,
          sidebarAppUrl: '/',
        });

        // remove info about call that happens on creation of sidebar
        layoutChangeHandlerSpy.reset();

        frame = sidebar.frame;
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

      it('notifies when sidebar changes expanded state', () => {
        sinon.stub(sidebar, 'publish');
        sidebar.show();
        assert.calledOnce(layoutChangeHandlerSpy);
        assert.calledWith(
          sidebar.publish,
          'sidebarLayoutChanged',
          sinon.match.any
        );
        assert.calledWith(sidebar.publish, 'sidebarOpened');
        assert.calledTwice(sidebar.publish);
        assertLayoutValues(layoutChangeHandlerSpy.lastCall.args[0], {
          expanded: true,
        });

        sidebar.hide();
        assert.calledTwice(layoutChangeHandlerSpy);
        assert.calledThrice(sidebar.publish);
        assertLayoutValues(layoutChangeHandlerSpy.lastCall.args[0], {
          expanded: false,
          width: fakeToolbar.getWidth(),
        });
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
        document.body.appendChild(externalFrame);

        layoutChangeHandlerSpy = sandbox.stub();
        const layoutChangeExternalConfig = {
          onLayoutChange: layoutChangeHandlerSpy,
          sidebarAppUrl: '/',
          externalContainerSelector: '.' + EXTERNAL_CONTAINER_SELECTOR,
        };
        sidebar = createSidebar(layoutChangeExternalConfig);

        // remove info about call that happens on creation of sidebar
        layoutChangeHandlerSpy.reset();
      });

      afterEach(() => {
        externalFrame.remove();
      });

      it('notifies when sidebar changes expanded state', () => {
        sidebar.show();
        assert.calledOnce(layoutChangeHandlerSpy);
        assertLayoutValues(layoutChangeHandlerSpy.lastCall.args[0], {
          expanded: true,
          width: DEFAULT_WIDTH,
        });

        sidebar.hide();
        assert.calledTwice(layoutChangeHandlerSpy);
        assertLayoutValues(layoutChangeHandlerSpy.lastCall.args[0], {
          expanded: false,
          width: 0,
        });
      });
    });
  });

  describe('sidebar frame in an external container', () => {
    let sidebar;
    let externalFrame;

    beforeEach(() => {
      externalFrame = createExternalContainer();
      document.body.appendChild(externalFrame);

      sidebar = createSidebar({
        externalContainerSelector: '.' + EXTERNAL_CONTAINER_SELECTOR,
      });
    });

    afterEach(() => {
      externalFrame.remove();
    });

    it('uses the configured external container as the frame', () => {
      assert.equal(sidebar.frame, undefined);
      assert.isDefined(sidebar.externalFrame);
      assert.equal(sidebar.externalFrame, externalFrame);
      assert.equal(externalFrame.childNodes.length, 1);
    });
  });

  describe('config', () => {
    it('does not have the BucketBar plugin if the clean theme is enabled', () => {
      const sidebar = createSidebar({ theme: 'clean' });
      assert.isUndefined(sidebar.plugins.BucketBar);
    });

    it('does not have the BucketBar if an external container is provided', () => {
      const sidebar = createSidebar({
        externalContainerSelector: '.' + EXTERNAL_CONTAINER_SELECTOR,
      });
      assert.isUndefined(sidebar.plugins.BucketBar);
    });
  });
});
