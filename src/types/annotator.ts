import type { TinyEmitter } from 'tiny-emitter';

import type { Annotation, Selector, Target } from './api';
import type { PDFViewerApplication } from './pdfjs';
import type { ClientAnnotationData } from './shared';

/**
 * Object representing a region of a document that an annotation
 * has been anchored to.
 *
 * This representation of anchor ranges allows for certain document mutations
 * in between anchoring an annotation and later making use of the anchored range,
 * such as inserting highlights for other anchors. Compared to the initial
 * anchoring of serialized selectors, resolving these ranges should be a
 * cheap operation.
 */
export type AbstractRange = {
  /**
   * Resolve the abstract range to a concrete live `Range`. The implementation
   * may or may not return the same `Range` each time.
   */
  toRange(): Range;
};

/**
 * Metadata collected from a `<link>` element on a document, or equivalent
 * source of related-URL information.
 */
export type Link = {
  rel?: string;
  type?: string;
  href: string;
};

export type DocumentMetadata = {
  title: string;
  link: Link[];

  // HTML only
  dc?: Record<string, string[]>;
  eprints?: Record<string, string[]>;
  facebook?: Record<string, string[]>;
  highwire?: Record<string, string[]>;
  prism?: Record<string, string[]>;
  twitter?: Record<string, string[]>;
  favicon?: string;

  // HTML + PDF
  documentFingerprint?: string;
};

/**
 * Identifies a loadable chunk or segment of a document.
 *
 * Some document viewers do not load the whole document at once. For example
 * an EPUB reader will load one Content Document from the publication at a time.
 */
export type SegmentInfo = {
  /** Canonical Fragment Identifier for an EPUB Content Document */
  cfi?: string;
  /** Relative or absolute URL of the segment. */
  url?: string;
};

/**
 * A subset of annotation data allowing the representation of an annotation in
 * the document.
 */
export type AnnotationData = ClientAnnotationData &
  Pick<Annotation, 'target' | 'uri'> & {
    document?: DocumentMetadata;
  };

/**
 * An object representing the location in a document that an annotation is
 * associated with.
 */
export type Anchor = {
  annotation: AnnotationData;
  /** The HTML elements that create the highlight for this annotation. */
  highlights?: HTMLElement[];
  /** Region of the document that this annotation's selectors were resolved to. */
  range?: AbstractRange;
  target: Target;
};

/**
 * Top and bottom positions of the bounding box created by the union of the
 * highlight elements associated to an anchor. Top and bottom positions are
 * based on the viewport. The value zero corresponds to the top of viewport.
 * Hidden elements that are above the viewport have negative values.
 */
export type AnchorPosition = {
  /** `tag` of the associated annotation. */
  tag: string;
  /** Top coordinate in pixels. */
  top: number;
  /** Bottom coordinate in pixels. */
  bottom: number;
};

/**
 * Anchoring implementation for a particular document type (eg. PDF or HTML).
 *
 * This is responsible for converting between serialized "selectors" that can
 * be stored in the Hypothesis backend and ranges in the document.
 */
export type AnchoringImpl = {
  anchor(
    root: HTMLElement,
    selectors: Selector[],
    options: unknown
  ): Promise<Range>;
  describe(
    root: HTMLElement,
    range: Range,
    options: unknown
  ): Selector[] | Promise<Selector[]>;
};

/**
 * Interface for querying a collection of feature flags and subscribing to
 * flag updates.
 *
 * Emits a "flagsChanged" event when the flags are updated.
 */
export type FeatureFlags = TinyEmitter & {
  flagEnabled(flag: string): boolean;
};

/**
 * Subset of the `Guest` class that is exposed to integrations.
 */
export type Annotator = {
  anchors: Anchor[];
  anchor(ann: AnnotationData): Promise<Anchor[]>;
  features: FeatureFlags;
};

/**
 * Details about the current layout state of the sidebar.
 *
 * This is used in notifications about sidebar layout changes which other parts
 * of the annotator react to.
 */
export type SidebarLayout = {
  /** Whether sidebar is open or closed */
  expanded: boolean;
  /** Current width of sidebar in pixels */
  width: number;
  /** Width of controls (toolbar, bucket bar) on the edge of the sidebar */
  toolbarWidth: number;
};

/**
 * Interface for document type/viewer integrations that handle all the details
 * of supporting a specific document type (web page, PDF, ebook, etc.).
 */
export type IntegrationBase = {
  /**
   * Return whether the specified DOM range is part of the annotatable content
   * of the current document.
   */
  canAnnotate(range: Range): boolean;
  /**
   * Return whether this integration supports styling multiple clusters of highlights
   */
  canStyleClusteredHighlights?(): boolean;
  /**
   * Attempt to resolve a set of serialized selectors to the corresponding content in the current document.
   */
  anchor(root: HTMLElement, selectors: Selector[]): Promise<Range>;

  /** Generate a list of serializable selectors which represent the content in `range`. */
  describe(root: HTMLElement, range: Range): Selector[] | Promise<Selector[]>;
  /**
   * Return the main element that contains the document content. This is used
   * by controls such as the bucket bar to know when the content might have scrolled.
   */
  contentContainer(): HTMLElement;
  /**
   * Attempt to resize the content so that it is visible alongside the sidebar.
   *
   * Returns `true` if the sidebar and content are displayed side-by-side or
   * false otherwise.
   */
  fitSideBySide(layout: SidebarLayout): boolean;

  /** Return the metadata of the currently loaded document, such as title, PDF fingerprint, etc. */
  getMetadata(): Promise<DocumentMetadata>;

  /**
   * Navigate to the segment of a document associated with an annotation.
   *
   * This is used to navigate to eg. the chapter of an EPUB which corresponds
   * to an annotation in the sidebar.
   */
  navigateToSegment?(ann: AnnotationData): void;

  /**
   * Return information about which section of the document is currently loaded.
   *
   * This is used for content such as EPUBs, where typically one Content Document
   * (typically one chapter) is loaded at a time.
   */
  segmentInfo?(): Promise<SegmentInfo>;

  /**
   * Return the URL of the currently loaded document.
   *
   * This may be different than the current URL (`location.href`) in a PDF for example.
   */
  uri(): Promise<string>;

  /**
   * Scroll to an anchor.
   *
   * This will only be called if the anchor has at least one highlight (ie.
   * `anchor.highlights` is a non-empty array)
   */
  scrollToAnchor(a: Anchor): Promise<void>;
  /** Show information about the current document and content provider */
  showContentInfo?(config: ContentInfoConfig): void;
};

export type Integration = Destroyable & TinyEmitter & IntegrationBase;

/**
 * Global variables which the Hypothesis client looks for on the `window` object
 * when loaded in a frame that influence how it behaves.
 */
export type Globals = {
  /** PDF.js entry point. If set, triggers loading of PDF rather than HTML integration. */
  PDFViewerApplication?: PDFViewerApplication;
};

export type HypothesisWindow = Window & Globals;

/**
 * Destroyable classes implement the `destroy` method to properly remove all
 * event handlers and other resources.
 */
export type Destroyable = {
  destroy(): void;
};

/**
 * Content provider logo details.
 */
export type ContentInfoLogo = {
  logo: string;
  title: string;
  link: string;
};

/**
 * Metadata for the current document, for display in the content info banner.
 */
export type ContentInfoItem = {
  /** Title of the current article, chapter etc. */
  title: string;
  subtitle?: string;
};

/**
 * Links related to the current document, for display in the content info banner.
 */
export type ContentInfoLinks = {
  /** Previous item in the book, journal etc. */
  previousItem?: string;
  /** Next item in the book, journal etc. */
  nextItem?: string;
  /** This item in the content provider's context */
  currentItem: string;
};

/**
 * Configuration for content information banner.
 *
 * In some contexts we have a contractual obligation to show information
 * about where the current document is from (content provider, journal issue
 * or book in which it appeared) and related links.
 */
export type ContentInfoConfig = {
  /** Logo of the content provider */
  logo: ContentInfoLogo;
  /** Metadata about the current content item */
  item: ContentInfoItem;
  /** Metadata about the container (eg. journal or book) that the current item is part of */
  container: ContentInfoItem;
  links: ContentInfoLinks;
};
