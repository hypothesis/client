import { countVisible, countHidden } from '../util/thread';

function showAllChildren(thread, showFn) {
  thread.children.forEach(child => {
    showFn(child);
    showAllChildren(child, showFn);
  });
}

function showAllParents(thread, showFn) {
  while (thread.parent && thread.parent.annotation) {
    showFn(thread.parent);
    thread = thread.parent;
  }
}

// @ngInject
function AnnotationThreadController(features, store) {
  // Flag that tracks whether the content of the annotation is hovered,
  // excluding any replies.
  this.annotationHovered = false;

  this.toggleCollapsed = function() {
    this.onChangeCollapsed({
      id: this.thread.id,
      collapsed: !this.thread.collapsed,
    });
  };

  this.threadClasses = function() {
    return {
      'annotation-thread': true,
      'annotation-thread--reply': this.thread.depth > 0,
      'annotation-thread--top-reply': this.thread.depth === 1,
    };
  };

  this.threadToggleClasses = function() {
    return {
      'annotation-thread__collapse-toggle': true,
      'is-open': !this.thread.collapsed,
      'is-hovered': this.annotationHovered,
    };
  };

  this.annotationClasses = function() {
    return {
      annotation: true,
      'annotation--reply': this.thread.depth > 0,
      'is-collapsed': this.thread.collapsed,
      'is-highlighted': this.thread.highlightState === 'highlight',
      'is-dimmed': this.thread.highlightState === 'dim',
    };
  };

  /**
   * Show this thread and any of its children. This is available if filtering
   * is applied that hides items in the thread.
   */
  this.showThreadAndReplies = function() {
    showAllParents(this.thread, this.onForceVisible);
    this.onForceVisible(this.thread);
    showAllChildren(this.thread, this.onForceVisible);
  };

  this.isTopLevelThread = function() {
    return !this.thread.parent;
  };

  /**
   * Return the total number of annotations in the current
   * thread which have been hidden because they do not match the current
   * search filter.
   */
  this.hiddenCount = function() {
    return countHidden(this.thread);
  };

  this.shouldShowReply = function(child) {
    return countVisible(child) > 0;
  };

  this.onForceVisible = function(thread) {
    store.setForceVisible(thread.id, true);
    if (thread.parent) {
      store.setCollapsed(thread.parent.id, false);
    }
  };
}

export default {
  controllerAs: 'vm',
  controller: AnnotationThreadController,
  bindings: {
    /** The annotation thread to render. */
    thread: '<',
    /**
     * Specify whether document information should be shown
     * on annotation cards.
     */
    showDocumentInfo: '<',
    /** Called when the user clicks on the expand/collapse replies toggle. */
    onChangeCollapsed: '&',
  },
  template: require('../templates/annotation-thread.html'),
};
