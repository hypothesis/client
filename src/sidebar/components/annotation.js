'use strict';

var annotationMetadata = require('../annotation-metadata');
var events = require('../events');
var { isThirdPartyUser } = require('../util/account-id');

var isNew = annotationMetadata.isNew;
var isReply = annotationMetadata.isReply;
var isPageNote = annotationMetadata.isPageNote;

/**
 * Return a copy of `annotation` with changes made in the editor applied.
 */
function updateModel(annotation, changes, permissions) {
  var userid = annotation.user;

  return Object.assign({}, annotation, {
    // Apply changes from the draft
    tags: changes.tags,
    text: changes.text,
    permissions: changes.isPrivate ?
      permissions.private(userid) : permissions.shared(userid, annotation.group),
  });
}

// @ngInject
function AnnotationController(
  $document, $rootScope, $scope, $timeout, $window, analytics, annotationUI,
  annotationMapper, drafts, flash, groups, permissions, serviceUrl,
  session, settings, store, streamer, $filter) {

  var self = this;
  var newlyCreatedByHighlightButton;
  this.isThemeCustom = settings.theme === 'custom';

  /** Save an annotation to the server. */
  function save(annot) {

    var saved;
    var updating = !!annot.id;

    if (updating) {
      saved = store.annotation.update({id: annot.id}, annot);
    } else {
      saved = store.annotation.create({}, annot);
    }

    return saved.then(function (savedAnnot) {

      var event;

      // Copy across internal properties which are not part of the annotation
      // model saved on the server
      savedAnnot.$tag = annot.$tag;
      Object.keys(annot).forEach(function (k) {
        if (k[0] === '$') {
          savedAnnot[k] = annot[k];
        }
      });


      if(self.isReply()){
        event = updating ? analytics.events.REPLY_UPDATED : analytics.events.REPLY_CREATED;
      }else if(self.isHighlight()){
        event = updating ? analytics.events.HIGHLIGHT_UPDATED : analytics.events.HIGHLIGHT_CREATED;
      }else if(isPageNote(self.annotation)) {
        event = updating ? analytics.events.PAGE_NOTE_UPDATED : analytics.events.PAGE_NOTE_CREATED;
      }else {
        event = updating ? analytics.events.ANNOTATION_UPDATED : analytics.events.ANNOTATION_CREATED;
      }

      analytics.track(event);

      return savedAnnot;
    });
  }

  /**
    * Initialize the controller instance.
    *
    * All initialization code except for assigning the controller instance's
    * methods goes here.
    */
  function init() {
    /** Determines whether controls to expand/collapse the annotation body
     * are displayed adjacent to the tags field.
     */
    self.canCollapseBody = false;

    /** Determines whether the annotation body should be collapsed. */
    self.collapseBody = true;

    /** True if the annotation is currently being saved. */
    self.isSaving = false;

    /** True if the 'Share' dialog for this annotation is currently open. */
    self.showShareDialog = false;

    /** Determines whether the feedback should be collapsed according to the BZ/Jira bug status */
    self.collapseFeedback = true;

    /**
      * `true` if this AnnotationController instance was created as a result of
      * the highlight button being clicked.
      *
      * `false` if the annotation button was clicked, or if this is a highlight
      * or annotation that was fetched from the server (as opposed to created
      * new client-side).
      */
    newlyCreatedByHighlightButton = self.annotation.$highlight || false;

    // New annotations (just created locally by the client, rather then
    // received from the server) have some fields missing. Add them.
    //
    // FIXME: This logic should go in the `addAnnotations` Redux action once all
    // required state is in the store.
    self.annotation.user = self.annotation.user || session.state.userid;
    self.annotation.user_info = self.annotation.user_info || session.state.user_info;
    self.annotation.group = self.annotation.group || groups.focused().id;
    if (!self.annotation.permissions) {
      self.annotation.permissions = permissions.default(self.annotation.user,
                                                      self.annotation.group);
    }
    self.annotation.text = self.annotation.text || '';
    if (!Array.isArray(self.annotation.tags)) {
      self.annotation.tags = [];
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
      if (isNew(self.annotation) || drafts.get(self.annotation)) {
        self.edit();
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
    if (!isNew(self.annotation)) {
      // Already saved.
      return;
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
      drafts.update(self.annotation, self.state());
    }
  }

  this.authorize = function(action) {
    return permissions.permits(
      self.annotation.permissions,
      action,
      session.state.userid
    );
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#flag
    * @description Flag the annotation.
    */
  this.flag = function() {
    if (!session.state.userid) {
      var msg = $filter('translate')('You must be logged in to report an annotation to the moderators. Login to flag annotations');
      flash.error(msg);
      return;
    }

    var onRejected = function(err) {
      var msg = $filter('translate')('Flagging annotation failed');
      flash.error(err.message, msg);
    };
    annotationMapper.flagAnnotation(self.annotation).then(function(){
      analytics.track(analytics.events.ANNOTATION_FLAGGED);
      annotationUI.updateFlagStatus(self.annotation.id, true);
    }, onRejected);
  };
  /**
    * @ngdoc method
    * @name annotation.AnnotationController#delete
    * @description Deletes the annotation.
    */
  this.delete = function() {
    return $timeout(function() {  // Don't use confirm inside the digest cycle.
      var onRejected = function(err) {
        var msg = $filter('translate')('Deleting annotation failed');
        flash.error(err.message, msg);
      };
      $scope.$apply(function() {
        annotationMapper.deleteAnnotation(self.annotation).then(function(){
          var event;

          if(self.isReply()){
            event = analytics.events.REPLY_DELETED;
          }else if(self.isHighlight()){
            event = analytics.events.HIGHLIGHT_DELETED;
          }else if(isPageNote(self.annotation)){
            event = analytics.events.PAGE_NOTE_DELETED;
          }else {
            event = analytics.events.ANNOTATION_DELETED;
          }

          analytics.track(event);

        }, onRejected);
      });
    }, true);
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#edit
    * @description Switches the view to an editor.
    */
  this.edit = function() {
    if (!drafts.get(self.annotation)) {
      drafts.update(self.annotation, self.state());
    }
  };

  /**
   * @ngdoc method
   * @name annotation.AnnotationController#editing.
   * @returns {boolean} `true` if this annotation is currently being edited
   *   (i.e. the annotation editor form should be open), `false` otherwise.
   */
  this.editing = function() {
    return drafts.get(self.annotation) && !self.isSaving;
  };

  /**
   * @ngdoc method
   * @name annotation.AnnotationController#isCreateModeOn.
   * @returns {boolean} `true` if this annotation is in the create mode
   * @returns {boolean} `false` if this annotation is in the edit mode.
   */

  this.isCreateModeOn = function(){
    return isNew(self.annotation);
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
    // Note: Tags are not a criteria for content validity.
    // return self.state().text.length > 0 || self.state().tags.length > 0
    return self.state().text.length > 0;
  };

  /**
    * Return the annotation's quote if it has one or `null` otherwise.
    */
  this.quote = function() {
    if (self.annotation.target.length === 0) {
      return null;
    }
    var target = self.annotation.target[0];
    if (!target.selector) {
      return null;
    }
    var quoteSel = target.selector.find(function (sel) {
      return sel.type === 'TextQuoteSelector';
    });
    return quoteSel ? quoteSel.exact : null;
  };

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
  this.onKeydown = function (event) {
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
    var references = (self.annotation.references || []).concat(self.annotation.id);
    var group = self.annotation.group;
    var replyPermissions;
    var userid = session.state.userid;
    if (userid) {
      replyPermissions = self.state().isPrivate ?
        permissions.private(userid) : permissions.shared(userid, group);
    }
    annotationMapper.createAnnotation({
      group: group,
      references: references,
      permissions: replyPermissions,
      target: [{source: self.annotation.target[0].source}],
      uri: self.annotation.uri,
    });
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#revert
    * @description Reverts an edit in progress and returns to the viewer.
    */
  this.revert = function() {
    drafts.remove(self.annotation);
    if (isNew(self.annotation)) {
      $rootScope.$broadcast(events.ANNOTATION_DELETED, self.annotation);
    }
  };

  this.save = function() {
    var info_message;
    if (!self.annotation.user) {
      info_message = $filter('translate')('Please log in to save your annotations.');
      flash.info(info_message);
      return Promise.resolve();
    }
    if (!self.hasContent() && self.isShared()) {
      info_message = $filter('translate')('Please add text or a tag before publishing.');
      flash.info(info_message);
      return Promise.resolve();
    }

    var updatedModel = updateModel(self.annotation, self.state(), permissions);

    // Optimistically switch back to view mode and display the saving
    // indicator
    self.isSaving = true;

    return save(updatedModel).then(function (model) {
      Object.assign(updatedModel, model);

      self.isSaving = false;

      var event = isNew(self.annotation) ?
        events.ANNOTATION_CREATED : events.ANNOTATION_UPDATED;
      drafts.remove(self.annotation);

      $rootScope.$broadcast(event, updatedModel);
    }).catch(function (err) {
      self.isSaving = false;
      self.edit();
      var msg = $filter('translate')('Saving annotation failed');
      flash.error(err.message, msg);
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
    drafts.update(self.annotation, {
      tags: self.state().tags,
      text: self.state().text,
      isPrivate: privacy === 'private',
    });
  };

  this.tagSearchURL = function(tag) {
    if (this.isThirdPartyUser()) {
      return null;
    }
    return serviceUrl('search.tag', {tag: tag});
  };

  this.isOrphan = function() {
    if (typeof self.annotation.$orphan === 'undefined') {
      return self.annotation.$anchorTimeout;
    }
    return self.annotation.$orphan;
  };

  this.user = function() {
    return self.annotation.user;
  };

  this.isThirdPartyUser = function () {
    return isThirdPartyUser(self.annotation.user, settings.authDomain);
  };

  this.isDeleted = function () {
    return streamer.hasPendingDeletion(self.annotation.id);
  };

  this.isHiddenByModerator = function () {
    return self.annotation.hidden;
  };

  this.canFlag = function () {
    // Users can flag any annotations except their own.
    return session.state.userid !== self.annotation.user;
  };

  this.isFlagged = function() {
    return self.annotation.flagged;
  };

  this.isReply = function () {
    return isReply(self.annotation);
  };

  this.incontextLink = function () {
    if (self.annotation.links) {
      return self.annotation.links.incontext ||
             self.annotation.links.html ||
             '';
    }
    return '';
  };

  /**
   * Sets whether or not the controls for expanding/collapsing the body of
   * lengthy annotations should be shown.
   */
  this.setBodyCollapsible = function (canCollapse) {
    if (canCollapse === self.canCollapseBody) {
      return;
    }
    self.canCollapseBody = canCollapse;

    // This event handler is called from outside the digest cycle, so
    // explicitly trigger a digest.
    $scope.$digest();
  };

  this.setText = function (text) {
    drafts.update(self.annotation, {
      isPrivate: self.state().isPrivate,
      tags: self.state().tags,
      text: text,
    });
  };

  this.setTags = function (tags) {
    drafts.update(self.annotation, {
      isPrivate: self.state().isPrivate,
      tags: tags,
      text: self.state().text,
    });
  };

  this.state = function () {
    // This is the data that will return to me.
    // var tags = ["bug=bugType:bz;bugID:24918249;status:A"];
    var tags = [];
    var feedbackStatus = {};

    if (self.annotation.tags.length !== 0) {
      // This is for temporary data. It should be removed when backend send the data in the format below.
      // tags = [{'bug':{
      //   'bugType':'BZ',
      //   'bugID':'1466411',
      //   'status':'A'
      // }}];

      // Find the object that has the 'bug' attribute and return it as a status/
      // The reason of doing this, not to change the type of tags in the structure.
      feedbackStatus = self.annotation.tags.find(function(tag){
        return tag.bug !== undefined;
      });
    }


    var draft = drafts.get(self.annotation);
    if (draft) {
      return draft;
    }
    return {
      status: feedbackStatus,
      text: self.annotation.text,
      isPrivate: !permissions.isShared(self.annotation.permissions,self.annotation.user),
    };

  };

  // It is invoked in the template to return the status and the icon.
  this.feedbackStatus = function(status, type){
    /* BZ Statues
      'NEW' => 'awaiting_acknowledgement',
      'ASSIGNED' => 'in_progress',
      'POST' => 'in_progress',
      'MODIFIED' => 'needs_feedback',
      'ON_DEV' => 'in_progress',
      'ON_QA' => 'in_progress',
      'VERIFIED' => 'in_progress',
      'RELEASE_PENDING' => 'in_progress',
      'CLOSED' => 'closed',
    */
    // awaiting_acknowledgement == opened

    var feedbackStatus = {
      'A' : {'status':'opened', 'icon':'pficon-pending'},
      'I' : {'status':'in progress', 'icon':'pficon-pending'},
      'C' : {'status':'Resolved', 'icon':'pficon-ok'},
      'N' : {'status':'needs feedback', 'icon':'pficon-pending'},
    }[status];

    return {
      'status' : feedbackStatus.status,
      'icon' : feedbackStatus.icon,
    }[type];
  };

  this.toggleCollapsedFeedback = function(event){
    event.stopPropagation();
    self.collapseFeedback = !self.collapseFeedback;
  };

  this.isResolved = function() {
    if (!self.state() || !self.state().status || !self.state().status.bug) {
      return;
    }
    return self.state().status.bug.status === 'C';
  };

  /**
   * Return true if the CC 0 license notice should be shown beneath the
   * annotation body.
   */
  this.shouldShowLicense = function () {
    if (!self.editing() || !self.isShared()) {
      return false;
    }
    return self.group().public;
  };

  init();
}

module.exports = {
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

  // Private helper exposed for use in unit tests.
  updateModel: updateModel,
};
