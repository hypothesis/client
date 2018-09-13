'use strict';

const { isThirdPartyUser } = require('../util/account-id');
const isThirdPartyService = require('../util/is-third-party-service');
const serviceConfig = require('../service-config');
const memoize = require('../util/memoize');
const groupOrganizations = memoize(require('../util/group-organizations'));

// @ngInject
function GroupListController($window, analytics, groups, settings, serviceUrl) {
  this.groups = groups;

  this.createNewGroup = function() {
    $window.open(serviceUrl('groups.new'), '_blank');
  };

  this.focusedIcon = function() {
    const focusedGroup = this.groups.focused();
    return focusedGroup && (
      focusedGroup.organization.logo || this.thirdPartyGroupIcon
    );
  };

  this.focusedIconClass = function() {
    const focusedGroup = this.groups.focused();
    return (focusedGroup && focusedGroup.type === 'private') ? 'group' : 'public';
  };

  this.isThirdPartyUser = function () {
    return isThirdPartyUser(this.auth.userid, settings.authDomain);
  };

  this.leaveGroup = function (groupId) {
    const groupName = groups.get(groupId).name;
    const message = 'Are you sure you want to leave the group "' +
      groupName + '"?';
    if ($window.confirm(message)) {
      analytics.track(analytics.events.GROUP_LEAVE);
      groups.leave(groupId);
    }
  };

  this.orgName = function (groupId) {
    const group = this.groups.get(groupId);
    return group && group.organization && group.organization.name;
  };

  this.groupOrganizations = function () {
    return groupOrganizations(this.groups.all());
  };

  this.viewGroupActivity = function () {
    analytics.track(analytics.events.GROUP_VIEW_ACTIVITY);
  };

  this.focusGroup = function (groupId) {
    analytics.track(analytics.events.GROUP_SWITCH);
    groups.focus(groupId);
  };

  /**
   * Show the share link for the group if it is not a third-party group
   * AND if the URL needed is present in the group object. We should be able
   * to simplify this once the API is adjusted only to return the link
   * when applicable.
   */
  this.shouldShowActivityLink = function (groupId) {
    const group = groups.get(groupId);
    return group.links && group.links.html && !this.isThirdPartyService;
  };

  const svc = serviceConfig(settings);
  if (svc && svc.icon) {
    this.thirdPartyGroupIcon = svc.icon;
  }

  this.isThirdPartyService = isThirdPartyService(settings);
}

module.exports = {
  controller: GroupListController,
  controllerAs: 'vm',
  bindings: {
    auth: '<',
  },
  template: require('../templates/group-list.html'),
};
