'use strict';

// @ngInject
function GroupListSectionController() {
  this.isSelectable = function(groupId) {
    const group = this.sectionGroups.find(g => g.id === groupId);
    return (
      !this.disableOosGroupSelection ||
      !group.scopes.enforced ||
      group.isScopedToUri
    );
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
    /* A boolean indicating whether out of scope group selection should be disabled. */
    disableOosGroupSelection: '<',
  },
  template: require('../templates/group-list-section.html'),
};
