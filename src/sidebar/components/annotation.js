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
  };

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

  this.user = function() {
    return self.annotation.user;
  };

  this.isThirdPartyUser = function() {
    return isThirdPartyUser(self.annotation.user, settings.authDomain);
  };

  this.isDeleted = function() {
    return store.hasPendingDeletion(self.annotation.id);
  };

  this.isReply = function() {
    return isReply(self.annotation);
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
