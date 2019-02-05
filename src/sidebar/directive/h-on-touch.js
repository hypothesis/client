'use strict';

/**
 * Install an event handler on an element.
 *
 * The event handler follows the same behavior as the ng-<event name>
 * directives that Angular includes. This means:
 *
 *  - The handler function is passed an object with an $event property
 *  - The handler function is executed in the context of `$scope.$apply()`
 *
 * @param {Element} element
 * @param {Array<string>} events
 * @param {Function} handler
 */
function addEventHandler($scope, element, events, handler) {
  const callback = function(event) {
    $scope.$apply(function() {
      handler($scope, { $event: event });
    });
  };
  events.forEach(function(name) {
    element.addEventListener(name, callback);
  });
}

/**
 * A directive which adds an event handler for mouse press or touch to
 * a directive. This is similar to `ng-click` etc. but reacts either on
 * mouse press OR touch.
 */
// @ngInject
module.exports = function($parse) {
  return {
    restrict: 'A',
    link: function($scope, $element, $attrs) {
      const fn = $parse($attrs.hOnTouch, null /* interceptor */);
      addEventHandler(
        $scope,
        $element[0],
        ['click', 'mousedown', 'touchstart'],
        fn
      );
    },
  };
};
