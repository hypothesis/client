'use strict';

var persona = require('../filter/persona');
var serviceConfig = require('../service-config');

// @ngInject
function GroupListController($window, groups, settings, serviceUrl) {
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
      groups.leave(groupId);
    }
  };

  this.focusGroup = function (groupId) {
    groups.focus(groupId);
  };

  var svc = serviceConfig(settings);
  if (svc && svc.icon) {
    this.thirdPartyGroupIcon = svc.icon;
  }
}

module.exports = {
  controller: GroupListController,
  controllerAs: 'vm',
  bindings: {
    auth: '<',
  },
  template: require('../templates/group_list.html'),
};
