'use strict';

// @ngInject
function ModerationBannerController(annotationUI, flash, store) {
  this.flagCount = function () {
    return annotationUI.flagCount(this.annotationId);
  };

  this.isHidden = function () {
    return annotationUI.isHiddenByModerator(this.annotationId);
  };

  /**
   * Hide an annotation from non-moderator users.
   */
  this.hideAnnotation = function () {
    store.annotation.hide({id: this.annotationId}).then(function () {
      annotationUI.annotationHiddenChanged(this.annotationId, true);
    }).catch(function (err) {
      flash.error(err.message);
    });
  };

  /**
   * Un-hide an annotation from non-moderator users.
   */
  this.unhideAnnotation = function () {
    store.annotation.unhide({id: this.annotationId}).then(function () {
      annotationUI.annotationHiddenChanged(this.annotationId, false);
    }).catch(function (err) {
      flash.error(err.message);
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
    /**
     * The ID of the annotation whose moderation status the banner should
     * reflect.
     */
    annotationId: '<',
    /**
     * `true` if this annotation is a reply.
     */
    isReply: '<',
  },
  template: require('../templates/moderation_banner.html'),
};
