import type { ModerationStatus } from '@hypothesis/annotation-ui';

import type { ClientAnnotationData } from './shared';

/**
 * Type definitions for objects returned from the Hypothesis API.
 *
 * The canonical reference is the API documentation at
 * https://h.readthedocs.io/en/latest/api-reference/
 */

/**
 * Metadata specifying how to call an API route.
 */
export type RouteMetadata = {
  /** HTTP method */
  method: string;
  /** URL template */
  url: string;
  /** Description of API route */
  desc: string;
};

/** A nested map of API route name to route metadata. */
export type RouteMap = { [key: string]: RouteMap | RouteMetadata };

/**
 * Structure of the API index response (`/api`).
 */
export type IndexResponse = {
  links: RouteMap;
};

/**
 * Structure of the Hypothesis links response (`/api/links`).
 *
 * This is a map of link name (eg. "account.settings") to URL. The URL may
 * include ":"-prefixed placeholders/variables.
 */
export type LinksResponse = Record<string, string>;

/** A date and time in ISO format (eg. "2024-12-09T07:17:52+00:00") */
export type ISODateTime = string;

/**
 * Selector which indicates the time range within a video or audio file that
 * an annotation refers to.
 */
export type MediaTimeSelector = {
  type: 'MediaTimeSelector';

  /** Offset from start of media in seconds. */
  start: number;
  /** Offset from start of media in seconds. */
  end: number;
};

/**
 * Selector which identifies a document region using the selected text plus
 * the surrounding context.
 */
export type TextQuoteSelector = {
  type: 'TextQuoteSelector';
  exact: string;
  prefix?: string;
  suffix?: string;
};

/**
 * Selector which identifies a document region using UTF-16 character offsets
 * in the document body's `textContent`.
 */
export type TextPositionSelector = {
  type: 'TextPositionSelector';
  start: number;
  end: number;
};

/**
 * Selector which identifies a document region using XPaths and character offsets.
 */
export type RangeSelector = {
  type: 'RangeSelector';
  startContainer: string;
  endContainer: string;
  startOffset: number;
  endOffset: number;
};

/**
 * Selector which identifies the Content Document within an EPUB that an
 * annotation was made in.
 */
export type EPUBContentSelector = {
  type: 'EPUBContentSelector';

  /**
   * URL of the content document. This should be an absolute HTTPS URL if
   * available, but may be relative to the root of the EPUB.
   */
  url: string;

  /**
   * EPUB Canonical Fragment Identifier for the table of contents entry that
   * corresponds to the content document.
   */
  cfi?: string;

  /** Title of the content document. */
  title?: string;
};

/**
 * Selector which identifies the page of a document that an annotation was made
 * on.
 *
 * This selector is only applicable for document types where the association of
 * content and page numbers can be done in a way that is independent of the
 * viewer and display settings. This includes inherently paginated documents
 * such as PDFs, but also content such as EPUBs when they include information
 * about the location of page breaks in printed versions of a book. It does
 * not include ordinary web pages or EPUBs without page break information
 * however.
 */
export type PageSelector = {
  type: 'PageSelector';

  /** The zero-based index of the page in the document's page sequence. */
  index: number;

  /**
   * Either the page number that is displayed on the page, or the 1-based
   * number of the page in the document's page sequence, if the pages do not
   * have numbers on them.
   */
  label?: string;
};

export type RectShape = {
  type: 'rect';
  left: number;
  top: number;
  bottom: number;
  right: number;
};

export type PointShape = {
  type: 'point';
  x: number;
  y: number;
};

export type Shape = RectShape | PointShape;

/**
 * Selector which identifies a region of the document defined by a shape.
 *
 * # Anchors
 *
 * The shape's coordinates may be relative to an _anchor_ element within the
 * document. For example a page in a PDF or an `<img>` in an HTML document. For
 * document types where a location can be fully specified by the shape
 * coordinates alone (such as images, but not PDFs or HTML documents), the
 * anchor is optional.
 *
 * # Coordinate systems
 *
 * Shape selectors should be defined using the natural coordinate system for the
 * anchor element in the document, enabling an annotation made in one viewer to
 * be resolved to the same location in a different viewer, with different view
 * settings (zoom, rotation etc.). For common document and anchor types, these
 * are as follows:
 *
 * - For PDFs, PDF user space coordinates (points), with the origin at the
 *   bottom-left corner of the page.
 * - For images, pixels with the origin at the top-left
 */
export type ShapeSelector = {
  type: 'ShapeSelector';

  shape: Shape;

  /**
   * Specifies the element of the document that the shape is relative to.
   *
   * This can be omitted in document types such as images, where the coordinates
   * on their own can specify a unique location in the document.
   *
   * Supported values:
   *
   * - "page" - The page identified by the annotation's {@link PageSelector}.
   */
  anchor?: 'page';

  /**
   * Specifies the bounding box of the visible area of the anchor element,
   * in the same coordinates used by {@link ShapeSelector.shape}.
   *
   * This enables interpreting the coordinates in the shape relative to the
   * anchor element as a whole.
   *
   * Examples of how the visible area is determined for common document and
   * anchor types:
   *
   * - For a PDF page, the box is the intersection of the media and crop box,
   *   which is usually equal to the crop box. See https://www.pdf2go.com/blog/what-are-pdf-boxes.
   * - For an SVG, these are the coordinates of the `viewBox` element
   * - For an image, `left` and `top` are zero and `right` and `bottom` are the
   *   width and height of the image in pixels.
   */
  view?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };

  /** The text contained inside this shape. */
  text?: string;
};

/**
 * Serialized representation of a region of a document which an annotation
 * pertains to.
 */
export type Selector =
  | TextQuoteSelector
  | TextPositionSelector
  | RangeSelector
  | EPUBContentSelector
  | MediaTimeSelector
  | PageSelector
  | ShapeSelector;

/**
 * An entry in the `target` field of an annotation which identifies the document
 * and region of the document that it refers to.
 */
export type Target = {
  /** URI of the document */
  source: string;
  /** Region of the document */
  selector?: Selector[];
  /** Text description of the selection, for when the selection itself is not text. */
  description?: string;
};

export type UserInfo = {
  display_name: string | null;
};

export type Mention = {
  /** Current userid for the user that was mentioned */
  userid: string;
  /** Current username for the user that was mentioned */
  username: string;
  /** Current display name for the user that was mentioned */
  display_name: string | null;
  /** Link to the user profile, if applicable */
  link: string | null;
  /** The user description/bio */
  description: string | null;
  /** The date when the user joined, in ISO format */
  joined: ISODateTime | null;

  /**
   * The userid at the moment the mention was created.
   * If the user changes their username later, this can be used to match the
   * right mention tag in the annotation text.
   */
  original_userid: string;
};

/**
 * Represents an annotation as returned by the h API.
 * API docs: https://h.readthedocs.io/en/latest/api-reference/#tag/annotations
 */
export type APIAnnotationData = {
  /**
   * The server-assigned ID for the annotation. This is only set once the
   * annotation has been saved to the backend.
   */
  id?: string;

  references?: string[];
  created: string;
  flagged?: boolean;
  group: string;
  updated: string;
  tags: string[];
  text: string;
  uri: string;
  user: string;
  hidden: boolean;

  document: {
    title: string;
  };

  permissions: {
    read: string[];
    update: string[];
    delete: string[];
  };

  /**
   * The document and region this annotation refers to.
   *
   * The Hypothesis API structure allows for multiple targets, but the h
   * server only supports one target per annotation.
   */
  target: Target[];

  moderation?: {
    flagCount: number;
  };

  moderation_status?: ModerationStatus;

  links: {
    /**
     * A "bouncer" URL that takes the user to see the annotation in context
     */
    incontext?: string;

    /** URL to view the annotation by itself. */
    html?: string;
  };

  user_info?: UserInfo;

  /**
   * An opaque object that contains metadata about the current context,
   * provided by the embedder via the `annotationMetadata` config.
   *
   * The Hypothesis LMS app uses this field to attach information about the
   * current assignment, course etc. to annotations.
   */
  metadata?: object;

  /**
   * List of unique users that were mentioned in the annotation text.
   * This prop will be present only if `at_mentions` is enabled.
   */
  mentions?: Mention[];

  /** The list of actions current user can perform over this annotation */
  actions?: Array<'moderate' | string>;
};

/**
 * Augmented annotation including what's returned by `h` API + client-internal
 * properties
 */
export type Annotation = ClientAnnotationData & APIAnnotationData;

/**
 * An annotation which has been saved to the backend and assigned an ID.
 */
export type SavedAnnotation = Annotation & { id: string };

export type Profile = {
  userid: string | null;
  preferences: {
    show_sidebar_tutorial?: boolean;
  };
  features: Record<string, boolean>;
  user_info?: UserInfo;
};

export type GroupType = 'private' | 'restricted' | 'open';

export type Organization = {
  name: string;
  logo: string;
  id: string;
  default?: boolean;
};

export type GroupScopes = {
  enforced: boolean;
  uri_patterns: string[];
};

export type Group = {
  /** The "pubid" of the group, unique per authority. */
  id: string;
  /** Fully-qualified ID with authority. */
  groupid?: string;
  type: GroupType;
  /**
   * Note: This field is nullable in the API, but we assign a default organization in the client.
   */
  organization: Organization;
  scopes: GroupScopes | null;
  links: {
    html?: string;
  };
  pre_moderated: boolean;

  // Properties not present on API objects, but added in the client.
  logo: string;
  isMember: boolean;
  isScopedToUri: boolean;
  name: string;
  canLeave: boolean;
};

/**
 * All Groups have an `id`, which is a server-assigned identifier. This is the
 * primary field used to identify a Group.
 *
 * In some cases, specifically LMS, it is necessary for an outside service to
 * be able to specify its own identifier. This gets stored in the `groupid`
 * field of a Group. Only some Groups have a `groupid`.
 *
 * Application logic operates on `id`s, but we may receive `groupid`s in some
 * cases from outside sevices, e.g. the `changeFocusModeUser` RPC method.
 */
export type GroupIdentifier = NonNullable<Group['id'] | Group['groupid']>;

/**
 * Generic type for endpoints that return paginated lists of items.
 */
export type PaginatedResponse<Item> = {
  meta: {
    page: {
      total: number;
    };
  };
  data: Item[];
};

export type GroupMember = {
  authority: string;
  userid: string;
  username: string;
  display_name: string | null;
  roles: string[];
  actions: string[];
  created: string;
  updated: string;
};

/**
 * Response to a GET /api/groups/{id}/members api call
 */
export type GroupMembers = PaginatedResponse<GroupMember>;

/**
 * Query parameters for an `/api/search` API call.
 *
 * This type currently includes params that we've actually used.
 *
 * See https://h.readthedocs.io/en/latest/api-reference/#tag/annotations/paths/~1search/get
 * for the complete list and usage of each.
 */
export type SearchQuery = {
  limit?: number;
  uri?: string[];
  group?: string;
  order?: string;
  references?: string;
  search_after?: string;
  sort?: string;
  /** Undocument param that causes replies to be returned in a separate `replies` field. */
  _separate_replies?: boolean;
};

/**
 * Response to an `/api/search` API call.
 *
 * See https://h.readthedocs.io/en/latest/api-reference/#tag/annotations/paths/~1search/get
 */
export type SearchResponse = {
  total: number;
  rows: Annotation[];

  /** Undocumented property that is populated if `_separate_replies` query param was specified. */
  replies?: Annotation[];
};
