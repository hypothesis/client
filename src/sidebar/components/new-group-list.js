'use strict';

var persona = require('../filter/persona');
var serviceConfig = require('../service-config');

// @ngInject
function NewGroupListController($window, analytics, groups, settings, serviceUrl) {
  this.groups = groups;

  this.createNewGroup = function() {
    $window.open(serviceUrl('groups.new'), '_blank');
  };

  this.isThirdPartyUser = function () {
    return persona.isThirdPartyUser(this.auth.userid, settings.authDomain);
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
