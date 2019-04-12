'use strict';

// @ngInject
function SearchInputController($element, store) {
  const self = this;
  const button = $element.find('button');
  const input = $element.find('input')[0];
  const form = $element.find('form')[0];

  button.on('click', function() {
    input.focus();
  });

  form.onsubmit = function(e) {
    e.preventDefault();
    self.onSearch({ $query: input.value });
  };

  this.isLoading = () => store.isLoading();

  this.inputClasses = function() {
    return { 'is-expanded': self.alwaysExpanded || self.query };
  };

  this.$onChanges = function(changes) {
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
