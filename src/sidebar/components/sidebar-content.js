'use strict';

const SearchClient = require('../search-client');
const events = require('../events');
const isThirdPartyService = require('../util/is-third-party-service');
const tabs = require('../tabs');

/**
 * Returns the group ID of the first annotation in `results` whose
 * ID is `annId`.
 */
function getGroupID(annId, results) {
  const annot = results.find(function(annot) {
    return annot.id === annId;
  });
  if (!annot) {
    return null;
  }
  return annot.group;
}

// @ngInject
function SidebarContentController(
  $scope,
  analytics,
  store,
  annotationMapper,
  api,
  drafts,
  features,
  frameSync,
  groups,
  rootThread,
  settings,
  streamer,
  streamFilter
) {
  const self = this;

  function thread() {
    return rootThread.thread(store.getState());
  }

  const unsubscribeAnnotationUI = store.subscribe(function() {
    const state = store.getState();

    self.rootThread = thread();
    self.selectedTab = state.selectedTab;

    const counts = tabs.counts(state.annotations);

    Object.assign(self, {
      totalNotes: counts.notes,
      totalAnnotations: counts.annotations,
      totalOrphans: counts.orphans,
      waitingToAnchorAnnotations: counts.anchoring > 0,
    });
  });

  $scope.$on('$destroy', unsubscribeAnnotationUI);

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

  const searchClients = [];

  function _resetAnnotations() {
    annotationMapper.unloadAnnotations(store.savedAnnotations());
  }

  function _loadAnnotationsFor(uris, group) {
    const searchClient = new SearchClient(api.search, {
      // If no group is specified, we are fetching annotations from
      // all groups in order to find out which group contains the selected
      // annotation, therefore we need to load all chunks before processing
      // the results
      incremental: !!group,
    });
    searchClients.push(searchClient);
    searchClient.on('results', function(results) {
      if (store.hasSelectedAnnotations()) {
        // Focus the group containing the selected annotation and filter
        // annotations to those from this group
        let groupID = getGroupID(store.getFirstSelectedAnnotationId(), results);
        if (!groupID) {
          // If the selected annotation is not available, fall back to
          // loading annotations for the currently focused group
          groupID = groups.focused().id;
        }
        results = results.filter(function(result) {
          return result.group === groupID;
        });
        groups.focus(groupID);
      }

      if (results.length) {
        annotationMapper.loadAnnotations(results);
      }
    });
    searchClient.on('end', function() {
      // Remove client from list of active search clients.
      //
      // $evalAsync is required here because search results are emitted
      // asynchronously. A better solution would be that the loading state is
      // tracked as part of the app state.
      $scope.$evalAsync(function() {
        searchClients.splice(searchClients.indexOf(searchClient), 1);
      });

      store.frames().forEach(function(frame) {
        if (0 <= uris.indexOf(frame.uri)) {
          store.updateFrameAnnotationFetchStatus(frame.uri, true);
        }
      });
    });
    searchClient.get({ uri: uris, group: group });
  }

  this.isLoading = function() {
    if (
      !store.frames().some(function(frame) {
        return frame.uri;
      })
    ) {
      // The document's URL isn't known so the document must still be loading.
      return true;
    }

    if (searchClients.length > 0) {
      // We're still waiting for annotation search results from the API.
      return true;
    }

    return false;
  };

  /**
   * Load annotations for all URLs associated with `frames`.
   */
  function loadAnnotations() {
    _resetAnnotations();

    searchClients.forEach(function(client) {
      client.cancel();
    });

    // If there is no selection, load annotations only for the focused group.
    //
    // If there is a selection, we load annotations for all groups, find out
    // which group the first selected annotation is in and then filter the
    // results on the client by that group.
    //
    // In the common case where the total number of annotations on
    // a page that are visible to the user is not greater than
    // the batch size, this saves an extra roundtrip to the server
    // to fetch the selected annotation in order to determine which group
    // it is in before fetching the remaining annotations.
    const group = store.hasSelectedAnnotations() ? null : groups.focused().id;

    const searchUris = store.searchUris();
    if (searchUris.length > 0) {
      _loadAnnotationsFor(searchUris, group);

      streamFilter.resetFilter().addClause('/uri', 'one_of', searchUris);
      streamer.setConfig('filter', { filter: streamFilter.getFilter() });
    }
  }

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
    () => [groups.focused(), store.profile().userid, ...store.searchUris()],
    ([currentGroup], [prevGroup]) => {
      if (!currentGroup) {
        // When switching accounts, groups are cleared and so the focused group
        // will be null for a brief period of time.
        store.clearSelectedAnnotations();
        return;
      }

      if (!prevGroup || currentGroup.id !== prevGroup.id) {
        // The focused group may be changed during loading annotations as a result
        // of switching to the group containing a direct-linked annotation.
        //
        // In that case, we don't want to trigger reloading annotations again.
        if (this.isLoading()) {
          return;
        }
        store.clearSelectedAnnotations();
      }

      loadAnnotations();
    },
    true
  );

  this.showSelectedTabs = function() {
    if (
      this.selectedAnnotationUnavailable() ||
      this.selectedGroupUnavailable() ||
      store.getState().filterQuery
    ) {
      return false;
    }
    return true;
  };

  this.setCollapsed = function(id, collapsed) {
    store.setCollapsed(id, collapsed);
  };

  this.focus = focusAnnotation;
  this.scrollTo = scrollToAnnotation;

  this.selectedGroupUnavailable = function() {
    return !this.isLoading() && store.getState().directLinkedGroupFetchFailed;
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
      !this.isLoading() && !!selectedID && store.annotationExists(selectedID)
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
