'use strict';

// @ngInject
function GroupListSectionController() {
  this.isSelectable = function(groupId) {
    const group = this.sectionGroups.find(g => g.id === groupId);
    return !group.scopes.enforced || group.isScopedToUri;
  };
}

module.exports = {
  controller: GroupListSectionController,
  controllerAs: 'vm',
  bindings: {
    /* The list of groups to be displayed in the group list section. */
    sectionGroups: '<',
    /* The string name of the group list section. */
    heading: '<',
  },
  template: require('../templates/group-list-section.html'),
};
