'use strict';

/**
 * The <svg-icon> component renders SVG icons using inline <svg> tags,
 * enabling their appearance to be customized via CSS.
 *
 * This matches the way we do icons on the website, see
 * https://github.com/hypothesis/h/pull/3675
 */

// The list of supported icons
var icons = {
  refresh: require('../../images/icons/refresh.svg'),
  cursor: require('../../images/icons/cursor.svg'),
};

// @ngInject
function SvgIconController($element) {
  if (!icons[this.name]) {
    throw new Error('Unknown icon: ' + this.name);
  }
  $element[0].innerHTML = icons[this.name];
}

module.exports = {
  controllerAs: 'vm',
  controller: SvgIconController,
  bindings: {
    /** The name of the icon to load. */
    name: '<',
  },
};
