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

/**
 * Compare optional numeric values.
 */
function compareNumbers(
  a: number | undefined,
  b: number | undefined,
): number | undefined {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.sign(a - b);
  } else {
    return undefined;
  }
}

/** Perform a lexicographic, locale-insensitive comparison of strings. */
function compareStrings(a: string, b: string): number {
  if (a === b) {
    return 0;
  } else if (a < b) {
    return -1;
  } else {
    return 1;
  }
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
    return compareStrings(dateB, dateA);
  },

  Oldest: (a, b) => {
    const dateA = oldestRootAnnotationDate(a);
    const dateB = oldestRootAnnotationDate(b);
    return compareStrings(dateA, dateB);
  },

  Location: (a, b) => {
    if (!a.annotation || !b.annotation) {
      return compareHeadlessThreads(a, b);
    }

    const aLocation = location(a.annotation);
    const bLocation = location(b.annotation);

    // Compare by chapter. Applicable for annotations on EPUBs with CFIs.
    if (aLocation.cfi && bLocation.cfi) {
      const cfiResult = compareCFIs(aLocation.cfi, bLocation.cfi);
      if (cfiResult !== 0) {
        // Annotations are in different chapters.
        return Math.sign(cfiResult);
      }
    }

    // Compare by page index.
    const pageOrder = compareNumbers(aLocation.pageIndex, bLocation.pageIndex);
    if (pageOrder !== undefined && pageOrder !== 0) {
      return pageOrder;
    }

    // Compare by position relative to top of page.
    const topOrder = compareNumbers(aLocation.top, bLocation.top);
    if (topOrder !== undefined && topOrder !== 0) {
      return topOrder;
    }

    // Compare by character offset within the document text.
    const textOrder = compareNumbers(
      aLocation.charOffset,
      bLocation.charOffset,
    );
    if (textOrder !== undefined && textOrder !== 0) {
      return textOrder;
    }

    // If we can't order the annotations by location, fall back to comparing
    // by creation date.
    return compareStrings(a.annotation.created, b.annotation.created);
  },
} satisfies Record<string, SortFunction>;
