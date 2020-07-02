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
 * @prop {string} updated
 * @prop {string[]} tags
 * @prop {string} text
 * @prop {string|null} uri
 * @prop {string} user
 * @prop {boolean} hidden
 * @prop {boolean} [$highlight]
 * @prop {boolean} [$orphan]
 * @prop {boolean} [$anchorTimeout]
 *
 * @prop {Object} document
 *   @prop {string} document.title
 *
 * @prop {Object} permissions
 *   @prop {string[]} permissions.read
 *   @prop {string[]} permissions.update
 *   @prop {string[]} permissions.delete
 *
 * @prop {Object[]} target
 *   @prop {string} target.source
 *   @prop {Object[]} target.selector
 *     @prop {string} target.selector.type
 *     @prop {string} target.selector.exact
 *     @prop {number} target.selector.start
 *
 * @prop {Object} moderation
 *   @prop {number} moderation.flagCount
 *
 * @prop {Object} links
 *   @prop {string} links.incontext
 *   @prop {string} links.html
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
