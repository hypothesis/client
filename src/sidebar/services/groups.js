import serviceConfig from '../service-config';
import { isReply } from '../helpers/annotation-metadata';
import { combineGroups } from '../helpers/groups';
import { awaitStateChange } from '../store/util';
import { watch } from '../util/watch';

/** @typedef {import('../../types/api').Group} Group */

const DEFAULT_ORG_ID = '__default__';

/**
 * FIXME: There is almost assuredly a better way to handle a fallback, default logo
 */
const DEFAULT_ORGANIZATION = {
  id: DEFAULT_ORG_ID,
  name: '__DEFAULT__',
  logo:
    'data:image/svg+xml;utf8,' +
    // @ts-ignore - TS doesn't know about .svg files.
    encodeURIComponent(require('../../images/icons/logo.svg')),
};

// @inject
export default function groups(
  store,
  api,
  serviceUrl,
  session,
  settings,
  toastMessenger,
  auth
) {
  const svc = serviceConfig(settings);
  const authority = svc ? svc.authority : null;

  // `expand` parameter for various groups API calls.
  const expandParam = ['organization', 'scopes'];

  /**
   * Return the main document URI that is used to fetch groups associated with
   * the site that the user is on.
   */
  function mainUri() {
    const mainFrame = store.mainFrame();
    if (!mainFrame) {
      return null;
    }
    return mainFrame.uri;
  }

  function getDocumentUriForGroupSearch() {
    return awaitStateChange(store, mainUri);
  }

  /**
   * Update the focused group. Update the store, then check to see if
   * there are any new (unsaved) annotations—if so, update those annotations
   * such that they are associated with the newly-focused group.
   */
  function focus(groupId) {
    const prevGroupId = store.focusedGroupId();

    store.focusGroup(groupId);

    const newGroupId = store.focusedGroupId();

    const groupHasChanged = prevGroupId !== newGroupId && prevGroupId !== null;
    if (groupHasChanged) {
      // Move any top-level new annotations to the newly-focused group.
      // Leave replies where they are.
      const updatedAnnotations = [];
      store.newAnnotations().forEach(annot => {
        if (!isReply(annot)) {
          updatedAnnotations.push(
            Object.assign({}, annot, { group: newGroupId })
          );
        }
      });

      if (updatedAnnotations.length) {
        store.addAnnotations(updatedAnnotations);
      }

      // Persist this group as the last focused group default
      store.setDefault('focusedGroup', newGroupId);
    }
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
   * @return {Promise<Group[]>}
   */
  async function filterGroups(
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
        directLinkedGroup.scopes &&
        directLinkedGroup.scopes.enforced
      ) {
        groups = groups.filter(g => g.id !== directLinkedGroupId);
        store.setDirectLinkedGroupFetchFailed();
        directLinkedGroupId = null;
      }
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

  /*
   * Fetch a specific group.
   *
   * @param {string} id
   * @return {Promise<Group>}
   */
  async function fetchGroup(id) {
    return api.group.read({ id, expand: expandParam });
  }

  let reloadSetUp = false;

  /**
   * Set up automatic re-fetching of groups in response to various events
   * in the sidebar.
   */
  function setupAutoReload() {
    if (reloadSetUp) {
      return;
    }
    reloadSetUp = true;

    // Reload groups when main document URI changes.
    watch(store.subscribe, mainUri, () => {
      load();
    });

    // Reload groups when user ID changes. This is a bit inefficient since it
    // means we are not fetching the groups and profile concurrently after
    // logging in or logging out.
    watch(
      store.subscribe,
      [() => store.hasFetchedProfile(), () => store.profile().userid],
      (_, [prevFetchedProfile]) => {
        if (!prevFetchedProfile) {
          // Ignore the first time that the profile is loaded.
          return;
        }
        load();
      }
    );
  }

  /**
   * Fetch the groups associated with the current user and document, as well
   * as any groups that have been direct-linked to.
   *
   * @return {Promise<Group[]>}
   */
  async function loadGroupsForUserAndDocument() {
    // Step 1: Get the URI of the active document, so we can fetch groups
    // associated with that document.
    let documentUri;
    if (store.route() === 'sidebar') {
      documentUri = await getDocumentUriForGroupSearch();
    }

    setupAutoReload();

    // Step 2: Concurrently fetch the groups the user is a member of,
    // the groups associated with the current document and the annotation
    // and/or group that was direct-linked (if any).

    // If there is a direct-linked annotation, fetch the annotation in case
    // the associated group has not already been fetched and we need to make
    // an additional request for it.
    const directLinkedAnnId = store.directLinkedAnnotationId();
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
    const directLinkedGroupId = store.directLinkedGroupId();
    let directLinkedGroupApi = null;
    if (directLinkedGroupId) {
      directLinkedGroupApi = fetchGroup(directLinkedGroupId)
        .then(group => {
          store.clearDirectLinkedGroupFetchFailed();
          return group;
        })
        .catch(() => {
          // If the group does not exist or the user doesn't have permission.
          store.setDirectLinkedGroupFetchFailed();
          return null;
        });
    }

    const listParams = {
      expand: expandParam,
    };
    if (authority) {
      listParams.authority = authority;
    }
    if (documentUri) {
      listParams.document_uri = documentUri;
    }

    const [
      myGroups,
      featuredGroups,
      token,
      directLinkedAnn,
      directLinkedGroup,
    ] = await Promise.all([
      api.profile.groups.read({ expand: expandParam }),
      api.groups.list(listParams),
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
        try {
          const directLinkedAnnGroup = await fetchGroup(directLinkedAnn.group);
          featuredGroups.push(directLinkedAnnGroup);
        } catch (e) {
          toastMessenger.error('Unable to fetch group for linked annotation');
        }
      }
    }

    // Step 4. Combine all the groups into a single list and set additional
    // metadata on them that will be used elsewhere in the app.
    const isLoggedIn = token !== null;
    const groups = await filterGroups(
      combineGroups(myGroups, featuredGroups, documentUri, settings),
      isLoggedIn,
      directLinkedAnnotationGroupId,
      directLinkedGroupId
    );

    const groupToFocus =
      directLinkedAnnotationGroupId || directLinkedGroupId || null;
    addGroupsToStore(groups, groupToFocus);

    return groups;
  }

  /**
   * Load the specific groups configured by the annotation service.
   *
   * @param {string[]} groupIds - `id` or `groupid`s of groups to fetch
   */
  async function loadServiceSpecifiedGroups(groupIds) {
    // Fetch the groups that the user is a member of in one request and then
    // fetch any other groups not returned in that request directly.
    //
    // This reduces the number of requests to the backend on the assumption
    // that most or all of the group IDs that the service configures the client
    // to show are groups that the user is a member of.
    const userGroups = await api.profile.groups.read({ expand: expandParam });

    let error;
    const tryFetchGroup = async id => {
      try {
        return await fetchGroup(id);
      } catch (e) {
        error = e;
        return null;
      }
    };

    const getGroup = id =>
      userGroups.find(g => g.id === id || g.groupid === id) ||
      tryFetchGroup(id);

    const groups = (await Promise.all(groupIds.map(getGroup))).filter(
      g => g !== null
    );

    addGroupsToStore(groups);

    if (error) {
      // @ts-ignore - TS can't track the type of `error` here.
      toastMessenger.error(`Unable to fetch groups: ${error.message}`, {
        autoDismiss: false,
      });
    }

    return groups;
  }

  /**
   * Add groups to the store and set the initial focused group.
   *
   * @param {Group[]} groups
   * @param {string|null} [groupToFocus]
   */
  function addGroupsToStore(groups, groupToFocus) {
    // Add a default organization to groups that don't have one. The organization
    // provides the logo to display when the group is selected and is also used
    // to order groups.
    injectOrganizations(groups);

    const isFirstLoad = store.allGroups().length === 0;
    const prevFocusedGroup = store.getDefault('focusedGroup');

    store.loadGroups(groups);

    if (isFirstLoad) {
      if (groups.some(g => g.id === groupToFocus)) {
        focus(groupToFocus);
      } else if (groups.some(g => g.id === prevFocusedGroup)) {
        focus(prevFocusedGroup);
      }
    }
  }

  /**
   * Fetch groups from the API, load them into the store and set the focused
   * group.
   *
   * There are two main scenarios:
   *
   * 1. The groups loaded depend on the current user, current document URI and
   *    active direct links. This is the default.
   *
   *    On startup, `load()` must be called to trigger the initial groups fetch.
   *    Subsequently groups are automatically reloaded if the logged-in user or
   *    main document URI changes.
   *
   * 2. The annotation service specifies exactly which groups to load via the
   *    configuration it passes to the client.
   *
   * @return {Promise<Group[]>}
   */
  async function load() {
    let groups;
    if (svc && svc.groups) {
      let groupIds = [];
      try {
        groupIds = await svc.groups;
      } catch (e) {
        toastMessenger.error(
          `Unable to fetch group configuration: ${e.message}`
        );
      }
      groups = await loadServiceSpecifiedGroups(groupIds);
    } else {
      groups = await loadGroupsForUserAndDocument();
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

  return {
    all: all,
    get: get,

    leave: leave,
    load: load,

    focus: focus,
  };
}
