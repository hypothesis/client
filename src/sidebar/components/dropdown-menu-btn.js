'use strict';

// @ngInject
function DropdownMenuBtnController($timeout) {
  const self = this;
  this.toggleDropdown = function($event) {
    $event.stopPropagation();
    $timeout(function() {
      self.onToggleDropdown();
    }, 0);
  };
}

module.exports = {
  controller: DropdownMenuBtnController,
  controllerAs: 'vm',
  bindings: {
    isDisabled: '<',
    label: '<',
    dropdownMenuLabel: '@',
    onClick: '&',
    onToggleDropdown: '&',
  },
  template: require('../templates/dropdown-menu-btn.html'),
};
