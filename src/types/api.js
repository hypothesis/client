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
 */

/**
 * TODO - Fill out remaining properties
 *
 * @typedef Profile
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
 * TODO - Fill out remaining properties
 *
 * @typedef Group
 * @prop {string} id
 * @prop {'private'|'open'} type
 * @prop {Organization|null} organization
 *
 * // Properties not present on API objects, but added by utilities in the client.
 * @prop {string} logo
 * @prop {boolean} isMember
 * @prop {boolean} isScopedToUri
 * @prop {boolean} canLeave
 */

// Make TypeScript treat this file as a module.
export const unused = {};
