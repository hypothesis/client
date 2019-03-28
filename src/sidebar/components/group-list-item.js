'use strict';

const {
  orgName,
  trackViewGroupActivity,
} = require('../util/group-list-item-common');

// @ngInject
function GroupListItemController(analytics, store) {
  this.focusGroup = function() {
    analytics.track(analytics.events.GROUP_SWITCH);
    store.focusGroup(this.group.id);
  };

  this.isSelected = function() {
    return this.group.id === store.focusedGroupId();
  };

  this.orgName = function() {
    return orgName(this.group);
  };

  this.trackViewGroupActivity = function() {
    trackViewGroupActivity(analytics);
  };
}

module.exports = {
  controller: GroupListItemController,
  controllerAs: 'vm',
  bindings: {
    group: '<',
  },
  template: require('../templates/group-list-item.html'),
};
