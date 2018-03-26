/**
 * @ngdoc service
 * @name  groups
 *
 * @description Provides access to the list of groups that the user is currently
 *              a member of and the currently selected group in the UI.
 *
 *              The list of groups is initialized from the session state
 *              and can then later be updated using the add() and remove()
 *              methods.
 */
'use strict';

var STORAGE_KEY = 'hypothesis.groups.focus';

var events = require('../events');
var { awaitStateChange } = require('../util/state-util');
var serviceConfig = require('../service-config');

// @ngInject
function groups($rootScope, store, api, isSidebar, localStorage, serviceUrl, session,
                settings) {
  // The currently focused group. This is the group that's shown as selected in
  // the groups dropdown, the annotations displayed are filtered to only ones
  // that belong to this group, and any new annotations that the user creates
  // will be created in this group.
  var focusedGroupId;
  var groups = [];
  var documentUri;

  var svc = serviceConfig(settings);
  var authority = svc ? svc.authority : null;

  function getDocumentUriForGroupSearch() {
    function mainUri() {
      var uris = store.searchUris();
      if (uris.length === 0) {
        return null;
      }

      // We get the first HTTP URL here on the assumption that group scopes must
      // be domains (+paths)? and therefore we need to look up groups based on
      // HTTP URLs (so eg. we cannot use a "file:" URL or PDF fingerprint).
      return uris.find(uri => uri.startsWith('http'));
    }
    return awaitStateChange(store, mainUri);
  }

  /**
   * Fetch the list of applicable groups from the API.
   *
   * The list of applicable groups depends on the current userid and the URI of
   * the attached frames.
   */
  function load() {
    var uri = Promise.resolve(null);
    if (isSidebar) {
      uri = getDocumentUriForGroupSearch();
    }
    return uri.then(uri => {
      var params = {};
      if (authority) {
        params.authority = authority;
      }
      if (uri) {
        params.document_uri = uri;
      }
      return api.groups.list(params);
    }).then(gs => {
      $rootScope.$apply(() => {
        var focGroup = focused();
        if (focGroup) {
          var focusedGroupInFetchedList = gs.some(g => g.id === focGroup.id);
          if (!focusedGroupInFetchedList) {
            focus(gs[0].id);
          }
        }
        groups = gs;
      });
      return gs;
    });
  }

  function all() {
    return groups;
  }

  // Return the full object for the group with the given id.
  function get(id) {
    var gs = all();
    for (var i = 0, max = gs.length; i < max; i++) {
      if (gs[i].id === id) {
        return gs[i];
      }
    }
    return null;
  }

  /**
   * Leave the group with the given ID.
   * Returns a promise which resolves when the action completes.
   */
  function leave(id) {
    // The groups list will be updated in response to a session state
    // change notification from the server. We could improve the UX here
    // by optimistically updating the session state
    return api.group.member.delete({
      pubid: id,
      user: 'me',
    });
  }


  /** Return the currently focused group. If no group is explicitly focused we
   * will check localStorage to see if we have persisted a focused group from
   * a previous session. Lastly, we fall back to the first group available.
   */
  function focused() {
    if (focusedGroupId) {
      return get(focusedGroupId);
    }

    var fromStorage = get(localStorage.getItem(STORAGE_KEY));
    if (fromStorage) {
      focusedGroupId = fromStorage.id;
      return fromStorage;
    }

    return all()[0];
  }

  /** Set the group with the passed id as the currently focused group. */
  function focus(id) {
    var prevFocused = focused();
    var g = get(id);
    if (g) {
      focusedGroupId = g.id;
      localStorage.setItem(STORAGE_KEY, g.id);
      if (prevFocused.id !== g.id) {
        $rootScope.$broadcast(events.GROUP_FOCUSED, g.id);
      }
    }
  }
  
  // reset the focused group if the user leaves it
  $rootScope.$on(events.GROUPS_CHANGED, function () {
    // return for use in test
    return load();
  });

  // refetch the list of groups when user changes
  $rootScope.$on(events.USER_CHANGED, () => {
    // FIXME Makes a second api call on page load. better way?
    // return for use in test
    return load();
  });

  // refetch the list of groups when document url changes
  $rootScope.$on(events.FRAME_CONNECTED, () => {
    // FIXME Makes a third api call on page load. better way?
    // return for use in test
    return getDocumentUriForGroupSearch().then(uri => {
      if (documentUri !== uri) {
        documentUri = uri;
        load();
      }
    });
  });

  return {
    all: all,
    get: get,

    leave: leave,
    load: load,

    focused: focused,
    focus: focus,
  };
}

module.exports = groups;
