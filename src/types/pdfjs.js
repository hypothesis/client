/**
 * This module defines the subset of the PDF.js interface that the client relies
 * on.
 *
 * PDF.js doesn't provide its own types. There are partial definitions available
 * from DefinitelyTyped but these don't include everything we use. The source of
 * truth is the pdf.js repo (https://github.com/mozilla/pdf.js/) on GitHub.
 * See in particular `src/display/api.js` in that repo.
 *
 * Note that the definitions here are not complete, they only include properties
 * that the client uses. The names of types should match the corresponding
 * JSDoc types or classes in the PDF.js source where possible.
 */

/**
 * Document metadata parsed from the PDF's _metadata stream_.
 *
 * See `Metadata` class from `display/metadata.js` in PDF.js.
 *
 * @typedef Metadata
 * @prop {(name: string) => string} get
 * @prop {(name: string) => boolean} has
 */

/**
 * Document metadata parsed from the PDF's _document info dictionary_.
 *
 * See `PDFDocument#documentInfo` in PDF.js.
 *
 * @typedef PDFDocumentInfo
 * @prop {string} [Title]
 */

/**
 * An object containing metadata about the PDF. This includes information from:
 *
 * - The PDF's document info dictionary
 * - The PDF's metadata stream
 * - The HTTP headers (eg. `Content-Disposition`) sent when the PDF file was
 *   served
 *
 * See the "Metadata" section (14.3) in the PDF 1.7 reference for details of
 * the _metadata stream_ and _document info dictionary_.
 *
 * @typedef PDFDocumentMetadata
 * @prop {Metadata|null} metadata
 * @prop {PDFDocumentInfo} [info]
 * @prop {string|null} contentDispositionFilename - The `filename` directive from
 *   the `Content-Disposition` header
 */

/**
 * @typedef PDFDocument
 * @prop {string} fingerprint
 * @prop {() => Promise<PDFDocumentMetadata>} getMetadata
 */

/**
 * @typedef GetTextContentParameters
 * @prop {boolean} normalizeWhitespace
 */

/**
 * @typedef TextContentItem
 * @prop {string} str
 */

/**
 * @typedef TextContent
 * @prop {TextContentItem[]} items
 */

/**
 * @typedef PDFPageProxy
 * @prop {(o?: GetTextContentParameters) => Promise<TextContent>} getTextContent
 */

/**
 * @typedef PDFPageView
 * @prop {HTMLElement} div - Container element for the PDF page
 * @prop {PDFPageProxy} pdfPage
 * @prop {TextLayer|null} textLayer
 * @prop {number} renderingState - See `RenderingStates` enum in src/annotator/anchoring/pdf.js
 */

/**
 * @typedef PDFViewer
 *
 * Defined in `web/pdf_viewer.js` in the PDF.js source.
 *
 * @prop {number} pagesCount
 * @prop {EventBus} eventBus -
 *   Reference to the global event bus. Added in PDF.js v1.6.210.
 * @prop {(page: number) => PDFPageView|null} getPageView
 */

/**
 * Defined in `web/ui_utils.js` in the PDF.js source.
 *
 * @typedef EventBus
 * @prop {(event: string, listener: Function) => void} on
 * @prop {(event: string, listener: Function) => void} off
 */

/**
 * The `PDFViewerApplication` global which is the entry-point for accessing PDF.js.
 *
 * Defined in `web/app.js` in the PDF.js source.
 *
 * @typedef PDFViewerApplication
 * @prop {EventBus} [eventBus] -
 *   Global event bus. Since v1.6.210. This is not available until the PDF viewer
 *   has been initialized. See `initialized` and `initializedPromise` properties.
 * @prop {PDFDocument} pdfDocument
 * @prop {PDFViewer} pdfViewer
 * @prop {boolean} downloadComplete
 * @prop {PDFDocumentInfo} documentInfo
 * @prop {Metadata} metadata
 * @prop {boolean} initialized - Indicates that the PDF viewer is initialized.
 * @prop {Promise<void>} [initializedPromise] -
 *   Promise that resolves when PDF.js is initialized. Since v2.4.456.
 *   See https://github.com/mozilla/pdf.js/wiki/Third-party-viewer-usage#initialization-promise.
 * @prop {string} url - The URL of the loaded PDF file
 */

/**
 * @typedef TextLayer
 * @prop {boolean} renderingDone
 * @prop {HTMLElement} textLayerDiv
 */

export {};
