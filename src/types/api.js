/**
 * Type definitions for objects returned from the Hypothesis API.
 *
 * The canonical reference is the API documentation at
 * https://h.readthedocs.io/en/latest/api-reference/
 */

/**
 * TODO - Fill out remaining properties
 *
 * @typedef Annotation
 * @prop {string} [id]
 * @prop {string[]} [references]
 * @prop {string} created
 * @prop {string} group
 * @prop {string} updated
 * @prop {string[]} tags
 * @prop {string} text
 * @prop {string} uri
 * @prop {string} user
 */

/**
 * TODO - Fill out remaining properties
 *
 * @typedef Profile
 * @prop {string} userid
 * @prop {Object} preferences
 * @prop {boolean} preferences.show_sidebar_tutorial
 */

/**
 * TODO - Fill out remaining properties
 *
 * @typedef Organization
 * @prop {string} name
 * @prop {string} logo
 */

/**
 * @typedef GroupScopes
 * @prop {boolean} enforced
 * @prop {string[]} uri_patterns;
 */

/**
 * TODO - Fill out remaining properties
 *
 * @typedef Group
 * @prop {string} id
 * @prop {'private'|'open'} type
 * @prop {Organization} organization - nb. This field is nullable in the API, but
 *   we assign a default organization on the client.
 * @prop {GroupScopes|null} scopes
 *
 * // Properties not present on API objects, but added by utilities in the client.
 * @prop {string} logo
 * @prop {boolean} isMember
 * @prop {boolean} isScopedToUri
 * @prop {boolean} canLeave
 */

// Make TypeScript treat this file as a module.
export const unused = {};
