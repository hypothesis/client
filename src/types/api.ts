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

/**
 * Serialized representation of a region of a document which an annotation
 * pertains to.
 */
export type Selector =
  | TextQuoteSelector
  | TextPositionSelector
  | RangeSelector
  | EPUBContentSelector
  | PageSelector;

/**
 * An entry in the `target` field of an annotation which identifies the document
 * and region of the document that it refers to.
 */
export type Target = {
  /** URI of the document */
  source: string;
  /** Region of the document */
  selector?: Selector[];
};

export type UserInfo = {
  display_name: string | null;
};

export type Annotation = ClientAnnotationData & {
  /**
   * The server-assigned ID for the annotation. This is only set once the
   * annotation has been saved to the backend.
   */
  id?: string;

  /**
   * A locally-generated unique identifier for annotations.
   *
   * This is set for all annotations, whether they have been saved to the
   * backend or not.
   */
  $tag: string;

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

  links: {
    /**
     * A "bouncer" URL that takes the user to see the annotation in context
     */
    incontext?: string;

    /** URL to view the annotation by itself. */
    html?: string;
  };

  user_info?: UserInfo;
};

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
  type: 'private' | 'open';
  /**
   * Note: This field is nullable in the API, but we assign a default organization in the client.
   */
  organization: Organization;
  scopes: GroupScopes | null;
  links: {
    html?: string;
  };

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
