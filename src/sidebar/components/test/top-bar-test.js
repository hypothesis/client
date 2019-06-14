'use strict';

const angular = require('angular');

const topBar = require('../top-bar');
const util = require('../../directive/test/util');

describe('topBar', function() {
  const fakeSettings = {};
  let fakeIsThirdPartyService;

  before(function() {
    angular
      .module('app', [])
      .component('topBar', topBar)
      .component('loginControl', {
        bindings: require('../login-control').bindings,
      })
      .component('searchInput', {
        bindings: {
          alwaysExpanded: '<',
          query: '<',
          onSearch: '&',
        },
      });
  });

  beforeEach(function() {
    angular.mock.module('app', {
      settings: fakeSettings,
    });

    fakeIsThirdPartyService = sinon.stub().returns(false);

    topBar.$imports.$mock({
      '../util/is-third-party-service': fakeIsThirdPartyService,
    });
  });

  afterEach(() => {
    topBar.$imports.$restore();
  });

  function applyUpdateBtn(el) {
    return el.querySelector('.top-bar__apply-update-btn');
  }

  function helpBtn(el) {
    return el.querySelector('.top-bar__help-btn');
  }

  function createTopBar(inputs) {
    const defaultInputs = {
      isSidebar: true,
    };
    return util.createDirective(
      document,
      'topBar',
      Object.assign(defaultInputs, inputs)
    );
  }

  it('shows the pending update count', function() {
    const el = createTopBar({
      pendingUpdateCount: 1,
    });
    const applyBtn = applyUpdateBtn(el[0]);
    assert.ok(applyBtn);
  });

  it('does not show the pending update count when there are no updates', function() {
    const el = createTopBar({
      pendingUpdateCount: 0,
    });
    const applyBtn = applyUpdateBtn(el[0]);
    assert.notOk(applyBtn);
  });

  it('applies updates when clicked', function() {
    const onApplyPendingUpdates = sinon.stub();
    const el = createTopBar({
      pendingUpdateCount: 1,
      onApplyPendingUpdates: onApplyPendingUpdates,
    });
    const applyBtn = applyUpdateBtn(el[0]);
    applyBtn.click();
    assert.called(onApplyPendingUpdates);
  });

  it('shows help when help icon clicked', function() {
    const onShowHelpPanel = sinon.stub();
    const el = createTopBar({
      onShowHelpPanel: onShowHelpPanel,
    });
    const help = helpBtn(el[0]);
    help.click();
    assert.called(onShowHelpPanel);
  });

  it('displays the login control and propagates callbacks', function() {
    const onShowHelpPanel = sinon.stub();
    const onLogin = sinon.stub();
    const onLogout = sinon.stub();
    const el = createTopBar({
      onShowHelpPanel: onShowHelpPanel,
      onLogin: onLogin,
      onLogout: onLogout,
    });
    const loginControl = el.find('login-control').controller('loginControl');

    loginControl.onLogin();
    assert.called(onLogin);

    loginControl.onLogout();
    assert.called(onLogout);
  });

  it("checks whether we're using a third-party service", function() {
    createTopBar();

    assert.called(fakeIsThirdPartyService);
    assert.alwaysCalledWithExactly(fakeIsThirdPartyService, fakeSettings);
  });

  context('when using a first-party service', function() {
    it('shows the share page button', function() {
      let el = createTopBar();
      // I want the DOM element, not AngularJS's annoying angular.element
      // wrapper object.
      el = el[0];

      assert.isNotNull(el.querySelector('[title="Share this page"]'));
    });
  });

  context('when using a third-party service', function() {
    beforeEach(function() {
      fakeIsThirdPartyService.returns(true);
    });

    it("doesn't show the share page button", function() {
      let el = createTopBar();
      // I want the DOM element, not AngularJS's annoying angular.element
      // wrapper object.
      el = el[0];

      assert.isNull(el.querySelector('[title="Share this page"]'));
    });
  });

  it('displays the share page when "Share this page" is clicked', function() {
    const onSharePage = sinon.stub();
    const el = createTopBar({ onSharePage: onSharePage });
    el.find('[title="Share this page"]').click();

    assert.called(onSharePage);
  });

  it('displays the search input and propagates query changes', function() {
    const onSearch = sinon.stub();
    const el = createTopBar({
      searchController: {
        query: sinon.stub().returns('query'),
        update: onSearch,
      },
    });
    const searchInput = el.find('search-input').controller('searchInput');

    assert.equal(searchInput.query, 'query');

    searchInput.onSearch({ $query: 'new-query' });
    assert.calledWith(onSearch, 'new-query');
  });

  it('shows the clean theme when settings contains the clean theme option', function() {
    angular.mock.module('app', {
      settings: { theme: 'clean' },
    });

    const el = createTopBar();
    assert.ok(el[0].querySelector('.top-bar--theme-clean'));
  });
});
