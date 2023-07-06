import type { TinyEmitter } from 'tiny-emitter';

import type { Annotation, Selector, Target } from './api';
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
  /** Current height of sidebar in pixels */
  height: number;
  /** Width of controls (toolbar, bucket bar) on the edge of the sidebar */
  toolbarWidth: number;
};

/**
 * Interface for document type/viewer integrations that handle all the details
 * of supporting a specific document type (web page, PDF, ebook, etc.).
 */
export type IntegrationBase = {
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

  /**
   * Return true if side-by-side mode is currently active.
   *
   * In most cases this will only change when `fitSideBySide` is called, but in
   * some integrations this may change at other times. For example this can
   * happen if the content layout changed and there is more or less room than
   * before.
   */
  sideBySideActive(): boolean;

  /**
   * Return a DOM Range representing the extent of annotatable content within
   * `range`, or `null` if `range` does not contain any annotatable content.
   * For example, `range` might be trimmed of leading or trailing whitespace.
   * `range` may be returned unmodified if already valid.
   */
  getAnnotatableRange(range: Range): Range | null;

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

  /**
   * Whether the Guest should wait for feature flags to be received from the
   * sidebar before sending initial document info to the sidebar.
   */
  waitForFeatureFlags?(): boolean;

  /**
   * Whether the Guest should set the {@link DocumentInfo.persistent} flag when
   * reporting document information to the sidebar.
   */
  persistFrame?(): boolean;
};

export type Integration = Destroyable & TinyEmitter & IntegrationBase;

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

/**
 * Details about the document that is loaded in a guest frame.
 */
export type DocumentInfo = {
  /**
   * The main URI of the document. This is the primary URI that is associated with
   * annotations created on the document.
   */
  uri: string;

  /** Additional URIs and other metadata about the document. */
  metadata: DocumentMetadata;

  /**
   * Information about which segment (page, chapter etc.) of a multi-segment
   * document is loaded in a guest frame.
   *
   * This is used in EPUBs for example.
   */
  segmentInfo?: SegmentInfo;

  /**
   * A hint that the frame is likely to be replaced by another guest frame
   * showing a different segment of the same document in future.
   *
   * This flag is used to facilitate more seamless transitions between
   * book chapters.
   */
  persistent: boolean;
};

/**
 * `auto`: The client will decide if side-by-side is enabled. If enabled, it
 *         will apply some heuristics to determine how the content is affected.
 *         This is default value.
 * `manual`: The host app wants to manually take full control of side-by-side,
 *           effectively disabling the logic in client.
 */
export type SideBySideMode = 'auto' | 'manual';

export type SideBySideOptions = {
  mode: SideBySideMode;
};
