import type { Annotation } from '../../types/api';

export type AnnotationId = string;

export type MostRelevantAnnotationOptions = {
  /** The list of highlighted annotation IDs to filter by */
  highlightedAnnotations: AnnotationId[];
  currentUserId: string | null;
};

/**
 * Finds the most relevant annotation in a list.
 *
 * The most relevant annotation is:
 * 1. The most recent annotation which is highlighted, with mentions of current user, or
 * 2. The most recent annotation which is highlighted, or
 * 3. `null`
 *
 * @param annotations - The list of annotations to search from
 */
export function mostRelevantAnnotation(
  annotations: Annotation[],
  { highlightedAnnotations, currentUserId }: MostRelevantAnnotationOptions,
): Annotation | null {
  if (highlightedAnnotations.length === 0) {
    return null;
  }

  // To determine which is the most relevant annotation, we first sort them
  // from newest to oldest
  const sortedHighlightedAnnos = annotations
    .filter(anno => anno.id && highlightedAnnotations.includes(anno.id))
    // The `updated` field contains a date in ISO format. This means their
    // alphabetical and chronological orders match.
    .sort((a, b) => {
      if (b.updated === a.updated) {
        return 0;
      }
      return b.updated > a.updated ? 1 : -1;
    });

  // Then we find the most recent one with mentions of current user
  const mostRelevantHighlightedAnnotation = currentUserId
    ? sortedHighlightedAnnos.find(
        anno =>
          anno.mentions &&
          anno.mentions.some(({ userid }) => userid === currentUserId),
      )
    : null;

  // Finally we try to fall back to the most recent one
  return mostRelevantHighlightedAnnotation ?? sortedHighlightedAnnos[0] ?? null;
}
