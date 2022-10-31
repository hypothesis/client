/**
 * Clusters provide the client application a mechanism for categorizing
 * annotations so that their drawn anchor highlights may be styled distinctively
 * in the annotated document. An annotation can only belong to one cluster.
 */
export type HighlightCluster =
  | 'other-content' // default cluster: content not belonging to the current user
  | 'user-annotations' // An annotation belonging to the current user
  | 'user-highlights'; // A highlight (highlights are private; they always belong to the current user)

/**
 * Annotation properties not present on API objects, but added by the client
 */
export type ClientAnnotationData = {
  $cluster?: HighlightCluster;
  /**
   * Client-side identifier: set even if annotation does not have a
   * server-provided `id` (i.e. is unsaved)
   */
  $tag: string;

  /**
   * Flag indicating whether waiting for the annotation to anchor timed out
   */
  $anchorTimeout?: boolean;

  /**
   * Flag indicating that this annotation was created using the "Highlight" button,
   * as opposed to "Annotate".
   */
  $highlight?: boolean;

  /**
   * Flag indicating that this annotation was not found in the document.
   * It is initially `undefined` while anchoring is in progress and then set to
   * `true` if anchoring failed or `false` if it succeeded.
   */
  $orphan?: boolean;
};
