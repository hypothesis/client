'use strict';

// @ngInject
function TagEditorController(tags) {
  this.onTagsChanged = function() {
    tags.store(this.tagList);

    const newTags = this.tagList.map(function(item) {
      return item.text;
    });
    this.onEditTags({ tags: newTags });
  };

  this.autocomplete = function(query) {
    return Promise.resolve(tags.filter(query));
  };

  this.$onChanges = function(changes) {
    if (changes.tags) {
      this.tagList = changes.tags.currentValue.map(function(tag) {
        return { text: tag };
      });
    }
  };
}

module.exports = {
  controller: TagEditorController,
  controllerAs: 'vm',
  bindings: {
    tags: '<',
    onEditTags: '&',
  },
  template: require('../templates/tag-editor.html'),
};
