'use strict';

var { isThirdPartyUser } = require('../util/account-id');
var isThirdPartyService = require('../util/is-third-party-service');
var serviceConfig = require('../service-config');

// @ngInject
function GroupListController($window, analytics, groups, settings, serviceUrl) {
  this.groups = groups;

  this.createNewGroup = function() {
    $window.open(serviceUrl('groups.new'), '_blank');
  };

  this.isThirdPartyUser = function () {
    return isThirdPartyUser(this.auth.userid, settings.authDomain);
  };

  this.leaveGroup = function (groupId) {
    var groupName = groups.get(groupId).name;
    var message = 'Are you sure you want to leave the group "' +
      groupName + '"?';
    if ($window.confirm(message)) {
      analytics.track(analytics.events.GROUP_LEAVE);
      groups.leave(groupId);
    }
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

  var svc = serviceConfig(settings);
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
