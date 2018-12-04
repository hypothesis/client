'use strict';

const STORAGE_KEY = 'hypothesis.groups.focus';
const DEFAULT_ORG_ID = '__default__';

/**
 * FIXME: There is almost assuredly a better way to handle a fallback, default logo
 */
const DEFAULT_ORGANIZATION = {
  id: DEFAULT_ORG_ID,
  logo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" class="svg-icon masthead-logo" height="28" viewBox="0 0 24 28" width="24"><path d="M3.886 3.945H21.03v16.047H3.886z" fill="#fff" /><path d="M0 2.005C0 .898.897 0 2.005 0h19.99C23.102 0 24 .897 24 2.005v19.99A2.005 2.005 0 0 1 21.995 24H2.005A2.005 2.005 0 0 1 0 21.995V2.005zM9 24l3 4 3-4H9zM7.008 4H4v16h3.008v-4.997C7.008 12.005 8.168 12.01 9 12c1 .007 2.019.06 2.019 2.003V20h3.008v-6.891C14.027 10 12 9.003 10 9.003c-1.99 0-2 0-2.992 1.999V4zM19 19.987c1.105 0 2-.893 2-1.994A1.997 1.997 0 0 0 19 16c-1.105 0-2 .892-2 1.993s.895 1.994 2 1.994z" fill="currentColor" fill-rule="evenodd" /></svg>',
};

const events = require('../events');
const { awaitStateChange } = require('../util/state-util');
const serviceConfig = require('../service-config');

// @ngInject
function groups($rootScope, store, api, isSidebar, localStorage, serviceUrl, session,
                settings) {
  const svc = serviceConfig(settings);
  const authority = svc ? svc.authority : null;

  function getDocumentUriForGroupSearch() {
    function mainUri() {
      const uris = store.searchUris();
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
   * Filter the returned list of groups from the API.
   *
   * `filterGroups` performs client-side filtering to hide the "Public" group
   * for logged-out users under certain conditions.
   *
   * @param {Group[]} groups
   * @param {boolean} isLoggedIn
   * @param {string|null} directLinkedAnnotationId
   * @return {Promise<Group[]>}
   */
  function filterGroups(groups, isLoggedIn, directLinkedAnnotationId) {
    // If service groups are specified only return those.
    // If a service group doesn't exist in the list of groups don't return it.
    if (svc && svc.groups) {
      const focusedGroups = groups.filter(g =>
        svc.groups.includes(g.id) || svc.groups.includes(g.groupid)
      );
      return Promise.resolve(focusedGroups);
    }

    // Logged-in users always see the "Public" group.
    if (isLoggedIn) {
      return Promise.resolve(groups);
    }

    // If the main document URL has no groups associated with it, always show
    // the "Public" group.
    const pageHasAssociatedGroups = groups.some(g => g.id !== '__world__');
    if (!pageHasAssociatedGroups) {
      return Promise.resolve(groups);
    }

    // Hide the "Public" group, unless the user specifically visited a direct-
    // link to an annotation in that group.
    const nonWorldGroups = groups.filter(g => g.id !== '__world__');

    if (!directLinkedAnnotationId) {
      return Promise.resolve(nonWorldGroups);
    }

    return api.annotation.get({ id: directLinkedAnnotationId }).then(ann => {
      if (ann.group === '__world__') {
        return groups;
      } else {
        return nonWorldGroups;
      }
    }).catch(() => {
      // Annotation does not exist or we do not have permission to read it.
      // Assume it is not in "Public".
      return nonWorldGroups;
    });
  }

  /**
   * For any group that does not have an associated organization, populate with
   * the default Hypothesis organization.
   *
   * Mutates group objects in place
   *
   * @param {Group[]} groups
   */
  function injectOrganizations(groups) {
    groups.forEach(group => {
      if (!group.organization || typeof group.organization !== 'object') {
        group.organization = DEFAULT_ORGANIZATION;
      }
    });
  }

  // The document URI passed to the most recent `GET /api/groups` call in order
  // to include groups associated with this page. This is retained to determine
  // whether we need to re-fetch groups if the URLs of frames connected to the
  // sidebar app changes.
  let documentUri;


  /**
   * Fetch the list of applicable groups from the API.
   *
   * The list of applicable groups depends on the current userid and the URI of
   * the attached frames.
   *
   * @return {Promise<Group[]>}
   */
  function load() {
    let uri = Promise.resolve(null);
    if (isSidebar) {
      uri = getDocumentUriForGroupSearch();
    }
    return uri.then(uri => {
      const params = {
        expand: 'organization',
      };
      if (authority) {
        params.authority = authority;
      }
      if (uri) {
        params.document_uri = uri;
      }
      documentUri = uri;

      // Fetch groups from the API.
      return api.groups.list(params, null, { includeMetadata: true });
    }).then(({ data, token }) => {
      const isLoggedIn = token !== null;
      const directLinkedAnnotation = settings.annotations;
      return filterGroups(data, isLoggedIn, directLinkedAnnotation);
    }).then(groups => {
      injectOrganizations(groups);

      const isFirstLoad = store.allGroups().length === 0;
      const prevFocusedGroup = localStorage.getItem(STORAGE_KEY);

      store.loadGroups(groups);
      if (isFirstLoad && groups.some(g => g.id === prevFocusedGroup)) {
        store.focusGroup(prevFocusedGroup);
      }

      return groups;
    });
  }

  function all() {
    return store.allGroups();
  }

  // Return the full object for the group with the given id.
  function get(id) {
    return store.getGroup(id);
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
      userid: 'me',
    });
  }


  /** Return the currently focused group. If no group is explicitly focused we
   * will check localStorage to see if we have persisted a focused group from
   * a previous session. Lastly, we fall back to the first group available.
   */
  function focused() {
    return store.focusedGroup();
  }

  /** Set the group with the passed id as the currently focused group. */
  function focus(id) {
    store.focusGroup(id);
  }

  // Persist the focused group to storage when it changes.
  let prevFocusedId = store.focusedGroupId();
  store.subscribe(() => {
    const focusedId = store.focusedGroupId();
    if (focusedId !== prevFocusedId) {
      prevFocusedId = focusedId;

      localStorage.setItem(STORAGE_KEY, focusedId);

      // Emit the `GROUP_FOCUSED` event for code that still relies on it.
      $rootScope.$broadcast(events.GROUP_FOCUSED, focusedId);
    }
  });

  // refetch the list of groups when user changes
  $rootScope.$on(events.USER_CHANGED, () => {
    // FIXME Makes a second api call on page load. better way?
    // return for use in test
    return load();
  });

  // refetch the list of groups when document url changes
  $rootScope.$on(events.FRAME_CONNECTED, () => {
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
