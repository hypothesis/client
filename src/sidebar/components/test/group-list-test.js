'use strict';

const angular = require('angular');
const immutable = require('seamless-immutable');

const { events } = require('../../services/analytics');
const groupList = require('../group-list');
const util = require('../../directive/test/util');

const groupFixtures = require('../../test/group-fixtures');

describe('groupList', function() {
  let $window;

  const privateGroup = immutable({
    id: 'private',
    links: {
      html: 'https://hypothes.is/groups/hdevs',
    },
    name: 'Private',
    organization: groupFixtures.defaultOrganization(),
    type: 'private',
    isScopedToUri: true,
  });

  const restrictedGroup = immutable({
    id: 'restricted',
    links: {
      html: 'https://hypothes.is/groups/restricto',
    },
    name: 'Restricted',
    organization: groupFixtures.defaultOrganization(),
    type: 'restricted',
    isScopedToUri: true,
  });

  const publicGroup = immutable({
    id: '__world__',
    links: {
      html: 'https://hypothes.is/groups/__world__/public',
    },
    name: 'Public',
    organization: groupFixtures.defaultOrganization(),
    type: 'open',
    isScopedToUri: true,
  });

  let groups;
  let fakeGroups;
  let fakeAnalytics;
  let fakeServiceUrl;
  let fakeSettings;
  let fakeFeatures;

  before(function() {
    angular
      .module('app', [])
      .component('groupList', groupList)
      .factory('groups', function() {
        return fakeGroups;
      });
  });

  beforeEach(function() {
    fakeFeatures = {
      flagEnabled: sinon.stub().returns(false),
    };

    fakeAnalytics = {
      track: sinon.stub(),
      events,
    };

    fakeServiceUrl = sinon.stub();
    fakeSettings = {
      authDomain: 'example.com',
    };

    angular.mock.module('app', {
      analytics: fakeAnalytics,
      serviceUrl: fakeServiceUrl,
      settings: fakeSettings,
      features: fakeFeatures,
    });
  });

  beforeEach(
    angular.mock.inject(function(_$window_) {
      $window = _$window_;

      groups = [publicGroup, privateGroup, restrictedGroup];

      fakeGroups = {
        all: function() {
          return groups;
        },
        get: function(id) {
          const match = this.all().filter(function(group) {
            return group.id === id;
          });
          return match.length > 0 ? match[0] : undefined;
        },
        leave: sinon.stub(),
        focus: sinon.stub(),
        focused: sinon.stub(),
      };
    })
  );

  function createGroupList({ userid } = { userid: 'acct:person@example.com' }) {
    return util.createDirective(document, 'groupList', {
      auth: {
        status: userid ? 'logged-in' : 'logged-out',
        userid,
      },
    });
  }

  it('should render groups', function() {
    const element = createGroupList();
    const groupItems = element.find('.group-item');
    assert.equal(groupItems.length, groups.length + 1);
  });

  it('should render appropriate group name link title per group type', function() {
    const element = createGroupList();
    const nameLinks = element.find('.group-name-link');
    assert.equal(nameLinks.length, groups.length + 1);

    assert.include(nameLinks[0].title, 'Show public annotations'); // Open
    assert.include(nameLinks[1].title, 'Show and create annotations in'); // Private
    assert.include(nameLinks[2].title, 'Show public annotations'); // Restricted
  });

  it('should render organization logo for focused group', function() {
    const org = groupFixtures.organization({
      logo: 'http://www.example.com/foobar',
    });
    const group = groupFixtures.expandedGroup({
      organization: org,
    });
    fakeGroups.focused = () => {
      return group;
    };

    const element = createGroupList();
    const imgEl = element.find('.dropdown-toggle > img.group-list-label__icon');

    assert.equal(imgEl[0].src, org.logo);
  });

  it('should render fallback icon for focused group when no logo (private)', function() {
    const org = groupFixtures.organization({ logo: null });
    const group = groupFixtures.expandedGroup({
      organization: org,
      type: 'private',
    });
    fakeGroups.focused = () => {
      return group;
    };

    const element = createGroupList();
    const iconEl = element.find('.dropdown-toggle > i.h-icon-group');

    assert.ok(iconEl[0]);
  });

  it('should render fallback icon for focused group when no logo (restricted)', function() {
    const org = groupFixtures.organization({ logo: null });
    const group = groupFixtures.expandedGroup({
      organization: org,
      type: 'restricted',
    });
    fakeGroups.focused = () => {
      return group;
    };

    const element = createGroupList();
    const iconEl = element.find('.dropdown-toggle > i.h-icon-public');

    assert.ok(iconEl[0]);
  });

  it('should render fallback icon for focused group when no logo (open)', function() {
    const org = groupFixtures.organization({ logo: null });
    const group = groupFixtures.expandedGroup({
      organization: org,
      type: 'open',
    });
    fakeGroups.focused = () => {
      return group;
    };

    const element = createGroupList();
    const iconEl = element.find('.dropdown-toggle > i.h-icon-public');

    assert.ok(iconEl[0]);
  });

  it('should render organization icons for first group in each organization', function() {
    const orgs = [
      groupFixtures.defaultOrganization(),
      groupFixtures.organization(),
    ];
    groups = [
      groupFixtures.expandedGroup({ organization: orgs[0] }),
      groupFixtures.expandedGroup({ organization: orgs[0] }),
      groupFixtures.expandedGroup({ organization: orgs[1] }),
      groupFixtures.expandedGroup({ organization: orgs[1] }),
    ];

    const element = createGroupList();
    const iconContainers = element.find('.group-menu-icon-container');
    const iconImages = element.find('.group-menu-icon-container > img');

    assert.lengthOf(iconContainers, groups.length);
    assert.lengthOf(iconImages, orgs.length);
  });

  it('should not render organization icons for menu groups if missing', function() {
    const orgs = [
      groupFixtures.organization({ logo: null }),
      groupFixtures.organization({ logo: null }),
    ];
    groups = [
      groupFixtures.expandedGroup({ organization: orgs[0] }),
      groupFixtures.expandedGroup({ organization: orgs[0] }),
      groupFixtures.expandedGroup({ organization: orgs[1] }),
      groupFixtures.expandedGroup({ organization: orgs[1] }),
    ];

    const element = createGroupList();
    const iconContainers = element.find('.group-menu-icon-container');
    const iconImages = element.find('.group-menu-icon-container > img');

    assert.lengthOf(iconContainers, groups.length);
    assert.lengthOf(iconImages, 0);
  });

  it('should render share links', function() {
    const element = createGroupList();
    const shareLinks = element.find('.share-link-container');
    assert.equal(shareLinks.length, groups.length);

    const link = element.find('.share-link');
    assert.equal(link.length, groups.length);

    assert.equal(link[0].href, publicGroup.links.html);
    assert.equal(link[1].href, privateGroup.links.html);
    assert.equal(link[2].href, restrictedGroup.links.html);
  });

  it('should not render share links if they are not present', function() {
    groups = [
      {
        type: 'private',
      },
      {
        id: 'anOpenGroup',
        type: 'open',
        links: {},
      },
    ];
    const element = createGroupList();
    const links = element.find('.share-link-container');
    assert.equal(links.length, 0);
  });

  [
    {
      // Logged-in third party user.
      firstPartyAuthDomain: 'example.com',
      authDomain: 'publisher.org',
      userid: 'acct:person@publisher.org',
    },
    {
      // Logged-out third party user.
      firstPartyAuthDomain: 'example.com',
      authDomain: 'publisher.org',
      userid: null,
    },
  ].forEach(({ firstPartyAuthDomain, authDomain, userid }) => {
    it('should not render share links for third-party groups', () => {
      fakeSettings.authDomain = firstPartyAuthDomain;
      fakeSettings.services = [
        {
          authority: authDomain,
        },
      ];

      const element = createGroupList({ userid });
      const shareLinks = element.find('.share-link-container');

      assert.equal(shareLinks.length, 0);
    });
  });

  it('should track metrics when a user attempts to view a groups activity', function() {
    const element = createGroupList();
    const link = element.find('.share-link');
    link.click();
    assert.calledWith(
      fakeAnalytics.track,
      fakeAnalytics.events.GROUP_VIEW_ACTIVITY
    );
  });

  function clickLeaveIcon(element, acceptPrompt) {
    const leaveLink = element.find('.h-icon-cancel-outline');

    // accept prompt to leave group
    $window.confirm = function() {
      return acceptPrompt;
    };
    leaveLink.click();
  }

  it('should leave group when the leave icon is clicked', function() {
    const element = createGroupList();
    clickLeaveIcon(element, true);
    assert.ok(fakeGroups.leave.calledWith(privateGroup.id));
    assert.calledWith(fakeAnalytics.track, fakeAnalytics.events.GROUP_LEAVE);
  });

  it('should not leave group when confirmation is dismissed', function() {
    const element = createGroupList();
    clickLeaveIcon(element, false);
    assert.notCalled(fakeGroups.leave);
    assert.notCalled(fakeAnalytics.track);
  });

  it('should not change the focused group when leaving', function() {
    const element = createGroupList();
    clickLeaveIcon(element, true);
    assert.notCalled(fakeGroups.focus);
    assert.calledWith(fakeAnalytics.track, fakeAnalytics.events.GROUP_LEAVE);
  });

  it('should change current group focus when click another group', function() {
    const element = createGroupList();
    const groupItems = element.find('.group-item');

    // click the second group
    groupItems[1].click();

    assert.calledOnce(fakeGroups.focus);
    assert.calledWith(fakeAnalytics.track, fakeAnalytics.events.GROUP_SWITCH);
  });

  it('should open a window when "New Group" is clicked', function() {
    fakeServiceUrl
      .withArgs('groups.new')
      .returns('https://test.hypothes.is/groups/new');

    const element = createGroupList();
    $window.open = sinon.stub();

    const newGroupLink = element[0].querySelector('.new-group-btn a');
    angular.element(newGroupLink).click();
    assert.calledWith(
      $window.open,
      'https://test.hypothes.is/groups/new',
      '_blank'
    );
  });

  describe('group menu visibility', () => {
    it('is hidden when third party service and only one group', function() {
      // Configure third party service.
      fakeSettings.authDomain = 'example.com';
      fakeSettings.services = [
        {
          authority: 'publisher.org',
        },
      ];

      // Configure only one group.
      groups = [privateGroup];

      const element = createGroupList();

      const showGroupsMenu = element.ctrl.showGroupsMenu();
      const dropdownToggle = element.find('.dropdown-toggle');
      const arrowIcon = element.find('.h-icon-arrow-drop-down');
      const dropdownMenu = element.find('.dropdown-menu__top-arrow');
      const dropdownOptions = element.find('.dropdown-menu__row');

      assert.isFalse(showGroupsMenu);
      assert.lengthOf(dropdownToggle, 0);
      assert.lengthOf(arrowIcon, 0);
      assert.lengthOf(dropdownMenu, 0);
      assert.lengthOf(dropdownOptions, 0);
    });

    it('is shown when there is more than one group', function() {
      // Configure third party service.
      fakeSettings.authDomain = 'example.com';
      fakeSettings.services = [
        {
          authority: 'publisher.org',
        },
      ];

      const element = createGroupList();

      const showGroupsMenu = element.ctrl.showGroupsMenu();
      const dropdownToggle = element.find('.dropdown-toggle');
      const arrowIcon = element.find('.h-icon-arrow-drop-down');
      const dropdownMenu = element.find('.dropdown-menu__top-arrow');
      const dropdownOptions = element.find('.dropdown-menu__row');

      assert.isTrue(showGroupsMenu);
      assert.lengthOf(dropdownToggle, 1);
      assert.lengthOf(arrowIcon, 1);
      assert.lengthOf(dropdownMenu, 1);
      assert.lengthOf(dropdownOptions, 4);
    });

    it('is shown when it is not a third party service', function() {
      // Configure only one group.
      groups = [privateGroup];

      const element = createGroupList();

      const showGroupsMenu = element.ctrl.showGroupsMenu();
      const dropdownToggle = element.find('.dropdown-toggle');
      const arrowIcon = element.find('.h-icon-arrow-drop-down');
      const dropdownMenu = element.find('.dropdown-menu__top-arrow');
      const dropdownOptions = element.find('.dropdown-menu__row');

      assert.isTrue(showGroupsMenu);
      assert.lengthOf(dropdownToggle, 1);
      assert.lengthOf(arrowIcon, 1);
      assert.lengthOf(dropdownMenu, 1);
      assert.lengthOf(dropdownOptions, 2);
    });
  });

  [false, true].forEach(isEnabled => {
    it('returns what features.flagEnabled returns', function() {
      fakeFeatures.flagEnabled.withArgs('community_groups').returns(isEnabled);

      const element = createGroupList();

      const communityGroupsEnabled = element.ctrl.isFeatureFlagEnabled(
        'community_groups'
      );
      assert.isTrue(communityGroupsEnabled === isEnabled);
    });
  });
});
