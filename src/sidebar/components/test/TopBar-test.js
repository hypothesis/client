import { mount } from 'enzyme';

import { checkAccessibility } from '../../../test-util/accessibility';
import { mockImportedComponents } from '../../../test-util/mock-imported-components';
import TopBar, { $imports } from '../TopBar';

describe('TopBar', () => {
  const fakeSettings = {};
  let fakeStore;
  let fakeIsThirdPartyService;

  let fakeOnApplyUpdates;
  let fakeOnLogin;
  let fakeOnLogout;
  let fakeOnRequestHelp;
  let fakeOnSignUp;

  beforeEach(() => {
    fakeOnApplyUpdates = sinon.stub();
    fakeOnLogin = sinon.stub();
    fakeOnLogout = sinon.stub();
    fakeOnRequestHelp = sinon.stub();
    fakeOnSignUp = sinon.stub();

    fakeIsThirdPartyService = sinon.stub().returns(false);

    fakeStore = {
      filterQuery: sinon.stub().returns(null),
      isSidebarPanelOpen: sinon.stub().returns(false),
      setFilterQuery: sinon.stub(),
      toggleSidebarPanel: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store/use-store': { useStoreProxy: () => fakeStore },
      '../helpers/is-third-party-service': {
        isThirdPartyService: fakeIsThirdPartyService,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  // Helper to retrieve an `Button` by icon name, for convenience
  function getButton(wrapper, iconName) {
    return wrapper.find('IconButton').filter({ icon: iconName });
  }

  function createTopBar(props = {}) {
    const auth = { status: 'unknown' };
    return mount(
      <TopBar
        auth={auth}
        isSidebar={true}
        onApplyUpdates={fakeOnApplyUpdates}
        onLogin={fakeOnLogin}
        onLogout={fakeOnLogout}
        onRequestHelp={fakeOnRequestHelp}
        onSignUp={fakeOnSignUp}
        pendingUpdateCount={0}
        settings={fakeSettings}
        {...props}
      />
    );
  }

  it('shows the pending update count', () => {
    const wrapper = createTopBar({ pendingUpdateCount: 1 });
    const applyBtn = getButton(wrapper, 'refresh');
    assert.isTrue(applyBtn.exists());
  });

  it('does not show the pending update count when there are no updates', () => {
    const wrapper = createTopBar({ pendingUpdateCount: 0 });
    const applyBtn = getButton(wrapper, 'refresh');
    assert.isFalse(applyBtn.exists());
  });

  it('applies updates when clicked', () => {
    const updateFn = sinon.stub();
    const wrapper = createTopBar({
      onApplyUpdates: updateFn,
      pendingUpdateCount: 1,
    });
    const applyBtn = getButton(wrapper, 'refresh');

    applyBtn.props().onClick();

    assert.calledOnce(updateFn);
  });

  describe('`HelpButton` and help requests', () => {
    it('displays a help icon active state when help panel active', () => {
      fakeStore.isSidebarPanelOpen.withArgs('help').returns(true);
      const wrapper = createTopBar();
      const helpButton = getButton(wrapper, 'help');

      wrapper.update();

      assert.isTrue(helpButton.props().expanded);
    });

    it('invokes help callback when help button clicked', () => {
      const helpFn = sinon.stub();
      const wrapper = createTopBar({ onRequestHelp: helpFn });

      const helpButton = getButton(wrapper, 'help');

      helpButton.props().onClick();

      assert.calledOnce(helpFn);
    });
  });

  describe('login/account actions', () => {
    const getLoginText = wrapper => wrapper.find('[data-testid="login-links"]');

    it('Shows ellipsis when login state is unknown', () => {
      const wrapper = createTopBar({ auth: { status: 'unknown' } });
      const loginText = getLoginText(wrapper);
      assert.isTrue(loginText.exists());
      assert.equal(loginText.text(), '⋯');
    });

    it('Shows "Log in" and "Sign up" links when user is logged out', () => {
      const onLogin = sinon.stub();
      const onSignUp = sinon.stub();

      const wrapper = createTopBar({
        auth: { status: 'logged-out' },
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
      const onLogout = sinon.stub();
      const auth = { status: 'logged-in' };
      const wrapper = createTopBar({ auth, onLogout });
      assert.isFalse(getLoginText(wrapper).exists());

      const userMenu = wrapper.find('UserMenu');
      assert.isTrue(userMenu.exists());
      assert.include(userMenu.props(), { auth, onLogout });
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
    const shareButton = getButton(wrapper, 'share');

    shareButton.props().onClick();

    assert.calledWith(fakeStore.toggleSidebarPanel, 'shareGroupAnnotations');
  });

  it('adds an active-state class to the "Share" icon when the panel is open', () => {
    fakeStore.isSidebarPanelOpen
      .withArgs('shareGroupAnnotations')
      .returns(true);
    const wrapper = createTopBar();
    const shareButton = getButton(wrapper, 'share');

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
