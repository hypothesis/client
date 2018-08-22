'use strict';

/**
 * @description Displays a combined privacy/selection post button to post
 *              a new annotation
 */
// @ngInject
module.exports = {
  controller: function (settings) {
    this.showDropdown = false;
    this.privateLabel = 'Only Me';
    this.isThemeCustom = settings.theme === 'custom';
    this.private = false;
    this.onSetPrivacy({level: 'shared'});

    this.publishDestination = function () {
      return this.isShared ? this.group.name : this.privateLabel;
    };

    this.groupType = function () {
      return this.group.public ? 'public' : 'group';
    };

    this.setPrivacy = function (isPrivate) {
      var level = isPrivate ? 'private' : 'shared';
      this.onSetPrivacy({level: level});
    };
  },
  controllerAs: 'vm',
  bindings: {
    group: '<',
    canPost: '<',
    isShared: '<',
    onCancel: '&',
    onSave: '&',
    onSetPrivacy: '&',
    onCreate: '&',
  },
  template: require('../templates/publish-annotation-btn.html'),
};
