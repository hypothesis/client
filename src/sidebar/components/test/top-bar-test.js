'use strict';

const { createElement } = require('preact');
const { shallow } = require('enzyme');

const GroupList = require('../group-list');
const SearchInput = require('../search-input');
const SortMenu = require('../sort-menu');
const TopBar = require('../top-bar');
const UserMenu = require('../user-menu');

describe('TopBar', () => {
  const fakeSettings = {};
  let fakeIsThirdPartyService;

  beforeEach(() => {
    fakeIsThirdPartyService = sinon.stub().returns(false);

    TopBar.$imports.$mock({
      '../util/is-third-party-service': fakeIsThirdPartyService,
    });
  });

  afterEach(() => {
    TopBar.$imports.$restore();
  });

  function applyUpdateBtn(wrapper) {
    return wrapper.find('.top-bar__apply-update-btn');
  }

  function helpBtn(wrapper) {
    return wrapper.find('.top-bar__help-btn');
  }

  function createTopBar(props = {}) {
    const auth = { status: 'unknown' };
    const searchController = {
      query: () => '',
      update: () => {},
    };
    return shallow(
      <TopBar
        auth={auth}
        searchController={searchController}
        isSidebar={true}
        settings={fakeSettings}
        {...props}
      />
    ).dive(); // Dive through `withServices` wrapper.
  }

  it('shows the pending update count', () => {
    const wrapper = createTopBar({
      pendingUpdateCount: 1,
    });
    const applyBtn = applyUpdateBtn(wrapper);
    assert.isTrue(applyBtn.exists());
  });

  it('does not show the pending update count when there are no updates', () => {
    const wrapper = createTopBar({
      pendingUpdateCount: 0,
    });
    const applyBtn = applyUpdateBtn(wrapper);
    assert.isFalse(applyBtn.exists());
  });

  it('applies updates when clicked', () => {
    const onApplyPendingUpdates = sinon.stub();
    const wrapper = createTopBar({
      pendingUpdateCount: 1,
      onApplyPendingUpdates,
    });
    const applyBtn = applyUpdateBtn(wrapper);
    applyBtn.simulate('click');
    assert.called(onApplyPendingUpdates);
  });

  it('shows Help Panel when help icon is clicked', () => {
    const onShowHelpPanel = sinon.stub();
    const wrapper = createTopBar({
      onShowHelpPanel: onShowHelpPanel,
    });
    const help = helpBtn(wrapper);
    help.simulate('click');
    assert.called(onShowHelpPanel);
  });

  describe('login/account actions', () => {
    const getLoginText = wrapper => wrapper.find('.login-text');

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
      const links = loginText.find('a');
      assert.equal(links.length, 2);

      assert.equal(links.at(0).text(), 'Sign up');
      links.at(0).simulate('click');
      assert.called(onSignUp);

      assert.equal(links.at(1).text(), 'Log in');
      links.at(1).simulate('click');
      assert.called(onLogin);
    });

    it('Shows user menu when logged in', () => {
      const onLogout = sinon.stub();
      const auth = { status: 'logged-in' };
      const wrapper = createTopBar({ auth, onLogout });
      assert.isFalse(getLoginText(wrapper).exists());

      const userMenu = wrapper.find(UserMenu);
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
    it('shows the share page button', () => {
      const wrapper = createTopBar();
      assert.isTrue(wrapper.exists('[title="Share this page"]'));
    });
  });

  context('when using a third-party service', () => {
    beforeEach(() => {
      fakeIsThirdPartyService.returns(true);
    });

    it("doesn't show the share page button", () => {
      const wrapper = createTopBar();
      assert.isFalse(wrapper.exists('[title="Share this page"]'));
    });
  });

  it('displays the share page when "Share this page" is clicked', () => {
    const onSharePage = sinon.stub();
    const wrapper = createTopBar({ onSharePage });
    wrapper.find('[title="Share this page"]').simulate('click');
    assert.called(onSharePage);
  });

  [true, false].forEach(isSidebar => {
    it(`displays the search input and propagates query changes (isSidebar: ${isSidebar})`, () => {
      const onSearch = sinon.stub();
      const wrapper = createTopBar({
        isSidebar,
        searchController: {
          query: sinon.stub().returns('query'),
          update: onSearch,
        },
      });
      const searchInput = wrapper.find('SearchInput');

      assert.equal(searchInput.prop('query'), 'query');
      searchInput.props().onSearch({ $query: 'new-query' });
      assert.calledWith(onSearch, 'new-query');
    });
  });

  it('shows the clean theme when settings contains the clean theme option', () => {
    fakeSettings.theme = 'clean';
    const wrapper = createTopBar();
    assert.isTrue(wrapper.exists('.top-bar--theme-clean'));
  });

  context('in the stream and single annotation pages', () => {
    it('does not render the group list, sort menu or share menu', () => {
      const wrapper = createTopBar({ isSidebar: false });
      assert.isFalse(wrapper.exists(GroupList));
      assert.isFalse(wrapper.exists(SortMenu));
      assert.isFalse(wrapper.exists('button[title="Share this page"]'));
    });

    it('does show the search input, Help menu and user menu', () => {
      const wrapper = createTopBar({
        isSidebar: false,
        auth: { status: 'logged-in' },
      });
      assert.isTrue(wrapper.exists('button[title="Help"]'));
      assert.isTrue(wrapper.exists(SearchInput));
      assert.isTrue(wrapper.exists(UserMenu));
    });
  });
});
