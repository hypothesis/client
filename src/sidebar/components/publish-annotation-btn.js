'use strict';

/**
 * @description Displays a combined privacy/selection post button to post
 *              a new annotation
 */
// @ngInject
module.exports = {
  controller: function (i18nService) {
    this.showDropdown = false;
    this.privateLabel = i18nService.tl('sidePanel.channels.onlyMe.name');
    this.groupName = i18nService.tl('sidePanel.channels.'+this.group.id.replace(/-/g, '') +'.name');

    this.publishDestination = function () {
      return this.isShared ? this.groupName : this.privateLabel;
    };

    this.groupCategory = function () {
      return this.group.type === 'open' ? 'public' : 'group';
    };

    this.setPrivacy = function (level) {
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
  },
  template: require('../templates/publish-annotation-btn.html'),
};
