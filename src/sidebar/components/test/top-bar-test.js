'use strict';

var angular = require('angular');

var util = require('../../directive/test/util');

describe('topBar', function () {
  before(function () {
    angular.module('app', [])
      .component('topBar', require('../top-bar'))
      .component('loginControl', {
        bindings: require('../login-control').bindings,
      })
      .component('searchInput', {
        bindings: require('../search-input').bindings,
      })
      .component('sortDropdown', {
        bindings: require('../sort-dropdown').bindings,
      });
  });

  beforeEach(function () {
    angular.mock.module('app');
  });

  function applyUpdateBtn(el) {
    return el.querySelector('.top-bar__apply-update-btn');
  }

  function createTopBar(inputs) {
    var defaultInputs = {
      isSidebar: true,
    };
    return util.createDirective(document, 'topBar',
      Object.assign(defaultInputs, inputs));
  }

  it('shows the pending update count', function () {
    var el = createTopBar({
      pendingUpdateCount: 1,
    });
    var applyBtn = applyUpdateBtn(el[0]);
    assert.ok(applyBtn);
  });

  it('does not show the pending update count when there are no updates', function () {
    var el = createTopBar({
      pendingUpdateCount: 0,
    });
    var applyBtn = applyUpdateBtn(el[0]);
    assert.notOk(applyBtn);
  });

  it('applies updates when clicked', function () {
    var onApplyPendingUpdates = sinon.stub();
    var el = createTopBar({
      pendingUpdateCount: 1,
      onApplyPendingUpdates: onApplyPendingUpdates,
    });
    var applyBtn = applyUpdateBtn(el[0]);
    applyBtn.click();
    assert.called(onApplyPendingUpdates);
  });

  it('displays the login control and propagates callbacks', function () {
    var onShowHelpPanel = sinon.stub();
    var onLogin = sinon.stub();
    var onLogout = sinon.stub();
    var el = createTopBar({
      onShowHelpPanel: onShowHelpPanel,
      onLogin: onLogin,
      onLogout: onLogout,
    });
    var loginControl = el.find('login-control').controller('loginControl');

    loginControl.onShowHelpPanel();
    assert.called(onShowHelpPanel);

    loginControl.onLogin();
    assert.called(onLogin);

    loginControl.onLogout();
    assert.called(onLogout);
  });

  it('displays the share page when "Share this page" is clicked', function () {
    var onSharePage = sinon.stub();
    var el = createTopBar({ onSharePage: onSharePage });
    el.find('[title="Share this page"]').click();

    assert.called(onSharePage);
  });

  it('displays the search input and propagates query changes', function () {
    var onSearch = sinon.stub();
    var el = createTopBar({
      searchController: {
        query: sinon.stub().returns('query'),
        update: onSearch,
      },
    });
    var searchInput = el.find('search-input').controller('searchInput');

    assert.equal(searchInput.query, 'query');

    searchInput.onSearch({$query: 'new-query'});
    assert.calledWith(onSearch, 'new-query');
  });

  it('displays the sort dropdown and propagates sort key changes', function () {
    var onChangeSortKey = sinon.stub();
    var el = createTopBar({
      sortKeysAvailable: ['Newest', 'Oldest'],
      sortKey: 'Newest',
      onChangeSortKey: {
        args: ['sortKey'],
        callback: onChangeSortKey,
      },
    });
    var sortDropdown = el.find('sort-dropdown').controller('sortDropdown');

    assert.deepEqual(sortDropdown.sortKeysAvailable, ['Newest', 'Oldest']);
    assert.deepEqual(sortDropdown.sortKey, 'Newest');

    sortDropdown.onChangeSortKey({sortKey: 'Oldest'});
    assert.calledWith(onChangeSortKey, 'Oldest');
  });
});
