import type {
  APIAnnotationData,
  Annotation,
  EPUBContentSelector,
  PageSelector,
  SavedAnnotation,
  ShapeSelector,
  TextQuoteSelector,
} from '../../types/api';

/**
 * Utility functions for querying annotation metadata.
 */

/**
 * Return `true` if the given annotation is a reply, `false` otherwise.
 */
export function isReply(annotation: APIAnnotationData): boolean {
  return (annotation.references || []).length > 0;
}

/**
 * Return true if the given annotation has been saved to the backend and assigned
 * an ID.
 */
export function isSaved(annotation: Annotation): annotation is SavedAnnotation {
  return !!annotation.id;
}

/**
 * Return true if an annotation has not been saved to the backend.
 *
 * @deprecated - Use {@link isSaved} instead
 */
export function isNew(annotation: APIAnnotationData): boolean {
  return !annotation.id;
}

/**
 * Return `true` if `annotation` has a selector.
 *
 * An annotation which has a selector refers to a specific part of a document,
 * as opposed to a Page Note which refers to the whole document or a reply,
 * which refers to another annotation.
 */
function hasSelector(annotation: APIAnnotationData): boolean {
  return !!(
    annotation.target &&
    annotation.target.length > 0 &&
    annotation.target[0].selector
  );
}

/**
 * Return `true` if the given annotation is not yet anchored.
 *
 * Returns false if anchoring is still in process but the flag indicating that
 * the initial timeout allowed for anchoring has expired.
 */
export function isWaitingToAnchor(annotation: Annotation): boolean {
  return (
    hasSelector(annotation) &&
    typeof annotation.$orphan === 'undefined' &&
    !annotation.$anchorTimeout
  );
}

/**
 * Has this annotation hidden by moderators?
 */
export function isHidden(annotation: Annotation): boolean {
  return !!annotation.hidden;
}

/**
 * Is this annotation a highlight?
 *
 * Highlights are generally identifiable by having no text content AND no tags,
 * but there is some nuance.
 */
export function isHighlight(
  annotation: Annotation | APIAnnotationData,
): boolean {
  // `$highlight` is an ephemeral attribute set by the `annotator` on new
  // annotation objects (created by clicking the "highlight" button).
  // It is not persisted and cannot be relied upon, but if it IS present,
  // this is definitely a highlight (one which is not yet saved).
  if ('$highlight' in annotation && annotation.$highlight) {
    return true;
  }

  if (isNew(annotation)) {
    // For new (unsaved-to-service) annotations, unless they have a truthy
    // `$highlight` attribute, we don't know yet if they are a highlight.
    return false;
  }

  // Note that it is possible to end up with an empty (no `text`) annotation
  // that is not a highlight by adding at least one tag—thus, it is necessary
  // to check for the existence of tags as well as text content.

  return (
    !isPageNote(annotation) &&
    !isReply(annotation) &&
    !annotation.hidden && // A hidden annotation has some form of objectionable content
    !annotation.text &&
    !(annotation.tags && annotation.tags.length)
  );
}

/**
 * Return `true` if the given annotation is an orphan.
 */
export function isOrphan(annotation: Annotation): boolean {
  return hasSelector(annotation) && annotation.$orphan === true;
}

/**
 * Return `true` if the given annotation is a page note.
 */
export function isPageNote(annotation: APIAnnotationData): boolean {
  return !hasSelector(annotation) && !isReply(annotation);
}

/**
 * Return `true` if the given annotation is a top level annotation, `false` otherwise.
 */
export function isAnnotation(annotation: Annotation): boolean {
  return !!(hasSelector(annotation) && !isOrphan(annotation));
}

/**
 * Return a human-readable string describing the annotation's role.
 */
export function annotationRole(annotation: APIAnnotationData): string {
  if (isReply(annotation)) {
    return 'Reply';
  } else if (isHighlight(annotation)) {
    return 'Highlight';
  } else if (isPageNote(annotation)) {
    return 'Page note';
  }
  return 'Annotation';
}

/**
 * Key containing information needed to sort annotations based on their
 * associated position within the document.
 */
type LocationKey = {
  /**
   * EPUB Canonical Fragment Identifier.
   *
   * For annotations on EPUBs, this identifies the location of the chapter
   * within the book's table of contents.
   */
  cfi?: string;

  /**
   * Text offset within the document segment, in UTF-16 code units.
   *
   * For web pages and PDFs this refers to the offset from the start of the
   * document. In EPUBs this refers to the offset from the start of the Content
   * Document (ie. chapter).
   */
  charOffset?: number;

  /** Zero-based page index within the document. */
  pageIndex?: number;

  /**
   * Distance from the top of the page or image.
   *
   * This is based on a comparison of the shape and anchor bounding boxes in
   * a {@link ShapeSelector}.
   */
  top?: number;
};

/**
 * Return a key that can be used to sort annotations by document position.
 *
 * Note that the key may not have any fields set if the annotation is a page
 * note or was created via the Hypothesis API without providing the selectors
 * that this function uses.
 */
export function location(annotation: Annotation): LocationKey {
  // We only consider the first target, since h and the client only support
  // a single target.
  const target = annotation.target[0];
  if (!target?.selector) {
    return {};
  }

  let cfi;
  let charOffset;
  let pageIndex;
  let top;

  // nb. We ignore the possibility of an annotation having multiple targets here.
  // h and the client only support one.
  for (const selector of target.selector) {
    switch (selector.type) {
      case 'TextPositionSelector':
        charOffset = selector.start;
        break;
      case 'EPUBContentSelector':
        cfi = selector.cfi;
        break;
      case 'PageSelector':
        pageIndex = selector.index;
        break;
      case 'ShapeSelector':
        top = distanceFromTopOfView(selector);
        break;
    }
  }

  return { cfi, charOffset, pageIndex, top };
}

/**
 * Return the distance of the top of a shape from the top of the containing
 * page, image or document.
 */
function distanceFromTopOfView(selector: ShapeSelector): number | undefined {
  const pageTop = selector.view?.top ?? 0;
  switch (selector.shape.type) {
    case 'rect':
      return Math.abs(pageTop - selector.shape.top);
    case 'point':
      return Math.abs(pageTop - selector.shape.y);
    default:
      return undefined;
  }
}

/**
 * Return the number of times the annotation has been flagged
 * by other users. If moderation metadata is not present, returns `null`.
 */
export function flagCount(annotation: Annotation): number | null {
  if (!annotation.moderation) {
    return null;
  }
  return annotation.moderation.flagCount;
}

/**
 * Return the text quote that an annotation refers to.
 */
export function quote(annotation: APIAnnotationData): string | null {
  if (annotation.target.length === 0) {
    return null;
  }
  const target = annotation.target[0];
  if (!target.selector) {
    return null;
  }
  const quoteSel = target.selector.find(s => s.type === 'TextQuoteSelector') as
    | TextQuoteSelector
    | undefined;
  return quoteSel ? quoteSel.exact : null;
}

/** Return the description of the annotation's selection. */
export function description(annotation: APIAnnotationData): string | undefined {
  return annotation.target[0]?.description;
}

/**
 * Return the shape of an annotation's target, if there is one.
 *
 * This will return `null` if the annotation is associated with a text
 * selection instead of a shape.
 */
export function shape(annotation: APIAnnotationData): ShapeSelector | null {
  const shapeSelector = annotation.target[0]?.selector?.find(
    s => s.type === 'ShapeSelector',
  ) as ShapeSelector | undefined;
  return shapeSelector ?? null;
}

/**
 * Return the EPUB Canonical Fragment Identifier for the table of contents entry
 * associated with the part of the book / document that an annotation was made
 * on.
 *
 * See {@link EPUBContentSelector}.
 */
export function cfi(annotation: APIAnnotationData): string | undefined {
  const epubSel = annotation.target[0]?.selector?.find(
    s => s.type === 'EPUBContentSelector',
  ) as EPUBContentSelector | undefined;
  return epubSel?.cfi;
}

/**
 * Return the label of the page that an annotation comes from.
 *
 * This is usually a 1-based page number, but can also be roman numerals etc.
 */
export function pageLabel(annotation: APIAnnotationData): string | undefined {
  const pageSel = annotation.target[0]?.selector?.find(
    s => s.type === 'PageSelector',
  ) as PageSelector | undefined;
  return pageSel?.label;
}

/**
 * Has this annotation been edited subsequent to its creation?
 */
export function hasBeenEdited(annotation: Annotation): boolean {
  // New annotations created with the current `h` API service will have
  // equivalent (string) values for `created` and `updated` datetimes.
  // However, in the past, these values could have sub-second differences,
  // which can make them appear as having been edited when they have not
  // been. Only consider an annotation as "edited" if its creation time is
  // more than 2 seconds before its updated time.
  const UPDATED_THRESHOLD = 2000;

  // If either time string is non-extant or they are equivalent...
  if (
    !annotation.updated ||
    !annotation.created ||
    annotation.updated === annotation.created
  ) {
    return false;
  }

  // Both updated and created SHOULD be ISO-8601-formatted strings
  // with microsecond resolution; (NB: Date.prototype.getTime() returns
  // milliseconds since epoch, so we're dealing in ms after this)
  const created = new Date(annotation.created).getTime();
  const updated = new Date(annotation.updated).getTime();
  if (isNaN(created) || isNaN(updated)) {
    // If either is not a valid date...
    return false;
  }
  return updated - created > UPDATED_THRESHOLD;
}
