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
 */
export type Metadata = {
  get(name: string): string;
  has(name: string): boolean;
};

/**
 * Document metadata parsed from the PDF's _document info dictionary_.
 *
 * See `PDFDocument#documentInfo` in PDF.js.
 */
export type PDFDocumentInfo = {
  Title?: string;
};

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
 */
export type PDFDocumentMetadata = {
  metadata: Metadata | null;
  info?: PDFDocumentInfo;
  /**
   * The `filename` directive from the `Content-Disposition` header
   */
  contentDispositionFilename: string | null;
};

export type PDFDocument = {
  /**
   * PDF fingerprint in PDF.js before v2.10.377.
   * May exist in later versions depending on the PDF.js build.
   */
  fingerprint?: string;
  /**
   * PDF fingerprints in PDF.js after v2.10.377.  See
   * https://github.com/mozilla/pdf.js/pull/13661. The first entry of this
   * array is the "original" fingerprint and the same as the `fingerprint`
   * property in older versions.  The second entry is the "modified"
   * fingerprint. See "File Identifiers" section in the PDF spec.
   */
  fingerprints?: [string, string | null];
  getMetadata(): Promise<PDFDocumentMetadata>;
};

export type GetTextContentParameters = {
  /**
   * Whether to convert all whitespace to an ASCII space char.
   * Obsolete since https://github.com/mozilla/pdf.js/pull/14527.
   */
  normalizeWhitespace: boolean;
};

export type TextContentItem = {
  str: string;
};

export type TextContent = {
  items: TextContentItem[];
};

export type PDFPageProxy = {
  getTextContent(o?: GetTextContentParameters): Promise<TextContent>;
};

export type PDFPageView = {
  /** Container element for the PDF page. */
  div: HTMLElement;
  pdfPage: PDFPageProxy;
  textLayer: TextLayer | null;
  /** See `RenderingStates` enum in src/annotator/anchoring/pdf.js */
  renderingState: number;
};

/**
 * Defined in `web/pdf_viewer.js` in the PDF.js source.
 */
export type PDFViewer = {
  /**
   * Zoom level/mode. This can be a string representation of a float or a special constant
   * ("auto", "page-fit", "page-width" and more)
   */
  currentScaleValue: string;
  pagesCount: number;
  /**
   * Reference to the global event bus. Added in PDF.js v1.6.210.
   */
  eventBus: EventBus;
  getPageView(page: number): PDFPageView | null;
  /** DOM element containing the main content of the document. */
  viewer: HTMLElement;
  /** Re-render the current view. */
  update(): void;
};

/**
 * Defined in `web/ui_utils.js` in the PDF.js source.
 */
export type EventBus = {
  on(event: string, listener: () => void): void;
  off(event: string, listener: () => void): void;
};

/**
 * Object containing references to various DOM elements that make up the PDF.js
 * viewer UI, as well as a few other global objects used by the viewer.
 */
export type AppConfig = {
  appContainer: HTMLElement;
};

/**
 * The `PDFViewerApplication` global which is the entry-point for accessing PDF.js.
 *
 * Defined in `web/app.js` in the PDF.js source.
 */
export type PDFViewerApplication = {
  /**
   * Viewer DOM elements. Since v1.5.188.
   */
  appConfig?: AppConfig;
  /**
   * Global event bus. Since v1.6.210. This is not available until the PDF viewer
   * has been initialized. See `initialized` and `initializedPromise` properties.
   */
  eventBus?: EventBus;
  pdfDocument: PDFDocument;
  pdfViewer: PDFViewer;
  downloadComplete: boolean;
  documentInfo: PDFDocumentInfo;
  metadata: Metadata;
  /**
   * Indicates that the PDF viewer is initialized.
   */
  initialized: boolean;
  /**
   * Promise that resolves when PDF.js is initialized. Since v2.4.456.
   * See https://github.com/mozilla/pdf.js/wiki/Third-party-viewer-usage#initialization-promise.
   */
  initializedPromise?: Promise<void>;
  /** The URL of the loaded PDF file. */
  url: string;
};

export type TextLayer = {
  renderingDone: boolean;
  /**
   * New name for root element of text layer in PDF.js >= v3.2.146
   */
  div?: HTMLElement;
  /** Old name for root element of text layer. */
  textLayerDiv?: HTMLElement;
};
