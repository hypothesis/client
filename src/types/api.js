/**
 * Type definitions for objects returned from the Hypothesis API.
 *
 * The canonical reference is the API documentation at
 * https://h.readthedocs.io/en/latest/api-reference/
 */

/**
 * @typedef TextQuoteSelector
 * @prop {'TextQuoteSelector'} type
 * @prop {string} exact
 * @prop {string} [prefix]
 * @prop {string} [suffix]
 */

/**
 * @typedef TextPositionSelector
 * @prop {'TextPositionSelector'} type
 * @prop {number} start
 * @prop {number} end
 */

/**
 * @typedef RangeSelector
 * @prop {'RangeSelector'} type
 * @prop {string} startContainer
 * @prop {string} endContainer
 * @prop {number} startOffset
 * @prop {number} endOffset
 */

/**
 * @typedef {TextQuoteSelector | TextPositionSelector | RangeSelector} Selector
 */

/**
 * @typedef Target
 * @prop {string} source
 * @prop {Selector[]} [selector]
 * 
 
/**
 * TODO - Fill out remaining properties
 *
 * @typedef Annotation
 * @prop {string} [id]
 * @prop {string} [$tag] - A locally-generated unique identifier for annotations
 *       that have not been saved to the service yet (and thus do not have an id)
 * @prop {string[]} [references]
 * @prop {string} created
 * @prop {boolean} [flagged]
 * @prop {string} group
 * @prop {string} updated
 * @prop {string[]} tags
 * @prop {string} text
 * @prop {string} uri
 * @prop {string} user
 * @prop {boolean} hidden
 *
 * @prop {Object} document
 *   @prop {string} document.title
 *
 * @prop {Object} permissions
 *   @prop {string[]} permissions.read
 *   @prop {string[]} permissions.update
 *   @prop {string[]} permissions.delete
 *
 * @prop {Target[]} target
 *
 * @prop {Object} [moderation]
 *   @prop {number} moderation.flagCount
 *
 * @prop {Object} links
 *   @prop {string} [links.incontext]
 *   @prop {string} [links.html]
 *
 * // Properties not present on API objects, but added by utilities in the client.
 * @prop {boolean} [$highlight]
 * @prop {boolean} [$orphan]
 * @prop {boolean} [$anchorTimeout]
 */

/**
 * TODO - Fill out remaining properties
 *
 * @typedef Profile
 * @prop {string|null} userid
 * @prop {Object} preferences
 * @prop {boolean} [preferences.show_sidebar_tutorial]
 * @prop {Object.<string, boolean>} features
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
 * @prop {string} name
 * @prop {boolean} canLeave
 */

// Make TypeScript treat this file as a module.
export const unused = {};
