'use strict';

module.exports = {
  controllerAs: 'vm',
  controller: function () {},
  bindings: {
    /** The name of the currently selected sort key. */
    sortKey: '<',
    /** A list of possible keys that the user can opt to sort by. */
    sortKeysAvailable: '<',
    /** Called when the user changes the sort key. */
    onChangeSortKey: '&',
  },
  template: require('../templates/sort-dropdown.html'),
};
