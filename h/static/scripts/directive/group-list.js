'use strict';

// @ngInject
function GroupListController($scope, $window, groups) {
  $scope.leaveGroup = function (groupId) {
    var groupName = groups.get(groupId).name;
    var message = 'Are you sure you want to leave the group "' +
      groupName + '"?';
    if ($window.confirm(message)) {
      groups.leave(groupId);
    }
  };

  $scope.focusGroup = function (groupId) {
    groups.focus(groupId);
  };
}

/**
 * @ngdoc directive
 * @name groupList
 * @restrict E
 * @description Displays a list of groups of which the user is a member.
 */
// @ngInject
function groupList($window, groups, serviceUrl) {
  return {
    controller: GroupListController,
    link: function ($scope) {
      $scope.groups = groups;

      $scope.createNewGroup = function() {
        $window.open(serviceUrl('groups.new'), '_blank');
      };
    },
    restrict: 'E',
    scope: {
      auth: '<',
    },
    template: require('../../../templates/client/group_list.html'),
  };
}

module.exports = {
  directive: groupList,
  Controller: GroupListController,
};
