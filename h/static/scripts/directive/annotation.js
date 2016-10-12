/* eslint consistent-this: ["error", "vm"] */

'use strict';

var annotationMetadata = require('../annotation-metadata');
var events = require('../events');
var memoize = require('../util/memoize');
var persona = require('../filter/persona');

var isNew = annotationMetadata.isNew;
var isReply = annotationMetadata.isReply;

/** Return a human-readable error message for the given server error.
 *
 * @param {object} reason The error object from the server. Should have
 * `status` and, if `status` is not `0`, `statusText` and (optionally)
 * `data.reason` properties.
 *
 * @returns {string}
 */
function errorMessage(reason) {
  var message;
  if (reason.status <= 0) {
    message = 'Service unreachable.';
  } else {
    message = reason.status + ' ' + reason.statusText;
    if (reason.data && reason.data.reason) {
      message = message + ': ' + reason.data.reason;
    }
  }
  return message;
}

/**
 * Return a copy of `annotation` with changes made in the editor applied.
 */
function updateModel(annotation, changes, permissions) {
  return Object.assign({}, annotation, {
    // Explicitly copy across the non-enumerable local tag for the annotation
    $$tag: annotation.$$tag,

    // Apply changes from the draft
    tags: changes.tags,
    text: changes.text,
    permissions: changes.isPrivate ?
      permissions.private() : permissions.shared(annotation.group),
  });
}

// @ngInject
function AnnotationController(
  $document, $q, $rootScope, $scope, $timeout, $window, annotationUI,
  drafts, flash, features, groups, permissions, serviceUrl,
  session, store, streamer) {

  var vm = this;
  var newlyCreatedByHighlightButton;

  /** Save an annotation to the server. */
  function save(annot) {
    var saved;
    if (annot.id) {
      saved = store.annotation.update({id: annot.id}, annot);
    } else {
      saved = store.annotation.create({}, annot);
    }
    return saved.then(function (savedAnnot) {
      // Copy across internal properties which are not part of the annotation
      // model saved on the server
      savedAnnot.$$tag = annot.$$tag;
      Object.keys(annot).forEach(function (k) {
        if (k[0] === '$') {
          savedAnnot[k] = annot[k];
        }
      });
      return savedAnnot;
    });
  }

  /**
    * Initialize this AnnotationController instance.
    *
    * Initialize the `vm` object and any other variables that it needs,
    * register event listeners, etc.
    *
    * All initialization code intended to run when a new AnnotationController
    * instance is instantiated should go into this function, except defining
    * methods on `vm`. This function is called on AnnotationController
    * instantiation after all of the methods have been defined on `vm`, so it
    * can call the methods.
    */
  function init() {
    // The remaining properties on vm are read-only properties for the
    // templates.

    vm.serviceUrl = serviceUrl;

    /** Give the template access to the feature flags. */
    vm.feature = features.flagEnabled;

    /** Determines whether controls to expand/collapse the annotation body
     * are displayed adjacent to the tags field.
     */
    vm.canCollapseBody = false;

    /** Determines whether the annotation body should be collapsed. */
    vm.collapseBody = true;

    /** True if the annotation is currently being saved. */
    vm.isSaving = false;

    /** True if the 'Share' dialog for this annotation is currently open. */
    vm.showShareDialog = false;

    /**
      * `true` if this AnnotationController instance was created as a result of
      * the highlight button being clicked.
      *
      * `false` if the annotation button was clicked, or if this is a highlight
      * or annotation that was fetched from the server (as opposed to created
      * new client-side).
      */
    newlyCreatedByHighlightButton = vm.annotation.$highlight || false;

    // New annotations (just created locally by the client, rather then
    // received from the server) have some fields missing. Add them.
    vm.annotation.user = vm.annotation.user || session.state.userid;
    vm.annotation.group = vm.annotation.group || groups.focused().id;
    if (!vm.annotation.permissions) {
      vm.annotation.permissions = permissions.default(vm.annotation.group);
    }
    vm.annotation.text = vm.annotation.text || '';
    if (!Array.isArray(vm.annotation.tags)) {
      vm.annotation.tags = [];
    }

    // Automatically save new highlights to the server when they're created.
    // Note that this line also gets called when the user logs in (since
    // AnnotationController instances are re-created on login) so serves to
    // automatically save highlights that were created while logged out when you
    // log in.
    saveNewHighlight();

    // If this annotation is not a highlight and if it's new (has just been
    // created by the annotate button) or it has edits not yet saved to the
    // server - then open the editor on AnnotationController instantiation.
    if (!newlyCreatedByHighlightButton) {
      if (isNew(vm.annotation) || drafts.get(vm.annotation)) {
        vm.edit();
      }
    }
  }

  /** Save this annotation if it's a new highlight.
   *
   * The highlight will be saved to the server if the user is logged in,
   * saved to drafts if they aren't.
   *
   * If the annotation is not new (it has already been saved to the server) or
   * is not a highlight then nothing will happen.
   *
   */
  function saveNewHighlight() {
    if (!isNew(vm.annotation)) {
      // Already saved.
      return;
    }

    if (!vm.isHighlight()) {
      // Not a highlight,
      return;
    }

    if (vm.annotation.user) {
      // User is logged in, save to server.
      // Highlights are always private.
      vm.annotation.permissions = permissions.private();
      save(vm.annotation).then(function(model) {
        model.$$tag = vm.annotation.$$tag;
        annotationUI.addAnnotations([model]);
      });
    } else {
      // User isn't logged in, save to drafts.
      drafts.update(vm.annotation, vm.state());
    }
  }

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#authorize
    * @param {string} action The action to authorize.
    * @returns {boolean} True if the action is authorized for the current user.
    * @description Checks whether the current user can perform an action on
    * the annotation.
    */
  vm.authorize = function(action) {
    // TODO: this should use auth instead of permissions but we might need
    // an auth cache or the JWT -> userid decoding might start to be a
    // performance bottleneck and we would need to get the id token into the
    // session, which we should probably do anyway (and move to opaque bearer
    // tokens for the access token).
    return permissions.permits(action, vm.annotation, session.state.userid);
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#delete
    * @description Deletes the annotation.
    */
  vm.delete = function() {
    return $timeout(function () {  // Don't use confirm inside the digest cycle.
      var msg = 'Are you sure you want to delete this annotation?';
      if (!$window.confirm(msg)) {
        return Promise.resolve();
      }

      return store.annotation.delete({
        id: vm.annotation.id,
      }).then(function () {
        $rootScope.$broadcast(events.ANNOTATION_DELETED, vm.annotation);
        return annotation;
      }).catch(function (err) {
        flash.error(errorMessage(err), 'Deleting annotation failed');
      });
    });
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#edit
    * @description Switches the view to an editor.
    */
  vm.edit = function() {
    if (!drafts.get(vm.annotation)) {
      drafts.update(vm.annotation, vm.state());
    }
  };

  /**
   * @ngdoc method
   * @name annotation.AnnotationController#editing.
   * @returns {boolean} `true` if this annotation is currently being edited
   *   (i.e. the annotation editor form should be open), `false` otherwise.
   */
  vm.editing = function() {
    return drafts.get(vm.annotation) && !vm.isSaving;
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#group.
    * @returns {Object} The full group object associated with the annotation.
    */
  vm.group = function() {
    return groups.get(vm.annotation.group);
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotaitonController#hasContent
    * @returns {boolean} `true` if this annotation has content, `false`
    *   otherwise.
    */
  vm.hasContent = function() {
    return vm.state().text.length > 0 || vm.state().tags.length > 0;
  };

  /**
    * @returns {boolean} True if this annotation has quotes
    */
  vm.hasQuotes = function() {
    return vm.annotation.target.some(function(target) {
      return target.selector && target.selector.some(function(selector) {
        return selector.type === 'TextQuoteSelector';
      });
    });
  };

  vm.id = function() {
    return vm.annotation.id;
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#isHighlight.
    * @returns {boolean} true if the annotation is a highlight, false otherwise
    */
  vm.isHighlight = function() {
    if (newlyCreatedByHighlightButton) {
      return true;
    } else if (isNew(vm.annotation)) {
      return false;
    } else {
      // Once an annotation has been saved to the server there's no longer a
      // simple property that says whether it's a highlight or not.  For
      // example there's no vm.annotation.highlight: true.  Instead a highlight is
      // defined as an annotation that isn't a page note or a reply and that
      // has no text or tags.
      var isPageNote = (vm.annotation.target || []).length === 0;
      return (!isPageNote && !isReply(vm.annotation) && !vm.hasContent());
    }
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#isShared
    * @returns {boolean} True if the annotation is shared (either with the
    * current group or with everyone).
    */
  vm.isShared = function() {
    return !vm.state().isPrivate;
  };

  // Save on Meta + Enter or Ctrl + Enter.
  vm.onKeydown = function (event) {
    if (event.keyCode === 13 && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      vm.save();
    }
  };

  vm.toggleCollapseBody = function(event) {
    event.stopPropagation();
    vm.collapseBody = !vm.collapseBody;
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#reply
    * @description
    * Creates a new message in reply to this annotation.
    */
  vm.reply = function() {
    var references = (vm.annotation.references || []).concat(vm.annotation.id);
    var group = vm.annotation.group;
    var replyPermissions;
    if (session.state.userid) {
      replyPermissions = vm.state().isPrivate ?
        permissions.private() : permissions.shared(group);
    }
    $rootScope.$broadcast(events.BEFORE_ANNOTATION_CREATED, {
      group: group,
      references: references,
      permissions: replyPermissions,
      uri: vm.annotation.uri,
    });
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#revert
    * @description Reverts an edit in progress and returns to the viewer.
    */
  vm.revert = function() {
    drafts.remove(vm.annotation);
    if (isNew(vm.annotation)) {
      $rootScope.$broadcast(events.ANNOTATION_DELETED, vm.annotation);
    }
  };

  vm.save = function() {
    if (!vm.annotation.user) {
      flash.info('Please log in to save your annotations.');
      return Promise.resolve();
    }
    if (!vm.hasContent() && vm.isShared()) {
      flash.info('Please add text or a tag before publishing.');
      return Promise.resolve();
    }

    var updatedModel = updateModel(vm.annotation, vm.state(), permissions);

    // Optimistically switch back to view mode and display the saving
    // indicator
    vm.isSaving = true;

    return save(updatedModel).then(function (model) {
      Object.assign(updatedModel, model);

      vm.isSaving = false;

      drafts.remove(vm.annotation);

      annotationUI.addAnnotations([updatedModel]);
    }).catch(function (reason) {
      vm.isSaving = false;
      vm.edit();
      flash.error(
        errorMessage(reason), 'Saving annotation failed');
    });
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#setPrivacy
    *
    * Set the privacy settings on the annotation to a predefined
    * level. The supported levels are 'private' which makes the annotation
    * visible only to its creator and 'shared' which makes the annotation
    * visible to everyone in the group.
    *
    * The changes take effect when the annotation is saved
    */
  vm.setPrivacy = function(privacy) {
    // When the user changes the privacy level of an annotation they're
    // creating or editing, we cache that and use the same privacy level the
    // next time they create an annotation.
    // But _don't_ cache it when they change the privacy level of a reply.
    if (!isReply(vm.annotation)) {
      permissions.setDefault(privacy);
    }
    drafts.update(vm.annotation, {
      tags: vm.state().tags,
      text: vm.state().text,
      isPrivate: privacy === 'private',
    });
  };

  vm.tagStreamURL = function(tag) {
    return serviceUrl('search.tag', {tag: tag});
  };

  vm.target = function() {
    return vm.annotation.target;
  };

  // Note: We fetch the feature flag outside the `isOrphan` method to avoid a
  // lookup on every $digest cycle
  var indicateOrphans = features.flagEnabled('orphans_tab');

  vm.isOrphan = function() {
    return vm.annotation.$orphan && indicateOrphans;
  };

  vm.updated = function() {
    return vm.annotation.updated;
  };

  vm.user = function() {
    return vm.annotation.user;
  };

  vm.username = function() {
    return persona.username(vm.annotation.user);
  };

  vm.isDeleted = function () {
    return streamer.hasPendingDeletion(vm.annotation.id);
  };

  vm.isReply = function () {
    return isReply(vm.annotation);
  };

  vm.links = function () {
    if (vm.annotation.links) {
      return {incontext: vm.annotation.links.incontext ||
                         vm.annotation.links.html ||
                         '',
              html: vm.annotation.links.html};
    } else {
      return {incontext: '', html: ''};
    }
  };

  /**
   * Sets whether or not the controls for expanding/collapsing the body of
   * lengthy annotations should be shown.
   */
  vm.setBodyCollapsible = function (canCollapse) {
    if (canCollapse === vm.canCollapseBody) {
      return;
    }
    vm.canCollapseBody = canCollapse;

    // This event handler is called from outside the digest cycle, so
    // explicitly trigger a digest.
    $scope.$digest();
  };

  vm.setText = function (text) {
    drafts.update(vm.annotation, {
      isPrivate: vm.state().isPrivate,
      tags: vm.state().tags,
      text: text,
    });
  };

  vm.setTags = function (tags) {
    drafts.update(vm.annotation, {
      isPrivate: vm.state().isPrivate,
      tags: tags,
      text: vm.state().text,
    });
  };

  vm.state = function () {
    var draft = drafts.get(vm.annotation);
    if (draft) {
      return draft;
    }
    return {
      tags: vm.annotation.tags,
      text: vm.annotation.text,
      isPrivate: permissions.isPrivate(vm.annotation.permissions,
        vm.annotation.user),
    };
  };

  var documentMeta = memoize(annotationMetadata.domainAndTitle);
  vm.documentMeta = function () {
    return documentMeta(vm.annotation);
  };

  init();
}

// @ngInject
function annotation() {
  return {
    restrict: 'E',
    bindToController: true,
    controller: AnnotationController,
    controllerAs: 'vm',
    scope: {
      annotation: '<',
      showDocumentInfo: '<',
      onReplyCountClick: '&',
      replyCount: '<',
      isCollapsed: '<',
    },
    template: require('../../../templates/client/annotation.html'),
  };
}

module.exports = {
  // These private helper functions aren't meant to be part of the public
  // interface of this module. They've been exported temporarily to enable them
  // to be unit tested.
  // FIXME: The code should be refactored to enable unit testing without having
  // to do this.
  updateModel: updateModel,

  // These are meant to be the public API of this module.
  directive: annotation,
  Controller: AnnotationController,
};
