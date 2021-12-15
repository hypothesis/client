/**
 * Type definitions for methods available to embedding frames that contain
 * a host frame. This is specifically used by the LMS integration application.
 */

/** @typedef {import('./api').GroupIdentifier} GroupIdentifier */

/**
 * Data about a user to focus on in the sidebar. The intent is that the
 * sidebar will filter annotations such that only those authored by this
 * user are shown. If `groups` are provided, the sidebar will filter the set
 * of shown groups to that set.
 *
 * @typedef FocusUserInfo
 * @prop {string} [userid]
 * @prop {string} [username]
 * @prop {string} [displayName] - User's display name
 * @prop {GroupIdentifier[]} [groups] - A list of group identifiers that
 *   correspond to a set of groups specific to this focused user. This is
 *   assumed to be a subset of the groups currently loaded in the store. These
 *   identifiers, which can be either `id`s or `groupid`s, should be normalized
 *   to `id`s before use with the store.
 */

// Make TypeScript treat this file as a module.
export const unused = {};
