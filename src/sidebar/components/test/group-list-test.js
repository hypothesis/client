'use strict';

var angular = require('angular');

var groupList = require('../group-list');
var util = require('../../directive/test/util');

describe('groupList', function () {
  var $window;

  var PRIVATE_GROUP_LINK = 'https://hypothes.is/groups/hdevs';
  var OPEN_GROUP_LINK = 'https://hypothes.is/groups/pub';
  var RESTRICTED_GROUP_LINK = 'https://hypothes.is/groups/restricto';

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
      links: {
        html: OPEN_GROUP_LINK,
      },
      name: 'Public Group',
      type: 'open',
    },{
      id: 'h-devs',
      links: {
        html: PRIVATE_GROUP_LINK,
      },
      name: 'Hypothesis Developers',
      type: 'private',
    }, {
      id: 'restricto',
      links: {
        html: RESTRICTED_GROUP_LINK,
      },
      name: 'Hello Restricted',
      type: 'restricted',
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

  function createGroupList({ userid } = { userid: 'acct:person@example.com' }) {
    return util.createDirective(document, 'groupList', {
      auth: {
        status: userid ? 'logged-in' : 'logged-out',
        userid,
      },
    });
  }

  it('should render groups', function () {
    var element = createGroupList();
    var groupItems = element.find('.group-item');
    assert.equal(groupItems.length, groups.length + 1);
  });

  it('should render appropriate group name link title per group type', function() {
    var element = createGroupList();
    var nameLinks = element.find('.group-name-link');
    assert.equal(nameLinks.length, groups.length + 1);

    assert.include(nameLinks[0].title, 'Show public annotations'); // Open
    assert.include(nameLinks[1].title, 'Show and create annotations in'); // Private
    assert.include(nameLinks[2].title, 'Show public annotations'); // Restricted
  });

  it('should render share links', function () {
    var element = createGroupList();
    var shareLinks = element.find('.share-link-container');
    assert.equal(shareLinks.length, groups.length);

    var link = element.find('.share-link');
    assert.equal(link.length, groups.length);

    assert.equal(link[0].href, OPEN_GROUP_LINK);
    assert.equal(link[1].href, PRIVATE_GROUP_LINK);
    assert.equal(link[2].href, RESTRICTED_GROUP_LINK);
  });

  [{
    // Logged-in third party user.
    firstPartyAuthDomain: 'example.com',
    authDomain: 'publisher.org',
    userid: 'acct:person@publisher.org',
  },{
    // Logged-out third party user.
    firstPartyAuthDomain: 'example.com',
    authDomain: 'publisher.org',
    userid: null,
  }].forEach(({ firstPartyAuthDomain, authDomain, userid }) => {
    it('should not render share links for third-party groups', () => {
      fakeSettings.authDomain = firstPartyAuthDomain;
      fakeSettings.services = [{
        authority: authDomain,
      }];

      var element = createGroupList({ userid });
      var shareLinks = element.find('.share-link-container');

      assert.equal(shareLinks.length, 0);
    });
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
