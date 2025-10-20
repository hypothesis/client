import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';
import sinon from 'sinon';

import TopBar, { $imports } from '../TopBar';

describe('TopBar', () => {
  let fakeSettings;
  let fakeFrameSync;
  let fakeStore;
  let fakeStreamer;
  let fakeServiceConfig;

  beforeEach(() => {
    fakeSettings = {};

    fakeStore = {
      hasFetchedProfile: sinon.stub().returns(false),
      isLoggedIn: sinon.stub().returns(false),
      isSidebarPanelOpen: sinon.stub().returns(false),
      toggleSidebarPanel: sinon.stub(),
    };

    fakeFrameSync = {
      notifyHost: sinon.stub(),
    };

    fakeServiceConfig = sinon.stub().returns(null);

    fakeStreamer = {
      applyPendingUpdates: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());

    $imports.$mock({
      '../store': { useSidebarStore: () => fakeStore },
      '../config/service-config': { serviceConfig: fakeServiceConfig },
    });
    $imports.$restore({
      // `TopBarToggleButton` is a presentation-only component. Not mocking it
      // allows to get it covered.
      './TopBarToggleButton': true,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  // Helper to retrieve an `Button` by test ID, for convenience
  function getButton(wrapper, testId) {
    return wrapper
      .find('TopBarToggleButton')
      .filterWhere(n => n.find(`[data-testid="${testId}"]`).exists());
  }

  function createTopBar(props = {}) {
    return mount(
      <TopBar
        frameSync={fakeFrameSync}
        isSidebar={true}
        settings={fakeSettings}
        streamer={fakeStreamer}
        {...props}
      />,
    );
  }

  describe('`HelpButton` and help requests', () => {
    context('no help service handler configured in services (default)', () => {
      it('toggles Help Panel on click', () => {
        const wrapper = createTopBar();
        const helpButton = getButton(wrapper, 'help-icon-button');

        helpButton.props().onClick();

        assert.calledWith(fakeStore.toggleSidebarPanel, 'help');
      });

      it('displays a help icon active state when help panel active', () => {
        fakeStore.isSidebarPanelOpen.withArgs('help').returns(true);
        const wrapper = createTopBar();
        const helpButton = getButton(wrapper, 'help-icon-button');

        wrapper.update();

        assert.isTrue(helpButton.props().expanded);
      });

      context('help service handler configured in services', () => {
        it('notifies host frame if help clicked and service is configured', () => {
          fakeServiceConfig.returns({ onHelpRequestProvided: true });
          const wrapper = createTopBar();

          const helpButton = getButton(wrapper, 'help-icon-button');

          helpButton.props().onClick();

          assert.equal(fakeStore.toggleSidebarPanel.callCount, 0);
          assert.calledWith(fakeFrameSync.notifyHost, 'helpRequested');
        });
      });
    });

    it('hides Help control if disabled', () => {
      fakeServiceConfig.returns({ enableHelpPanel: false });
      const wrapper = createTopBar();
      const helpButton = getButton(wrapper, 'help-icon-button');
      assert.isFalse(helpButton.exists());
    });
  });

  describe('login/account actions', () => {
    const getLoginText = wrapper => wrapper.find('[data-testid="login-links"]');

    it('Shows ellipsis when login state is unknown', () => {
      fakeStore.hasFetchedProfile.returns(false);
      fakeStore.isLoggedIn.returns(false);
      const wrapper = createTopBar();
      const loginText = getLoginText(wrapper);
      assert.isTrue(loginText.exists());
      assert.equal(loginText.text(), '⋯');
    });

    it('Shows "Log in" and "Sign up" links when user is logged out', () => {
      fakeStore.hasFetchedProfile.returns(true);
      fakeStore.isLoggedIn.returns(false);
      const onLogin = sinon.stub();
      const onSignUp = sinon.stub();

      const wrapper = createTopBar({
        onLogin,
        onSignUp,
      });
      const loginText = getLoginText(wrapper);
      const loginButtons = loginText.find('LinkButton');
      assert.equal(loginButtons.length, 2);

      assert.equal(loginButtons.at(0).props().onClick, onSignUp);
      assert.equal(loginButtons.at(1).props().onClick, onLogin);
    });

    it('Shows user menu when logged in', () => {
      fakeStore.hasFetchedProfile.returns(true);
      fakeStore.isLoggedIn.returns(true);

      const onLogout = sinon.stub();
      const wrapper = createTopBar({ onLogout });
      assert.isFalse(getLoginText(wrapper).exists());

      const userMenu = wrapper.find('UserMenu');
      assert.isTrue(userMenu.exists());
      assert.include(userMenu.props(), { onLogout });
    });

    it('hides user menu if disabled', () => {
      fakeStore.hasFetchedProfile.returns(true);
      fakeStore.isLoggedIn.returns(true);
      fakeServiceConfig.returns({
        enableAccountMenu: false,
      });

      const onLogout = sinon.stub();
      const wrapper = createTopBar({ onLogout });
      assert.isFalse(wrapper.exists('UserMenu'));
    });
  });

  context('when using a first-party service', () => {
    it('shows the share annotations button', () => {
      const wrapper = createTopBar();
      assert.isTrue(wrapper.exists('[title="Show share panel"]'));
    });
  });

  it('hides share menu if disabled', () => {
    fakeServiceConfig.returns({
      enableShareImportExportPanel: false,
    });
    const wrapper = createTopBar();
    const shareButton = getButton(wrapper, 'share-icon-button');
    assert.isFalse(shareButton.exists());
  });

  it('hides share menu when comments mode is enabled', () => {
    fakeServiceConfig.returns({
      enableShareImportExportPanel: true,
    });
    fakeSettings.commentsMode = true;
    const wrapper = createTopBar();
    const shareButton = getButton(wrapper, 'share-icon-button');
    assert.isFalse(shareButton.exists());
  });

  it('toggles the share annotations panel when "Share" is clicked', () => {
    const wrapper = createTopBar();
    const shareButton = getButton(wrapper, 'share-icon-button');

    shareButton.props().onClick();

    assert.calledWith(fakeStore.toggleSidebarPanel, 'shareGroupAnnotations');
  });

  it('adds an active-state class to the "Share" icon when the panel is open', () => {
    fakeStore.isSidebarPanelOpen
      .withArgs('shareGroupAnnotations')
      .returns(true);
    const wrapper = createTopBar();
    const shareButton = getButton(wrapper, 'share-icon-button');

    assert.isTrue(shareButton.prop('expanded'));
  });

  it('displays search input in the single annotation view / stream', () => {
    const wrapper = createTopBar({ isSidebar: false });
    const searchInput = wrapper.find('StreamSearchInput');
    assert.ok(searchInput.exists());
  });

  [true, false].forEach(isSidebar => {
    it('renders certain controls only in the sidebar', () => {
      const wrapper = createTopBar({ isSidebar });
      assert.equal(wrapper.exists('GroupList'), isSidebar);
      assert.equal(wrapper.exists('SortMenu'), isSidebar);
      assert.equal(wrapper.exists('SearchIconButton'), isSidebar);
      assert.equal(
        wrapper.exists('button[data-testid="share-icon-button"]'),
        isSidebar,
      );
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        name: 'in sidebar',
        content: () => createTopBar({ isSidebar: true }),
      },
      {
        name: 'in stream / single annotation view',
        content: () => createTopBar({ isSidebar: false }),
      },
    ]),
  );
});
