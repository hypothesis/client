'use strict';

var angular = require('angular');

var util = require('./util');

describe('topBar', function () {
  before(function () {
    angular.module('app', [])
      .directive('topBar', require('../top-bar'));
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
});
