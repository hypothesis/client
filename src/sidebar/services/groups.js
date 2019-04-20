'use strict';

const STORAGE_KEY = 'hypothesis.groups.focus';
const DEFAULT_ORG_ID = '__default__';

/**
 * FIXME: There is almost assuredly a better way to handle a fallback, default logo
 */
const DEFAULT_ORGANIZATION = {
  id: DEFAULT_ORG_ID,
  logo:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(require('../../images/icons/logo.svg')),
};

const events = require('../events');
const { awaitStateChange } = require('../util/state-util');
const { combineGroups } = require('../util/groups');
const memoize = require('../util/memoize');
const serviceConfig = require('../service-config');

// @ngInject
function groups(
  $rootScope,
  store,
  api,
  isSidebar,
  localStorage,
  serviceUrl,
  session,
  settings,
  auth,
  features
) {
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
   * @param {string|null} directLinkedGroupId
   * @return {Promise<Group[]>}
   */
  function filterGroups(
    groups,
    isLoggedIn,
    directLinkedAnnotationId,
    directLinkedGroupId
  ) {
    // Filter the directLinkedGroup out if it is out of scope and scope is enforced.
    if (directLinkedGroupId) {
      const directLinkedGroup = groups.find(g => g.id === directLinkedGroupId);
      if (
        directLinkedGroup &&
        !directLinkedGroup.isScopedToUri &&
        directLinkedGroup.scopes.enforced
      ) {
        groups = groups.filter(g => g.id !== directLinkedGroupId);
        directLinkedGroupId = undefined;
      }
    }

    // If service groups are specified only return those.
    // If a service group doesn't exist in the list of groups don't return it.
    if (svc && svc.groups) {
      const focusedGroups = groups.filter(
        g => svc.groups.includes(g.id) || svc.groups.includes(g.groupid)
      );
      return Promise.resolve(focusedGroups);
    }

    // Logged-in users always see the "Public" group.
    if (isLoggedIn) {
      return Promise.resolve(groups);
    }

    // If the main document URL has no groups associated with it, always show
    // the "Public" group.
    const pageHasAssociatedGroups = groups.some(
      g => g.id !== '__world__' && g.isScopedToUri
    );
    if (!pageHasAssociatedGroups) {
      return Promise.resolve(groups);
    }

    // Hide the "Public" group, unless the user specifically visited a direct-
    // link to an annotation in that group.
    const nonWorldGroups = groups.filter(g => g.id !== '__world__');

    if (!directLinkedAnnotationId && !directLinkedGroupId) {
      return Promise.resolve(nonWorldGroups);
    }

    // If directLinkedGroup is the "Public" group, always return groups.
    if (directLinkedGroupId === '__world__') {
      return groups;
    }

    // If the directLinkedAnnotationId's group is the "Public" group return groups,
    // otherwise filter out the "Public" group.

    // Force getAnnotation to enter the catch clause if there is no linked annotation.
    const getAnnotation = directLinkedAnnotationId
      ? api.annotation.get({ id: directLinkedAnnotationId })
      : Promise.reject();

    return getAnnotation
      .then(ann => {
        return ann.group === '__world__' ? groups : nonWorldGroups;
      })
      .catch(() => {
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
    const directLinkedGroup = settings.group;
    return uri
      .then(uri => {
        const params = {
          expand: ['organization', 'scopes'],
        };
        if (authority) {
          params.authority = authority;
        }
        if (uri) {
          params.document_uri = uri;
        }
        documentUri = uri;

        const profileGroupsApi = api.profile.groups.read({
          expand: params.expand,
        });
        const listGroupsApi = api.groups.list(params);
        let groupApiRequests = [
          profileGroupsApi,
          listGroupsApi,
          auth.tokenGetter(),
        ];

        // If there is a directLinkedGroup, add an api request to get that
        // particular group as well since it may not be in the results returned
        // by group.list or profile.groups.
        if (directLinkedGroup) {
          const selectedGroupApi = api.group
            .read({
              id: directLinkedGroup,
              expand: params.expand,
            })
            .catch(() => {
              // If the group does not exist or the user doesn't have permission,
              // return undefined.
              return undefined;
            });
          groupApiRequests = groupApiRequests.concat(selectedGroupApi);
        }
        return Promise.all(groupApiRequests).then(
          ([myGroups, featuredGroups, token, selectedGroup]) => [
            combineGroups(
              myGroups,
              selectedGroup !== undefined
                ? featuredGroups.concat([selectedGroup])
                : featuredGroups,
              documentUri
            ),
            token,
          ]
        );
      })
      .then(([groups, token]) => {
        const isLoggedIn = token !== null;
        const directLinkedAnnotation = settings.annotations;
        return filterGroups(
          groups,
          isLoggedIn,
          directLinkedAnnotation,
          directLinkedGroup
        );
      })
      .then(groups => {
        injectOrganizations(groups);

        const isFirstLoad = store.allGroups().length === 0;
        const prevFocusedGroup = localStorage.getItem(STORAGE_KEY);

        store.loadGroups(groups);
        if (isFirstLoad && groups.some(g => g.id === directLinkedGroup)) {
          store.focusGroup(directLinkedGroup);
        } else if (isFirstLoad && groups.some(g => g.id === prevFocusedGroup)) {
          store.focusGroup(prevFocusedGroup);
        }

        return groups;
      });
  }

  const sortGroups = memoize(groups => {
    // Sort in the following order: scoped, public, private.
    // This is for maintaining the order of the old groups menu so when
    // the old groups menu is removed this can be removed.
    const worldGroups = groups.filter(g => g.id === '__world__');
    const nonWorldScopedGroups = groups.filter(
      g => g.id !== '__world__' && ['open', 'restricted'].includes(g.type)
    );
    const remainingGroups = groups.filter(
      g => !worldGroups.includes(g) && !nonWorldScopedGroups.includes(g)
    );
    return nonWorldScopedGroups.concat(worldGroups).concat(remainingGroups);
  });

  function all() {
    if (features.flagEnabled('community_groups')) {
      return store.allGroups();
    }
    return sortGroups(store.getInScopeGroups());
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
