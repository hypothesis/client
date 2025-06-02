export type Permissions = {
  /** List of principals that can read the annotation */
  read: string[];
  /** List of principals that can edit the annotation */
  update: string[];
  /** List of principals that can delete the annotation */
  delete: string[];
};

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
 * Return true if an annotation with the given permissions is shared with any
 * group.
 */
export function isShared(perms: Permissions): boolean {
  return perms.read.some(principal => principal.startsWith('group:'));
}

/**
 * Return true if an annotation with the given permissions is private.
 */
export function isPrivate(perms: Permissions): boolean {
  return !isShared(perms);
}
