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
 *   @prop {string} [link.rel]
 *   @prop {string} [link.type]
 *   @prop {string} link.href
 *
 * // HTML only.
 * @prop {Object.<string, string[]>} [dc]
 * @prop {Object.<string, string[]>} [eprints]
 * @prop {Object.<string, string[]>} [facebook]
 * @prop {Object.<string, string[]>} [highwire]
 * @prop {Object.<string, string[]>} [prism]
 * @prop {Object.<string, string[]>} [twitter]
 * @prop {string} [favicon]
 *
 * // HTML + PDF.
 * @prop {string} [documentFingerprint]
 */

/**
 * Global variables which the Hypothesis client looks for on the `window` object
 * when loaded in a frame that influence how it behaves.
 *
 * @typedef Globals
 * @prop {Object} [PDFViewerApplication] -
 *   PDF.js entry point. If set, triggers loading of PDF rather than HTML integration.
 * @prop {boolean} [__hypothesis_frame] -
 *   Flag used to indicate that the "annotator" part of Hypothesis is loaded in
 *   the current frame.
 */

/**
 * @typedef {Window & Globals} HypothesisWindow
 */

// Make TypeScript treat this file as a module.
export const unused = {};
