/**
 * Type definitions for objects passed between the annotator and sidebar.
 */

/**
 * Object representing a region of a document that an annotation
 * has been anchored to.
 *
 * This representation of anchor ranges allows for certain document mutations
 * in between anchoring an annotation and later making use of the anchored range,
 * such as inserting highlights for other anchors. Compared to the initial
 * anchoring of serialized selectors, resolving these ranges should be a
 * cheap operation.
 *
 * @typedef AbstractRange
 * @prop {() => Range} toRange -
 *   Resolve the abstract range to a concrete live `Range`. The implementation
 *   may or may not return the same `Range` each time.
 */

/**
 * @typedef {import("./api").Selector} Selector
 * @typedef {import("./api").Target} Target
 */

/**
 * An object representing an annotation in the document.
 *
 * @typedef AnnotationData
 * @prop {string} uri
 * @prop {Target[]} target
 * @prop {string} $tag
 * @prop {boolean} [$highlight] -
 *   Flag indicating that this annotation was created using the "Highlight" button,
 *   as opposed to "Annotate".
 * @prop {boolean} [$orphan] -
 *   Flag indicating that this annotation was not found in the document.
 *   It is initially `undefined` while anchoring is in progress and then set to
 *   `true` if anchoring failed or `false` if it succeeded.
 * @prop {DocumentMetadata} [document]
 */

/**
 * An object representing the location in a document that an annotation is
 * associated with.
 *
 * @typedef Anchor
 * @prop {AnnotationData} annotation
 * @prop {HTMLElement[]} [highlights] -
 *   The HTML elements that create the highlight for this annotation.
 * @prop {AbstractRange} [range] -
 *   Region of the document that this annotation's selectors were resolved to.
 * @prop {Target} target
 */

/**
 * Top and bottom positions of the bounding box created by the union of the
 * highlight elements associated to an anchor. Top and bottom positions are
 * based on the viewport. The value zero corresponds to the top of viewport.
 * Hidden elements that are above the viewport have negative values.
 *
 * @typedef AnchorPosition
 * @prop {string} tag - annotation tag
 * @prop {number} top - in pixel
 * @prop {number} bottom - in pixel
 */

/**
 * Anchoring implementation for a particular document type (eg. PDF or HTML).
 *
 * This is responsible for converting between serialized "selectors" that can
 * be stored in the Hypothesis backend and ranges in the document.
 *
 * @typedef AnchoringImpl
 * @prop {(root: HTMLElement, selectors: Selector[], options: unknown) => Promise<Range>} anchor
 * @prop {(root: HTMLElement, range: Range, options: unknown) => Selector[]|Promise<Selector[]>} describe
 */

/**
 * Subset of the `Guest` class that is exposed to integrations.
 *
 * @typedef Annotator
 * @prop {Anchor[]} anchors
 * @prop {(ann: AnnotationData) => Promise<Anchor[]>} anchor
 */

/**
 * Details about the current layout state of the sidebar.
 *
 * This is used in notifications about sidebar layout changes which other parts
 * of the annotator react to.
 *
 * @typedef SidebarLayout
 * @prop {boolean} expanded - Whether sidebar is open or closed
 * @prop {number} width - Current width of sidebar in pixels
 * @prop {number} toolbarWidth - Width of controls (toolbar, bucket bar) on the
 *   edge of the sidebar.
 */

/**
 * Interface for document type/viewer integrations that handle all the details
 * of supporting a specific document type (web page, PDF, ebook, etc.).
 *
 * @typedef IntegrationBase
 * @prop {(range: Range) => boolean} canAnnotate -
 *   Return whether the specified DOM range is part of the annotatable content
 *   of the current document.
 * @prop {(root: HTMLElement, selectors: Selector[]) => Promise<Range>} anchor -
 *   Attempt to resolve a set of serialized selectors to the corresponding content in the
 *   current document.
 * @prop {(root: HTMLElement, range: Range) => Selector[]|Promise<Selector[]>} describe -
 *   Generate a list of serializable selectors which represent the content in
 *   `range`.
 * @prop {() => HTMLElement} contentContainer -
 *   Return the main element that contains the document content. This is used
 *   by controls such as the bucket bar to know when the content might have scrolled.
 * @prop {() => void} destroy -
 *   Clean up the integration and remove any event listeners, caches, etc.
 * @prop {(layout: SidebarLayout) => boolean} fitSideBySide -
 *   Attempt to resize the content so that it is visible alongside the sidebar.
 *   Returns `true` if the sidebar and content are displayed side-by-side or
 *   false otherwise.
 * @prop {() => Promise<DocumentMetadata>} getMetadata - Return the metadata of
 *   the currently loaded document, such as title, PDF fingerprint, etc.
 * @prop {() => Promise<string>} uri - Return the URL of the currently loaded document.
 *   This may be different than the current URL (`location.href`) in a PDF for example.
 * @prop {(a: Anchor) => Promise<void>} scrollToAnchor - Scroll to an anchor.
 *   This will only be called if the anchor has at least one highlight (ie.
 *   `anchor.highlights` is a non-empty array)
 *
 * @typedef {Destroyable & IntegrationBase} Integration
 */

/**
 * @typedef DocumentMetadata
 * @prop {string} title
 * @prop {object[]} link
 *   @prop {string} [link.rel]
 *   @prop {string} [link.type]
 *   @prop {string} link.href
 *
 * // HTML only.
 * @prop {Record<string, string[]>} [dc]
 * @prop {Record<string, string[]>} [eprints]
 * @prop {Record<string, string[]>} [facebook]
 * @prop {Record<string, string[]>} [highwire]
 * @prop {Record<string, string[]>} [prism]
 * @prop {Record<string, string[]>} [twitter]
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
 * @prop {import('./pdfjs').PDFViewerApplication} [PDFViewerApplication] -
 *   PDF.js entry point. If set, triggers loading of PDF rather than HTML integration.
 */

/**
 * @typedef {Window & Globals} HypothesisWindow
 */

/**
 * Destroyable classes implement the `destroy` method to properly remove all
 * event handlers and other resources.
 *
 * @typedef Destroyable
 * @prop {VoidFunction} destroy
 */

/**
 * Specifies a content partner/provider to show branding for.
 *
 * @typedef {'jstor'} ContentPartner
 */

// Make TypeScript treat this file as a module.
export const unused = {};
