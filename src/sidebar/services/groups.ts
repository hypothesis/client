// shallowEqual and watch are no longer needed due to removal of _setupAutoReload
// import shallowEqual from 'shallowequal';

// @ts-ignore - TS doesn't know about SVG files.
import { default as logo } from '../../images/icons/logo.svg';
import type { Group /*, GroupMember, GroupMembers */ } from '../../types/api'; // GroupMember, GroupMembers no longer needed
import type { SidebarSettings } from '../../types/config';
// Service type and serviceConfig are likely no longer needed if groups are static
// import type { Service } from '../../types/config';
// import { serviceConfig } from '../config/service-config';
import { isReply } from '../helpers/annotation-metadata';
// combineGroups, PUBLIC_GROUP_ID, awaitStateChange are no longer needed
// import { combineGroups, PUBLIC_GROUP_ID } from '../helpers/groups';
import type { SidebarStore } from '../store';
// import { awaitStateChange } from '../store/util';
// import { watch } from '../util/watch';
// APIService, AuthService, ToastMessengerService are no longer needed
// import type { APIService } from './api';
// import type { AuthService } from './auth';
// import type { ToastMessengerService } from './toast-messenger';

const DEFAULT_ORG_ID = '__default__';

const DEFAULT_ORGANIZATION = {
  id: DEFAULT_ORG_ID,
  name: '__DEFAULT__',
  logo: 'data:image/svg+xml;utf8,' + encodeURIComponent(logo),
};

// MEMBERS_PAGE_SIZE is no longer used
// export const MEMBERS_PAGE_SIZE = 100;

/**
 * For any group that does not have an associated organization, populate with
 * the default Hypothesis organization.
 *
 * Mutates group objects in place
 */
function injectOrganizations(groups: Group[]) {
  groups.forEach(group => {
    if (!group.organization || typeof group.organization !== 'object') {
      group.organization = DEFAULT_ORGANIZATION;
    }
  });
}

// isPromise and expandParam are no longer needed
// function isPromise(value: any): value is Promise<unknown> {
//   return typeof value?.then === 'function';
// }
// const expandParam = ['organization', 'scopes'];


/**
 * Service for managing groups for the "Default_User".
 *
 * In this simplified version, the service loads a predefined list of groups
 * and does not interact with an API for group data or memberships.
 *
 * @inject
 */
export class GroupsService {
  private _store: SidebarStore;
  // APIService, AuthService, ToastMessengerService, Service (for _serviceConfig) are removed.
  // private _api: APIService;
  // private _auth: AuthService;
  // private _settings: SidebarSettings; // Keep if needed for other settings, otherwise remove
  // private _toastMessenger: ToastMessengerService;
  // private _serviceConfig: Service | null;
  // private _reloadSetUp: boolean; // _setupAutoReload is removed

  // _focusedMembersController is removed
  // private _focusedMembersController: AbortController | null = null;

  constructor(
    store: SidebarStore,
    // api: APIService, // Removed
    // auth: AuthService, // Removed
    _settings: SidebarSettings, // Keep if settings are used for other purposes, mark as unused if not
    // toastMessenger: ToastMessengerService, // Removed
  ) {
    this._store = store;
    // this._api = api;
    // this._auth = auth;
    // this._settings = settings;
    // this._toastMessenger = toastMessenger;

    // this._serviceConfig = serviceConfig(settings); // Removed, serviceConfig not used for groups
    // this._reloadSetUp = false; // Removed
  }

  // _mainURI method removed
  // _filterGroups method removed
  // _setupAutoReload method removed

  /**
   * Add groups to the store and set the initial focused group.
   */
  private _addGroupsToStore(groups: Group[], groupToFocus: string | null) {
    injectOrganizations(groups); // Keep this if DEFAULT_ORGANIZATION is used

    const isFirstLoad = this._store.allGroups().length === 0;
    // prevFocusedGroup might be relevant if we allow users to change focus and persist it locally
    const prevFocusedGroup = this._store.getDefault('focusedGroup');

    this._store.loadGroups(groups);

    if (isFirstLoad) {
      if (groupToFocus && groups.some(g => g.id === groupToFocus)) {
        this.focus(groupToFocus);
      } else if (
        prevFocusedGroup &&
        groups.some(g => g.id === prevFocusedGroup)
      ) {
        this.focus(prevFocusedGroup);
      } else if (groups.length > 0) {
        // Fallback to focusing the first group in the predefined list
        this.focus(groups[0].id);
      }
    }
  }

  // _fetchGroup method removed
  // _loadGroupsForUserAndDocument method removed
  // _loadServiceSpecifiedGroups method removed

  /**
   * Loads a predefined list of groups into the store.
   */
  async load(): Promise<Group[]> {
    const PREDEFINED_GROUPS: Group[] = [
      {
        id: 'world',
        name: 'Public',
        type: 'open', // Typically 'open' for the public/world group
        organization: DEFAULT_ORGANIZATION, // Use the defined object
        links: { html: '#' }, // Placeholder link
        scopes: { enforced: false, uri_patterns: [] },
        isMember: true, // Default_User is a member of all its predefined groups
        isScopedToUri: false, // Assuming general groups not tied to specific URIs
        public: true, // Public group is... public
        groupid: 'world@default.local', // Example groupid
      },
      {
        id: 'user_group_1',
        name: 'My Notes',
        type: 'private',
        organization: DEFAULT_ORGANIZATION,
        links: { html: '#' },
        scopes: { enforced: false, uri_patterns: [] },
        isMember: true,
        isScopedToUri: false,
        public: false,
        groupid: 'my_notes@default.local',
      },
      {
        id: 'user_group_2',
        name: 'Work Projects',
        type: 'private',
        organization: DEFAULT_ORGANIZATION,
        links: { html: '#' },
        scopes: { enforced: false, uri_patterns: [] },
        isMember: true,
        isScopedToUri: false,
        public: false,
        groupid: 'work_projects@default.local',
      },
    ];

    // The first group in the list will be focused by default if no other is set.
    this._addGroupsToStore(PREDEFINED_GROUPS, PREDEFINED_GROUPS[0]?.id || null);
    return Promise.resolve(PREDEFINED_GROUPS);
  }

  /**
   * Update the focused group. Update the store, then check to see if
   * there are any new (unsaved) annotations—if so, update those annotations
   * such that they are associated with the newly-focused group.
   */
  focus(groupId: string) {
    const prevGroupId = this._store.focusedGroupId();

    this._store.focusGroup(groupId);

    const newGroupId = this._store.focusedGroupId();

    const groupHasChanged = prevGroupId !== newGroupId && prevGroupId !== null;
    if (groupHasChanged && newGroupId) {
      // _focusedMembersController is removed, so no abort call needed.

      // Move any top-level new annotations to the newly-focused group.
      // Leave replies where they are.
      const updatedAnnotations = this._store
        .newAnnotations()
        .filter(ann => !isReply(ann))
        .map(ann => ({ ...ann, group: newGroupId }));

      if (updatedAnnotations.length) {
        this._store.addAnnotations(updatedAnnotations);
      }

      // Persist this group as the last focused group default
      this._store.setDefault('focusedGroup', newGroupId);
    }
  }

  // leave method removed
  // loadFocusedGroupMembers method removed
  // _fetchAllMembers method removed
  // _fetchMembers method removed
}
