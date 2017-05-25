'use strict';

var angular = require('angular');

var groupList = require('../group-list');
var util = require('../../directive/test/util');

describe('groupList', function () {
  var $window;

  var GROUP_LINK = 'https://hypothes.is/groups/hdevs';

  var groups;
  var fakeGroups;
  var fakeAnalytics;
  var fakeServiceUrl;
  var fakeSettings;

  before(function() {
    angular.module('app', [])
      .component('groupList', groupList)
      .factory('groups', function () {
        return fakeGroups;
      });
  });

  beforeEach(function () {

    fakeAnalytics = {
      track: sinon.stub(),
      events: {
        GROUP_LEAVE: 'groupLeave',
        GROUP_SWITCH: 'groupSwitch',
        GROUP_VIEW_ACTIVITY: 'groupViewActivity',
      },
    };

    fakeServiceUrl = sinon.stub();
    fakeSettings = {
      authDomain: 'example.com',
    };

    angular.mock.module('app', {
      analytics: fakeAnalytics,
      serviceUrl: fakeServiceUrl,
      settings: fakeSettings,
    });
  });

  beforeEach(angular.mock.inject(function (_$window_) {
    $window = _$window_;

    groups = [{
      id: 'public',
      public: true,
    },{
      id: 'h-devs',
      name: 'Hypothesis Developers',
      url: GROUP_LINK,
    }];

    fakeGroups = {
      all: function () {
        return groups;
      },
      get: function (id) {
        var match = this.all().filter(function (group) {
          return group.id === id;
        });
        return match.length > 0 ? match[0] : undefined;
      },
      leave: sinon.stub(),
      focus: sinon.stub(),
      focused: sinon.stub(),
    };
  }));

  function createGroupList() {
    return util.createDirective(document, 'groupList', {
      auth: {
        status: 'logged-in',
        userid: 'acct:person@example.com',
      },
    });
  }

  it('should render groups', function () {
    var element = createGroupList();
    var groupItems = element.find('.group-item');
    assert.equal(groupItems.length, groups.length + 1);
  });

  it('should render share links', function () {
    var element = createGroupList();
    var shareLinks = element.find('.share-link-container');
    assert.equal(shareLinks.length, 1);

    var link = element.find('.share-link');
    assert.equal(link.length, 1);
    assert.equal(link[0].href, GROUP_LINK);
  });

  it('should track metrics when a user attempts to view a groups activity', function () {
    var element = createGroupList();
    var link = element.find('.share-link');
    link.click();
    assert.calledWith(fakeAnalytics.track, fakeAnalytics.events.GROUP_VIEW_ACTIVITY);
  });

  function clickLeaveIcon(element, acceptPrompt) {
    var leaveLink = element.find('.h-icon-cancel-outline');

    // accept prompt to leave group
    $window.confirm = function () {
      return acceptPrompt;
    };
    leaveLink.click();
  }

  it('should leave group when the leave icon is clicked', function () {
    var element = createGroupList();
    clickLeaveIcon(element, true);
    assert.ok(fakeGroups.leave.calledWith('h-devs'));
    assert.calledWith(fakeAnalytics.track, fakeAnalytics.events.GROUP_LEAVE);
  });

  it('should not leave group when confirmation is dismissed', function () {
    var element = createGroupList();
    clickLeaveIcon(element, false);
    assert.notCalled(fakeGroups.leave);
    assert.notCalled(fakeAnalytics.track);
  });

  it('should not change the focused group when leaving', function () {
    var element = createGroupList();
    clickLeaveIcon(element, true);
    assert.notCalled(fakeGroups.focus);
    assert.calledWith(fakeAnalytics.track, fakeAnalytics.events.GROUP_LEAVE);
  });

  it('should change current group focus when click another group', function () {
    var element = createGroupList();
    var groupItems = element.find('.group-item');

    // click the second group
    groupItems[1].click();

    assert.calledOnce(fakeGroups.focus);
    assert.calledWith(fakeAnalytics.track, fakeAnalytics.events.GROUP_SWITCH);
  });

  it('should open a window when "New Group" is clicked', function () {
    fakeServiceUrl
      .withArgs('groups.new')
      .returns('https://test.hypothes.is/groups/new');

    var element = createGroupList();
    $window.open = sinon.stub();

    var newGroupLink =
      element[0].querySelector('.new-group-btn a');
    angular.element(newGroupLink).click();
    assert.calledWith($window.open, 'https://test.hypothes.is/groups/new',
      '_blank');
  });
});
