/**
 * Type definitions for objects passed between the annotator and sidebar.
 */

/** @typedef {import("./api").Target} Target */

/**
 * @typedef AnnotationData
 * @prop {string} uri
 * @prop {Target[]} target
 * @prop {string} $tag
 * @prop {boolean} [$highlight]
 * @prop {DocumentMetadata} document
 */

/**
 * @typedef DocumentMetadata
 * @prop {string} title
 * @prop {Object[]} link
 *   @prop {string} link.rel
 *   @prop {string} link.type
 *   @prop {string} link.href
 * // html pages
 * @prop {Object.<string, string[]>} [dc]
 * @prop {Object.<string, string[]>} [eprints]
 * @prop {Object.<string, string[]>} [facebook]
 * @prop {Object.<string, string[]>} [highwire]
 * @prop {Object.<string, string[]>} [prism]
 * @prop {Object.<string, string[]>} [twitter]
 * // pdf files
 * @prop {string} [documentFingerprint]
 */

// Make TypeScript treat this file as a module.
export const unused = {};
