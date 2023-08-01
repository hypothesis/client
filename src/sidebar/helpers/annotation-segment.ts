import { stripCFIAssertions } from '../../shared/cfi';
import type { SegmentInfo } from '../../types/annotator';
import type { Annotation, EPUBContentSelector } from '../../types/api';

/**
 * Return true if an annotation matches the currently loaded segment of a document.
 *
 * For web pages and PDFs, this is always true. In EPUBs, this is used to send
 * only the annotations for the current chapter to the guest frame.
 */
export function annotationMatchesSegment(
  ann: Annotation,
  segment: SegmentInfo,
) {
  const selector = ann.target[0].selector?.find(
    s => s.type === 'EPUBContentSelector',
  ) as EPUBContentSelector;

  if (!selector) {
    return true;
  }

  return Boolean(
    // nb. The URL comparison here assumes that both URLs are either absolute
    // or relative to the same root.
    (segment.url && selector.url === segment.url) ||
      (segment.cfi &&
        selector.cfi &&
        stripCFIAssertions(selector.cfi) === stripCFIAssertions(segment.cfi)),
  );
}
