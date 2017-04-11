'use strict';

// @ngInject
function SearchInputController($element, $http, $scope) {
  var self = this;
  var button = $element.find('button');
  var input = $element.find('input')[0];
  var form = $element.find('form')[0];

  button.on('click', function () {
    input.focus();
  });

  $scope.$watch(
    function () { return $http.pendingRequests.length; },
    function (count) { self.loading = count > 0; }
  );

  form.onsubmit = function (e) {
    e.preventDefault();
    self.onSearch({$query: input.value});
  };

  this.inputClasses = function () {
    return {'is-expanded': self.alwaysExpanded || self.query};
  };

  this.$onChanges = function (changes) {
    if (changes.query) {
      input.value = changes.query.currentValue;
    }
  };
}

module.exports = {
  controller: SearchInputController,
  controllerAs: 'vm',
  bindings: {
    // Specifies whether the search input field should always be expanded,
    // regardless of whether the it is focused or has an active query.
    //
    // If false, it is only expanded when focused or when 'query' is non-empty
    alwaysExpanded: '<',
    query: '<',
    onSearch: '&',
  },
  template: require('../templates/search-input.html'),
};
