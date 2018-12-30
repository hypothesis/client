'use strict';

// @ngInject
function SidebarHeaderController(groups) {
  this.groups = groups;

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

}

/**
 * @name sidebarHeader
 * @description Displays a heading and a link to the currently selected group page.
 */
// @ngInject
module.exports = {
  controller: SidebarHeaderController,
  controllerAs: 'vm',
  bindings: {},
  template: require('../templates/sidebar-header.html'),
};
