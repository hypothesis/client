'use strict';

module.exports = {
  controllerAs: 'vm',
  bindings: {
    icon: '<',
    isDisabled: '<',
    label: '<',
    onClick: '&',
  },
  template: require('../templates/annotation-action-button.html'),
};
