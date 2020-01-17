import events from '../events';
import { isThirdPartyUser } from '../util/account-id';
import { isNew, isReply, isPageNote, quote } from '../util/annotation-metadata';

/**
 * Return a copy of `annotation` with changes made in the editor applied.
 */
export function updateModel(annotation, changes, permissions) {
  const userid = annotation.user;

  return Object.assign({}, annotation, {
    // Apply changes from the draft
    tags: changes.tags,
    text: changes.text,
    permissions: changes.isPrivate
      ? permissions.private(userid)
      : permissions.shared(userid, annotation.group),
  });
}

// @ngInject
function AnnotationController(
  $document,
  $rootScope,
  $scope,
  $timeout,
  $window,
  store,
  annotationMapper,
  api,
  bridge,
  flash,
  groups,
  permissions,
  serviceUrl,
  session,
  settings
) {
  const self = this;
  let newlyCreatedByHighlightButton;

  /** Save an annotation to the server. */
  function save(annot) {
    let saved;
    const updating = !!annot.id;

    if (updating) {
      saved = api.annotation.update({ id: annot.id }, annot);
    } else {
      saved = api.annotation.create({}, annot);
    }

    return saved.then(function(savedAnnot) {
      // Copy across internal properties which are not part of the annotation
      // model saved on the server
      savedAnnot.$tag = annot.$tag;
      Object.keys(annot).forEach(function(k) {
        if (k[0] === '$') {
          savedAnnot[k] = annot[k];
        }
      });

      return savedAnnot;
    });
  }

  /**
   * Initialize the controller instance.
   *
   * All initialization code except for assigning the controller instance's
   * methods goes here.
   */
  this.$onInit = () => {
    /** Determines whether controls to expand/collapse the annotation body
     * are displayed adjacent to the tags field.
     */
    self.canCollapseBody = false;

    /** Determines whether the annotation body should be collapsed. */
    self.collapseBody = true;

    /** True if the annotation is currently being saved. */
    self.isSaving = false;

    /**
     * `true` if this AnnotationController instance was created as a result of
     * the highlight button being clicked.
     *
     * `false` if the annotation button was clicked, or if this is a highlight
     * or annotation that was fetched from the server (as opposed to created
     * new client-side).
     */
    newlyCreatedByHighlightButton = self.annotation.$highlight || false;

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
      if (isNew(self.annotation) || store.getDraft(self.annotation)) {
        self.edit();
      }
    }
  };

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
    if (!isNew(self.annotation)) {
      // Already saved.
      return;
    }

    if (!self.annotation.user) {
      // Open sidebar to display error message about needing to login to create highlights.
      bridge.call('showSidebar');
    }

    if (!self.isHighlight()) {
      // Not a highlight,
      return;
    }

    if (self.annotation.user) {
      // User is logged in, save to server.
      // Highlights are always private.
      self.annotation.permissions = permissions.private(self.annotation.user);
      save(self.annotation).then(function(model) {
        model.$tag = self.annotation.$tag;
        $rootScope.$broadcast(events.ANNOTATION_CREATED, model);
      });
    } else {
      // User isn't logged in, save to drafts.
      store.createDraft(self.annotation, self.state());
    }
  }

  /**
   * @ngdoc method
   * @name annotation.AnnotationController#edit
   * @description Switches the view to an editor.
   */
  this.edit = function() {
    if (!store.getDraft(self.annotation)) {
      store.createDraft(self.annotation, self.state());
    }
  };

  /**
   * @ngdoc method
   * @name annotation.AnnotationController#editing.
   * @returns {boolean} `true` if this annotation is currently being edited
   *   (i.e. the annotation editor form should be open), `false` otherwise.
   */
  this.editing = function() {
    return store.getDraft(self.annotation) && !self.isSaving;
  };

  /**
   * @ngdoc method
   * @name annotation.AnnotationController#group.
   * @returns {Object} The full group object associated with the annotation.
   */
  this.group = function() {
    return groups.get(self.annotation.group);
  };

  /**
   * @ngdoc method
   * @name annotation.AnnotaitonController#hasContent
   * @returns {boolean} `true` if this annotation has content, `false`
   *   otherwise.
   */
  this.hasContent = function() {
    return self.state().text.length > 0 || self.state().tags.length > 0;
  };

  /**
   * Return the annotation's quote if it has one or `null` otherwise.
   */
  this.quote = () => quote(self.annotation);

  this.id = function() {
    return self.annotation.id;
  };

  /**
   * @ngdoc method
   * @name annotation.AnnotationController#isHighlight.
   * @returns {boolean} true if the annotation is a highlight, false otherwise
   */
  this.isHighlight = function() {
    if (newlyCreatedByHighlightButton) {
      return true;
    } else if (isNew(self.annotation)) {
      return false;
    } else {
      // Once an annotation has been saved to the server there's no longer a
      // simple property that says whether it's a highlight or not. Instead an
      // annotation is considered a highlight if it has a) content and b) is
      // linked to a specific part of the document.
      if (isPageNote(self.annotation) || isReply(self.annotation)) {
        return false;
      }
      if (self.annotation.hidden) {
        // Annotation has been censored so we have to assume that it had
        // content.
        return false;
      }
      return !self.hasContent();
    }
  };

  /**
   * @ngdoc method
   * @name annotation.AnnotationController#isShared
   * @returns {boolean} True if the annotation is shared (either with the
   * current group or with everyone).
   */
  this.isShared = function() {
    return !self.state().isPrivate;
  };

  // Save on Meta + Enter or Ctrl + Enter.
  this.onKeydown = function(event) {
    if (event.keyCode === 13 && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      self.save();
    }
  };

  this.toggleCollapseBody = function(event) {
    event.stopPropagation();
    self.collapseBody = !self.collapseBody;
  };

  /**
   * @ngdoc method
   * @name annotation.AnnotationController#reply
   * @description
   * Creates a new message in reply to this annotation.
   */
  this.reply = function() {
    const references = (self.annotation.references || []).concat(
      self.annotation.id
    );
    const group = self.annotation.group;
    let replyPermissions;
    const userid = session.state.userid;
    if (userid) {
      replyPermissions = self.state().isPrivate
        ? permissions.private(userid)
        : permissions.shared(userid, group);
    }
    annotationMapper.createAnnotation({
      group: group,
      references: references,
      permissions: replyPermissions,
      target: [{ source: self.annotation.target[0].source }],
      uri: self.annotation.uri,
    });
  };

  /**
   * @ngdoc method
   * @name annotation.AnnotationController#revert
   * @description Reverts an edit in progress and returns to the viewer.
   */
  this.revert = function() {
    store.removeDraft(self.annotation);
    if (isNew(self.annotation)) {
      $rootScope.$broadcast(events.ANNOTATION_DELETED, self.annotation);
    }
  };

  this.save = function() {
    if (!self.annotation.user) {
      flash.info('Please log in to save your annotations.');
      return Promise.resolve();
    }
    if (!self.hasContent() && self.isShared()) {
      flash.info('Please add text or a tag before publishing.');
      return Promise.resolve();
    }

    const updatedModel = updateModel(
      self.annotation,
      self.state(),
      permissions
    );

    // Optimistically switch back to view mode and display the saving
    // indicator
    self.isSaving = true;

    return save(updatedModel)
      .then(function(model) {
        Object.assign(updatedModel, model);

        self.isSaving = false;

        const event = isNew(self.annotation)
          ? events.ANNOTATION_CREATED
          : events.ANNOTATION_UPDATED;
        store.removeDraft(self.annotation);

        $rootScope.$broadcast(event, updatedModel);
      })
      .catch(function(err) {
        self.isSaving = false;
        self.edit();
        flash.error(err.message, 'Saving annotation failed');
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
  this.setPrivacy = function(privacy) {
    // When the user changes the privacy level of an annotation they're
    // creating or editing, we cache that and use the same privacy level the
    // next time they create an annotation.
    // But _don't_ cache it when they change the privacy level of a reply.
    if (!isReply(self.annotation)) {
      permissions.setDefault(privacy);
    }
    store.createDraft(self.annotation, {
      tags: self.state().tags,
      text: self.state().text,
      isPrivate: privacy === 'private',
    });
  };

  this.user = function() {
    return self.annotation.user;
  };

  this.isThirdPartyUser = function() {
    return isThirdPartyUser(self.annotation.user, settings.authDomain);
  };

  this.isDeleted = function() {
    return store.hasPendingDeletion(self.annotation.id);
  };

  this.isHiddenByModerator = function() {
    return self.annotation.hidden;
  };

  this.isReply = function() {
    return isReply(self.annotation);
  };

  /**
   * Sets whether or not the controls for expanding/collapsing the body of
   * lengthy annotations should be shown.
   */
  this.setBodyCollapsible = function(canCollapse) {
    if (canCollapse === self.canCollapseBody) {
      return;
    }
    self.canCollapseBody = canCollapse;
  };

  this.setText = function(text) {
    store.createDraft(self.annotation, {
      isPrivate: self.state().isPrivate,
      tags: self.state().tags,
      text: text,
    });
  };

  this.setTags = function(tags) {
    store.createDraft(self.annotation, {
      isPrivate: self.state().isPrivate,
      tags: tags,
      text: self.state().text,
    });
  };

  this.state = function() {
    const draft = store.getDraft(self.annotation);
    if (draft) {
      return draft;
    }
    return {
      tags: self.annotation.tags,
      text: self.annotation.text,
      isPrivate: !permissions.isShared(
        self.annotation.permissions,
        self.annotation.user
      ),
    };
  };

  /**
   * Return true if the CC 0 license notice should be shown beneath the
   * annotation body.
   */
  this.shouldShowLicense = function() {
    if (!self.editing() || !self.isShared()) {
      return false;
    }
    return self.group().type !== 'private';
  };
}

export default {
  controller: AnnotationController,
  controllerAs: 'vm',
  bindings: {
    annotation: '<',
    showDocumentInfo: '<',
    onReplyCountClick: '&',
    replyCount: '<',
    isCollapsed: '<',
  },
  template: require('../templates/annotation.html'),
};
