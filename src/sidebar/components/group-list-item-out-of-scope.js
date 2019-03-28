'use strict';

const {
  orgName,
  trackViewGroupActivity,
} = require('../util/group-list-item-common');

// @ngInject
function GroupListItemOutOfScopeController(analytics) {
  // Track whether the group details are expanded.
  this.isDetailsExpanded = false;

  /**
   * Toggle the expanded setting on un-selectable groups.
   */
  this.toggleGroupDetails = function(event) {
    event.stopPropagation();
    this.isDetailsExpanded = !this.isDetailsExpanded;
  };

  this.orgName = function() {
    return orgName(this.group);
  };

  this.trackViewGroupActivity = function() {
    trackViewGroupActivity(analytics);
  };
}

module.exports = {
  controller: GroupListItemOutOfScopeController,
  controllerAs: 'vm',
  bindings: {
    group: '<',
  },
  template: require('../templates/group-list-item-out-of-scope.html'),
};
