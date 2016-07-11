'use strict';

module.exports = ['$animate', function($animate) {
  return {
    link: function(scope, elem) {
      // ngAnimate conflicts with the spinners own CSS
      $animate.enabled(false, elem);
    },
    restrict: 'C',
    template: '<span><span></span></span>',
  };
}];
