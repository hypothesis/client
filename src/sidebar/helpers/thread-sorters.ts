import { compareCFIs } from '../../shared/cfi';
import { location } from './annotation-metadata';
import type { Thread } from './build-thread';
import { rootAnnotations } from './thread';

/**
 * Sort comparison function when one or both threads being compared is lacking
 * an annotation.
 * Sort such that a thread without an annotation sorts to the top
 */
function compareHeadlessThreads(a: Thread, b: Thread): number {
  if (!a.annotation && !b.annotation) {
    return 0;
  } else {
    return !a.annotation ? -1 : 1;
  }
}

/**
 * Find the most recent created date amongst a thread's root annotation set
 */
function newestRootAnnotationDate(thread: Thread): string {
  const annotations = rootAnnotations([thread]);
  return annotations.reduce(
    (newestDate, annotation) =>
      annotation.created > newestDate ? annotation.created : newestDate,
    '',
  );
}

/**
 * Find the oldest created date amongst a thread's root annotation set
 */
function oldestRootAnnotationDate(thread: Thread): string {
  const annotations = rootAnnotations([thread]);
  return annotations.reduce((oldestDate, annotation) => {
    if (!oldestDate) {
      oldestDate = annotation.created;
    }
    return annotation.created < oldestDate ? annotation.created : oldestDate;
  }, '');
}

type SortFunction = (a: Thread, b: Thread) => number;

/**
 * Sorting comparison functions for the three defined application options for
 * sorting annotation (threads)
 */
export const sorters = {
  Newest: (a, b) => {
    const dateA = newestRootAnnotationDate(a);
    const dateB = newestRootAnnotationDate(b);
    if (dateA > dateB) {
      return -1;
    } else if (dateA < dateB) {
      return 1;
    }
    return 0;
  },

  Oldest: (a, b) => {
    const dateA = oldestRootAnnotationDate(a);
    const dateB = oldestRootAnnotationDate(b);
    if (dateA < dateB) {
      return -1;
    } else if (dateA > dateB) {
      return 1;
    }
    return 0;
  },

  Location: (a, b) => {
    if (!a.annotation || !b.annotation) {
      return compareHeadlessThreads(a, b);
    }
    const aLocation = location(a.annotation);
    const bLocation = location(b.annotation);

    // If these annotations come from an EPUB and specify which chapter they
    // came from via a CFI, compare the chapter order first.
    if (aLocation.cfi && bLocation.cfi) {
      const cfiResult = compareCFIs(aLocation.cfi, bLocation.cfi);
      if (cfiResult !== 0) {
        // Annotations are in different chapters.
        return Math.sign(cfiResult);
      }
    } else if (aLocation.cfi) {
      return -1;
    } else if (bLocation.cfi) {
      return 1;
    }

    // If the chapter number is the same or for other document types, compare
    // the text position instead. Missing positions sort after any present
    // positions.
    const aPos = aLocation.position ?? Number.MAX_SAFE_INTEGER;
    const bPos = bLocation.position ?? Number.MAX_SAFE_INTEGER;
    return Math.sign(aPos - bPos);
  },
} satisfies Record<string, SortFunction>;
