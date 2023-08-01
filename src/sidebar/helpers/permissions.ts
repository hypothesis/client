/**
 * Utils for working with permissions principals on annotations.
 *
 * This is the same as the `permissions` field retrieved on an annotation via
 * the API.
 *
 * Principals are strings of the form `type:id` where `type` is `'acct'` (for a
 * specific user) or `'group'` (for a group).
 */

export type Permissions = {
  /** List of principals that can read the annotation */
  read: string[];
  /** List of principals that can edit the annotation */
  update: string[];
  /** List of principals that can delete the annotation */
  delete: string[];
};

function defaultLevel(savedLevel: string | null): string {
  switch (savedLevel) {
    case 'private':
    case 'shared':
      return savedLevel;
    default:
      return 'shared';
  }
}

/**
 * Return the permissions for a private annotation.
 *
 * A private annotation is one which is readable only by its author.
 *
 * @param userid - User ID of the author
 */
export function privatePermissions(userid: string): Permissions {
  return {
    read: [userid],
    update: [userid],
    delete: [userid],
  };
}

/**
 * Return the permissions for an annotation that is shared with the given
 * group.
 *
 * @param userid - User ID of the author
 * @param groupid - ID of the group the annotation is being shared with
 */
export function sharedPermissions(
  userid: string,
  groupid: string,
): Permissions {
  return Object.assign(privatePermissions(userid), {
    read: ['group:' + groupid],
  });
}

/**
 * Return the default permissions for an annotation in a given group.
 *
 * @param userid - User ID of the author
 * @param groupid - ID of the group the annotation is being shared with
 */
export function defaultPermissions(
  userid: string,
  groupid: string,
  savedLevel: string | null,
): Permissions {
  if (defaultLevel(savedLevel) === 'private' && userid) {
    return privatePermissions(userid);
  } else {
    return sharedPermissions(userid, groupid);
  }
}

/**
 * Return true if an annotation with the given permissions is shared with any
 * group.
 */
export function isShared(perms: Permissions): boolean {
  return perms.read.some(principal => {
    return principal.indexOf('group:') === 0;
  });
}

/**
 * Return true if an annotation with the given permissions is private.
 */
export function isPrivate(perms: Permissions): boolean {
  return !isShared(perms);
}

/**
 * Return true if a user can perform the given `action` on an annotation.
 */
export function permits(
  perms: Permissions,
  action: 'update' | 'delete',
  userid: string | null,
): boolean {
  return perms[action].indexOf(userid || '') !== -1;
}
