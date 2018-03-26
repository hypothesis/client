'use strict';

var annotationMetadata = require('../annotation-metadata');

// @ngInject
function ModerationBannerController(store, flash, api) {
  var self = this;

  this.flagCount = function () {
    return annotationMetadata.flagCount(self.annotation);
  };

  this.isHidden = function () {
    return self.annotation.hidden;
  };

  this.isHiddenOrFlagged = function () {
    var flagCount = self.flagCount();
    return flagCount !== null && (flagCount > 0 || self.isHidden());
  };

  this.isReply = function () {
    return annotationMetadata.isReply(self.annotation);
  };

  /**
   * Hide an annotation from non-moderator users.
   */
  this.hideAnnotation = function () {
    api.annotation.hide({id: self.annotation.id}).then(function () {
      store.hideAnnotation(self.annotation.id);
    }).catch(function () {
      flash.error('Failed to hide annotation');
    });
  };

  /**
   * Un-hide an annotation from non-moderator users.
   */
  this.unhideAnnotation = function () {
    api.annotation.unhide({id: self.annotation.id}).then(function () {
      store.unhideAnnotation(self.annotation.id);
    }).catch(function () {
      flash.error('Failed to unhide annotation');
    });
  };
}

/**
 * Banner shown above flagged annotations to allow moderators to hide/unhide the
 * annotation from other users.
 */

module.exports = {
  controller: ModerationBannerController,
  controllerAs: 'vm',
  bindings: {
    annotation: '<',
  },
  template: require('../templates/moderation-banner.html'),
};
