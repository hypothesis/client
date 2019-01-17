'use strict';

const { isThirdPartyUser } = require('../util/account-id');
const isThirdPartyService = require('../util/is-third-party-service');
const serviceConfig = require('../service-config');

// @ngInject
function SidebarHeaderController(groups) {
  this.groups = groups;

  this.showHeader = function() {
    return !( this.isThirdPartyService && (this.groups.all().length <= 1) );
  };

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
