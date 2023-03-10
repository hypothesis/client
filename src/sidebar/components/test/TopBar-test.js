import { mount } from 'enzyme';

import { checkAccessibility } from '../../../test-util/accessibility';
import { mockImportedComponents } from '../../../test-util/mock-imported-components';
import TopBar, { $imports } from '../TopBar';

describe('TopBar', () => {
  const fakeSettings = {};
  let fakeFrameSync;
  let fakeStore;
  let fakeStreamer;
  let fakeIsThirdPartyService;
  let fakeServiceConfig;

  beforeEach(() => {
    fakeIsThirdPartyService = sinon.stub().returns(false);

    fakeStore = {
      filterQuery: sinon.stub().returns(null),
      hasFetchedProfile: sinon.stub().returns(false),
      isLoggedIn: sinon.stub().returns(false),
      isSidebarPanelOpen: sinon.stub().returns(false),
      setFilterQuery: sinon.stub(),
      toggleSidebarPanel: sinon.stub(),
    };

    fakeFrameSync = {
      notifyHost: sinon.stub(),
    };

    fakeServiceConfig = sinon.stub().returns({});

    fakeStreamer = {
      applyPendingUpdates: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());

    $imports.$mock({
      '../store': { useSidebarStore: () => fakeStore },
      '../helpers/is-third-party-service': {
        isThirdPartyService: fakeIsThirdPartyService,
      },
      '../config/service-config': { serviceConfig: fakeServiceConfig },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  // Helper to retrieve an `Button` by icon name, for convenience
  function getButton(wrapper, iconName) {
    return wrapper
      .find('IconButton')
      .filterWhere(n => n.find(iconName).exists());
  }

  function createTopBar(props = {}) {
    return mount(
      <TopBar
        frameSync={fakeFrameSync}
        isSidebar={true}
        settings={fakeSettings}
        streamer={fakeStreamer}
        {...props}
      />
    );
  }

  describe('`HelpButton` and help requests', () => {
    context('no help service handler configured in services (default)', () => {
      it('toggles Help Panel on click', () => {
        const wrapper = createTopBar();
        const helpButton = getButton(wrapper, 'HelpIcon');

        helpButton.props().onClick();

        assert.calledWith(fakeStore.toggleSidebarPanel, 'help');
      });

      it('displays a help icon active state when help panel active', () => {
        fakeStore.isSidebarPanelOpen.withArgs('help').returns(true);
        const wrapper = createTopBar();
        const helpButton = getButton(wrapper, 'HelpIcon');

        wrapper.update();

        assert.isTrue(helpButton.props().expanded);
      });

      context('help service handler configured in services', () => {
        it('notifies host frame if help clicked and service is configured', () => {
          fakeServiceConfig.returns({ onHelpRequestProvided: true });
          const wrapper = createTopBar();

          const helpButton = getButton(wrapper, 'HelpIcon');

          helpButton.props().onClick();

          assert.equal(fakeStore.toggleSidebarPanel.callCount, 0);
          assert.calledWith(fakeFrameSync.notifyHost, 'helpRequested');
        });
      });
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
  });

  it("checks whether we're using a third-party service", () => {
    createTopBar();

    assert.called(fakeIsThirdPartyService);
    assert.alwaysCalledWithExactly(fakeIsThirdPartyService, fakeSettings);
  });

  context('when using a first-party service', () => {
    it('shows the share annotations button', () => {
      const wrapper = createTopBar();
      assert.isTrue(wrapper.exists('[title="Share annotations on this page"]'));
    });
  });

  context('when using a third-party service', () => {
    beforeEach(() => {
      fakeIsThirdPartyService.returns(true);
    });

    it("doesn't show the share annotations button", () => {
      const wrapper = createTopBar();
      assert.isFalse(
        wrapper.exists('[title="Share annotations on this page"]')
      );
    });
  });

  it('toggles the share annotations panel when "Share" is clicked', () => {
    const wrapper = createTopBar();
    const shareButton = getButton(wrapper, 'ShareIcon');

    shareButton.props().onClick();

    assert.calledWith(fakeStore.toggleSidebarPanel, 'shareGroupAnnotations');
  });

  it('adds an active-state class to the "Share" icon when the panel is open', () => {
    fakeStore.isSidebarPanelOpen
      .withArgs('shareGroupAnnotations')
      .returns(true);
    const wrapper = createTopBar();
    const shareButton = getButton(wrapper, 'ShareIcon');

    assert.isTrue(shareButton.prop('expanded'));
  });

  it('displays search input in the sidebar', () => {
    fakeStore.filterQuery.returns('test-query');
    const wrapper = createTopBar();
    assert.equal(wrapper.find('SearchInput').prop('query'), 'test-query');
  });

  it('updates current filter when changing search query in the sidebar', () => {
    const wrapper = createTopBar();
    wrapper.find('SearchInput').prop('onSearch')('new-query');
    assert.calledWith(fakeStore.setFilterQuery, 'new-query');
  });

  it('displays search input in the single annotation view / stream', () => {
    const wrapper = createTopBar({ isSidebar: false });
    const searchInput = wrapper.find('StreamSearchInput');
    assert.ok(searchInput.exists());
  });

  context('in the stream and single annotation pages', () => {
    it('does not render the group list, sort menu or share menu', () => {
      const wrapper = createTopBar({ isSidebar: false });
      assert.isFalse(wrapper.exists('GroupList'));
      assert.isFalse(wrapper.exists('SortMenu'));
      assert.isFalse(wrapper.exists('button[title="Share this page"]'));
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
    ])
  );
});
