'use strict';

const events = require('../events');
const isThirdPartyService = require('../util/is-third-party-service');
const tabs = require('../util/tabs');

// @ngInject
function SidebarContentController(
  $scope,
  analytics,
  annotations,
  store,
  frameSync,
  rootThread,
  settings,
  streamer
) {
  const self = this;

  this.rootThread = () => rootThread.thread(store.getState());

  function focusAnnotation(annotation) {
    let highlights = [];
    if (annotation) {
      highlights = [annotation.$tag];
    }
    frameSync.focusAnnotations(highlights);
  }

  function scrollToAnnotation(annotation) {
    if (!annotation) {
      return;
    }
    frameSync.scrollToAnnotation(annotation.$tag);
  }

  /**
   * Returns the Annotation object for the first annotation in the
   * selected annotation set. Note that 'first' refers to the order
   * of annotations passed to store when selecting annotations,
   * not the order in which they appear in the document.
   */
  function firstSelectedAnnotation() {
    if (store.getState().selectedAnnotationMap) {
      const id = Object.keys(store.getState().selectedAnnotationMap)[0];
      return store.getState().annotations.find(function(annot) {
        return annot.id === id;
      });
    } else {
      return null;
    }
  }

  this.isLoading = () => {
    if (
      !store.frames().some(function(frame) {
        return frame.uri;
      })
    ) {
      // The document's URL isn't known so the document must still be loading.
      return true;
    }
    return store.isFetchingAnnotations();
  };

  $scope.$on('sidebarOpened', function() {
    analytics.track(analytics.events.SIDEBAR_OPENED);

    streamer.connect();
  });

  this.$onInit = () => {
    // If the user is logged in, we connect nevertheless
    if (this.auth.status === 'logged-in') {
      streamer.connect();
    }
  };

  $scope.$on(events.USER_CHANGED, function() {
    streamer.reconnect();
  });

  $scope.$on(events.ANNOTATIONS_SYNCED, function(event, tags) {
    // When a direct-linked annotation is successfully anchored in the page,
    // focus and scroll to it
    const selectedAnnot = firstSelectedAnnotation();
    if (!selectedAnnot) {
      return;
    }
    const matchesSelection = tags.some(function(tag) {
      return tag === selectedAnnot.$tag;
    });
    if (!matchesSelection) {
      return;
    }
    focusAnnotation(selectedAnnot);
    scrollToAnnotation(selectedAnnot);

    store.selectTab(tabs.tabForAnnotation(selectedAnnot));
  });

  // Re-fetch annotations when focused group, logged-in user or connected frames
  // change.
  $scope.$watch(
    () => [
      store.focusedGroupId(),
      store.profile().userid,
      ...store.searchUris(),
    ],
    ([currentGroupId], [prevGroupId]) => {
      if (!currentGroupId) {
        // When switching accounts, groups are cleared and so the focused group id
        // will be null for a brief period of time.
        store.clearSelectedAnnotations();
        return;
      }

      if (!prevGroupId || currentGroupId !== prevGroupId) {
        store.clearSelectedAnnotations();
      }

      const searchUris = store.searchUris();
      annotations.load(searchUris, currentGroupId);
    },
    true
  );

  this.showFocusedHeader = () => {
    return store.getState().focusedMode;
  };

  this.showSelectedTabs = function() {
    if (
      this.selectedAnnotationUnavailable() ||
      this.selectedGroupUnavailable() ||
      store.getState().filterQuery
    ) {
      return false;
    } else if (store.getState().focusedMode) {
      return false;
    } else {
      return true;
    }
  };

  this.setCollapsed = function(id, collapsed) {
    store.setCollapsed(id, collapsed);
  };

  this.focus = focusAnnotation;
  this.scrollTo = scrollToAnnotation;

  this.selectedGroupUnavailable = function() {
    return store.getState().directLinkedGroupFetchFailed;
  };

  this.selectedAnnotationUnavailable = function() {
    const selectedID = store.getFirstSelectedAnnotationId();
    return (
      !this.isLoading() && !!selectedID && !store.annotationExists(selectedID)
    );
  };

  this.shouldShowLoggedOutMessage = function() {
    // If user is not logged out, don't show CTA.
    if (self.auth.status !== 'logged-out') {
      return false;
    }

    // If user has not landed on a direct linked annotation
    // don't show the CTA.
    if (!store.getState().directLinkedAnnotationId) {
      return false;
    }

    // The CTA text and links are only applicable when using Hypothesis
    // accounts.
    if (isThirdPartyService(settings)) {
      return false;
    }

    // The user is logged out and has landed on a direct linked
    // annotation. If there is an annotation selection and that
    // selection is available to the user, show the CTA.
    const selectedID = store.getFirstSelectedAnnotationId();
    return (
      !store.isFetchingAnnotations() &&
      !!selectedID &&
      store.annotationExists(selectedID)
    );
  };
}

module.exports = {
  controller: SidebarContentController,
  controllerAs: 'vm',
  bindings: {
    auth: '<',
    onLogin: '&',
  },
  template: require('../templates/sidebar-content.html'),
};
