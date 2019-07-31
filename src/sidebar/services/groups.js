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
  auth
) {
  const svc = serviceConfig(settings);
  const authority = svc ? svc.authority : null;

  function getDocumentUriForGroupSearch() {
    function mainUri() {
      const mainFrame = store.mainFrame();
      if (!mainFrame) {
        return null;
      }
      return mainFrame.uri;
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
   * @param {string|null} directLinkedAnnotationGroupId
   * @param {string|null} directLinkedGroupId
   * @return {Group[]}
   */
  function filterGroups(
    groups,
    isLoggedIn,
    directLinkedAnnotationGroupId,
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
        store.setDirectLinkedGroupFetchFailed();
        directLinkedGroupId = null;
      }
    }

    // If service groups are specified only return those.
    // If a service group doesn't exist in the list of groups don't return it.
    if (svc && svc.groups) {
      const focusedGroups = groups.filter(
        g => svc.groups.includes(g.id) || svc.groups.includes(g.groupid)
      );
      return focusedGroups;
    }

    // Logged-in users always see the "Public" group.
    if (isLoggedIn) {
      return groups;
    }

    // If the main document URL has no groups associated with it, always show
    // the "Public" group.
    const pageHasAssociatedGroups = groups.some(
      g => g.id !== '__world__' && g.isScopedToUri
    );
    if (!pageHasAssociatedGroups) {
      return groups;
    }

    // If directLinkedGroup or directLinkedAnnotationGroupId is the "Public" group,
    // always return groups.
    if (
      directLinkedGroupId === '__world__' ||
      directLinkedAnnotationGroupId === '__world__'
    ) {
      return groups;
    }

    // Return non-world groups.
    return groups.filter(g => g.id !== '__world__');
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
  let documentUri = null;

  /*
   * Fetch an individual group.
   *
   * @param {Object} requestParams
   * @return {Promise<Group>|undefined}
   */
  function fetchGroup(requestParams) {
    return api.group.read(requestParams).catch(() => {
      // If the group does not exist or the user doesn't have permission.
      return null;
    });
  }

  /**
   * Fetch groups from the API, load them into the store and set the focused
   * group.
   *
   * The groups that are fetched depend on the current user, the URI of
   * the current document, and the direct-linked group and/or annotation.
   *
   * @return {Promise<Group[]>}
   */
  async function load() {
    // Step 1: Get the URI of the active document, so we can fetch groups
    // associated with that document.
    if (isSidebar) {
      documentUri = await getDocumentUriForGroupSearch();
    }

    // Step 2: Concurrently fetch the groups the user is a member of,
    // the groups associated with the current document and the annotation
    // and/or group that was direct-linked (if any).
    const params = {
      expand: ['organization', 'scopes'],
    };
    if (authority) {
      params.authority = authority;
    }
    if (documentUri) {
      params.document_uri = documentUri;
    }

    // If there is a direct-linked annotation, fetch the annotation in case
    // the associated group has not already been fetched and we need to make
    // an additional request for it.
    const directLinkedAnnId = store.getState().directLinkedAnnotationId;
    let directLinkedAnnApi = null;
    if (directLinkedAnnId) {
      directLinkedAnnApi = api.annotation
        .get({ id: directLinkedAnnId })
        .catch(() => {
          // If the annotation does not exist or the user doesn't have permission.
          return null;
        });
    }

    // If there is a direct-linked group, add an API request to get that
    // particular group since it may not be in the set of groups that are
    // fetched by other requests.
    const directLinkedGroupId = store.getState().directLinkedGroupId;
    let directLinkedGroupApi = null;
    if (directLinkedGroupId) {
      directLinkedGroupApi = fetchGroup({
        id: directLinkedGroupId,
        expand: params.expand,
      }).then(group => {
        // If the group does not exist or the user doesn't have permission.
        if (group === null) {
          store.setDirectLinkedGroupFetchFailed();
        } else {
          store.clearDirectLinkedGroupFetchFailed();
        }
        return group;
      });
    }

    const [
      myGroups,
      featuredGroups,
      token,
      directLinkedAnn,
      directLinkedGroup,
    ] = await Promise.all([
      api.profile.groups.read({ expand: params.expand }),
      api.groups.list(params),
      auth.tokenGetter(),
      directLinkedAnnApi,
      directLinkedGroupApi,
    ]);

    // Step 3. Add the direct-linked group to the list of featured groups,
    // and if there was a direct-linked annotation, fetch its group if we
    // don't already have it.

    // If there is a direct-linked group, add it to the featured groups list.
    if (
      directLinkedGroup &&
      !featuredGroups.some(g => g.id === directLinkedGroup.id)
    ) {
      featuredGroups.push(directLinkedGroup);
    }

    // If there's a direct-linked annotation it may require an extra API call
    // to fetch its group.
    let directLinkedAnnotationGroupId = null;
    if (directLinkedAnn) {
      // Set the directLinkedAnnotationGroupId to be used later in
      // the filterGroups method.
      directLinkedAnnotationGroupId = directLinkedAnn.group;

      // If the direct-linked annotation's group has not already been fetched,
      // fetch it.
      const directLinkedAnnGroup = myGroups
        .concat(featuredGroups)
        .find(g => g.id === directLinkedAnn.group);

      if (!directLinkedAnnGroup) {
        const directLinkedAnnGroup = await fetchGroup({
          id: directLinkedAnn.group,
          expand: params.expand,
        });
        if (directLinkedAnnGroup) {
          featuredGroups.push(directLinkedAnnGroup);
        }
      }
    }

    // Step 4. Combine all the groups into a single list and set additional
    // metadata on them that will be used elsewhere in the app.
    const isLoggedIn = token !== null;
    const groups = filterGroups(
      combineGroups(myGroups, featuredGroups, documentUri),
      isLoggedIn,
      directLinkedAnnotationGroupId,
      directLinkedGroupId
    );

    injectOrganizations(groups);

    // Step 5. Load the groups into the store and focus the appropriate
    // group.
    const isFirstLoad = store.allGroups().length === 0;
    const prevFocusedGroup = localStorage.getItem(STORAGE_KEY);

    store.loadGroups(groups);

    if (isFirstLoad) {
      if (groups.some(g => g.id === directLinkedAnnotationGroupId)) {
        store.focusGroup(directLinkedAnnotationGroupId);
      } else if (groups.some(g => g.id === directLinkedGroupId)) {
        store.focusGroup(directLinkedGroupId);
      } else if (groups.some(g => g.id === prevFocusedGroup)) {
        store.focusGroup(prevFocusedGroup);
      }
    }

    return groups;
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
    // The focused group may be null when the user login state changes.
    if (focusedId !== null && focusedId !== prevFocusedId) {
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
