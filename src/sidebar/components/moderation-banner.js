'use strict';

var annotationMetadata = require('../annotation-metadata');

// @ngInject
function ModerationBannerController(annotationUI, flash, store, $filter) {
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
    store.annotation.hide({id: self.annotation.id}).then(function () {
      annotationUI.hideAnnotation(self.annotation.id);
    }).catch(function () {
      var msg = $filter('translate')('Failed to hide annotation');
      flash.error(msg);
    });
  };

  /**
   * Un-hide an annotation from non-moderator users.
   */
  this.unhideAnnotation = function () {
    store.annotation.unhide({id: self.annotation.id}).then(function () {
      annotationUI.unhideAnnotation(self.annotation.id);
    }).catch(function () {
      var msg = $filter('translate')('Failed to unhide annotation');
      flash.error(msg);
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
