'use strict';

const SearchClient = require('../search-client');
const events = require('../events');
const isThirdPartyService = require('../util/is-third-party-service');
const memoize = require('../util/memoize');
const tabs = require('../tabs');
const uiConstants = require('../ui-constants');

function firstKey(object) {
  for (const k in object) {
    if (!object.hasOwnProperty(k)) {
      continue;
    }
    return k;
  }
  return null;
}

/**
 * Returns the group ID of the first annotation in `results` whose
 * ID is a key in `selection`.
 */
function groupIDFromSelection(selection, results) {
  const id = firstKey(selection);
  const annot = results.find(function(annot) {
    return annot.id === id;
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
        let groupID = groupIDFromSelection(
          store.getState().selectedAnnotationMap,
          results
        );
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
      if (!store.getState().defaultGroupIsFocussed && !results.length) {
          const first = groups.all()[0];
          groups.focus(first.id);
      }
      store.setDefaultGroupAsFocussed();
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

  function isLoading() {
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
  }

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

  window.addEventListener('message', (event) => {
      if (event.data.action === 'test-player:updated') {
          loadAnnotations();
      }
  });

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
    () => [groups.focused().id, store.profile().userid, ...store.searchUris()],
    ([currentGroupId], [prevGroupId]) => {
      // FIXME - There is a bug here where the set of displayed annotations can
      // end up not matching the focused group when the user logs out.
      //
      // When a user logs in or out, we re-fetch profile and group information
      // concurrently. If the profile fetch completes first, it will trigger
      // an annotation fetch. If the group fetch then completes before the
      // annotation fetch, and the focused group changes due to the previous
      // focused group not being in the new set of groups, then the `if` below
      // will skip refetching annotations a second time. This will result in the
      // wrong set of displayed annotations.
      //
      // This should only affect users logging out because the set of groups for
      // logged-in users is currently a superset of those for logged-out users on
      // any given page.

      if (currentGroupId !== prevGroupId) {
        // The focused group may be changed during loading annotations as a result
        // of switching to the group containing a direct-linked annotation.
        //
        // In that case, we don't want to trigger reloading annotations again.
        if (isLoading()) {
          return;
        }
        store.clearSelectedAnnotations();
      }

      loadAnnotations();
    },
    true
  );

  this.setCollapsed = function(id, collapsed) {
    store.setCollapsed(id, collapsed);
  };

  this.forceVisible = function(thread) {
    store.setForceVisible(thread.id, true);
    if (thread.parent) {
      store.setCollapsed(thread.parent.id, false);
    }
  };

  this.focus = focusAnnotation;
  this.scrollTo = scrollToAnnotation;

  this.selectedAnnotationCount = function() {
    const selection = store.getState().selectedAnnotationMap;
    if (!selection) {
      return 0;
    }
    return Object.keys(selection).length;
  };

  this.selectedAnnotationUnavailable = function() {
    const selectedID = firstKey(store.getState().selectedAnnotationMap);
    return !isLoading() && !!selectedID && !store.annotationExists(selectedID);
  };

  this.shouldShowLoggedOutMessage = function() {
    // If user is not logged out, don't show CTA.
    if (self.auth.status !== 'logged-out') {
      return false;
    }

    // If user has not landed on a direct linked annotation
    // don't show the CTA.
    if (!settings.annotations) {
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
    const selectedID = firstKey(store.getState().selectedAnnotationMap);
    return !isLoading() && !!selectedID && store.annotationExists(selectedID);
  };

  this.isLoading = isLoading;

  const visibleCount = memoize(function(thread) {
    return thread.children.reduce(
      function(count, child) {
        return count + visibleCount(child);
      },
      thread.visible ? 1 : 0
    );
  });

  this.visibleCount = function() {
    return visibleCount(thread());
  };

  this.topLevelThreadCount = function() {
    return thread().totalChildren;
  };

  this.clearSelection = function() {
    let selectedTab = store.getState().selectedTab;
    if (
      !store.getState().selectedTab ||
      store.getState().selectedTab === uiConstants.TAB_ORPHANS
    ) {
      selectedTab = uiConstants.TAB_ANNOTATIONS;
    }

    store.clearSelectedAnnotations();
    store.selectTab(selectedTab);
  };
}

module.exports = {
  controller: SidebarContentController,
  controllerAs: 'vm',
  bindings: {
    auth: '<',
    search: '<',
    onLogin: '&',
  },
  template: require('../templates/sidebar-content.html'),
};
