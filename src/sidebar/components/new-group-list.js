'use strict';

var { isThirdPartyUser } = require('../util/account-id');
var serviceConfig = require('../service-config');

/**
 * Controller for new-group-list - https://docs.google.com/presentation/d/1ESiIotb91xJnUj9v6M2R2qW0o7akT1MbwsIMPjab6Ho/edit#slide=id.g2576362aea_1_2
 * @ngInject
 */
function NewGroupListController($window, analytics, groups, settings, serviceUrl) {
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

  var svc = serviceConfig(settings);
  if (svc && svc.icon) {
    this.thirdPartyGroupIcon = svc.icon;
  }
}

module.exports = {
  controller: NewGroupListController,
  controllerAs: 'vm',
  bindings: {
    auth: '<',
    groups: '<',
  },
  template: require('../templates/new-group-list.html'),
};
