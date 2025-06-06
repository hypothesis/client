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
 *
 * To provide a total ordering, missing values sort before non-missing values
 * and all missing values are considered equal.
 */
function compareNumbers(a: number | undefined, b: number | undefined): number {
  const aNum = a ?? Number.MIN_SAFE_INTEGER;
  const bNum = b ?? Number.MIN_SAFE_INTEGER;
  return Math.sign(aNum - bNum);
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

export type Options = {
  /**
   * Specifies which field to sort by.
   *
   * "newest" - Sort by creation date, newest first
   * "oldest" - Sort by creation date, oldest first
   * "location" - Sort by location with the document
   */
  sortBy: 'newest' | 'oldest' | 'location';
};

/**
 * Return a number indicating the sort ordering for two annotation threads.
 */
export function compareThreads(a: Thread, b: Thread, options: Options): number {
  switch (options.sortBy) {
    case 'newest': {
      const dateA = newestRootAnnotationDate(a);
      const dateB = newestRootAnnotationDate(b);
      return compareStrings(dateB, dateA);
    }
    case 'oldest': {
      const dateA = oldestRootAnnotationDate(a);
      const dateB = oldestRootAnnotationDate(b);
      return compareStrings(dateA, dateB);
    }
    case 'location':
      return compareByLocation(a, b);
    /* istanbul ignore next */
    default:
      return 0;
  }
}

/**
 * Compare annotations by location in the document.
 *
 * This function must define a consistent total ordering for annotations, even
 * if they have different selectors, so that {@link Array.sort} will behave
 * predictably. To achieve this, default values are used to fill in missing
 * fields.
 */
function compareByLocation(a: Thread, b: Thread): number {
  if (!a.annotation || !b.annotation) {
    return compareHeadlessThreads(a, b);
  }

  const aLocation = location(a.annotation);
  const bLocation = location(b.annotation);

  // Compare by chapter. Applicable for annotations on EPUBs with CFIs.
  if (aLocation.cfi || bLocation.cfi) {
    const defaultCFI = '/0';
    const cfiResult = compareCFIs(
      aLocation.cfi ?? defaultCFI,
      bLocation.cfi ?? defaultCFI,
    );
    if (cfiResult !== 0) {
      // Annotations are in different chapters.
      return Math.sign(cfiResult);
    }
  }

  // Compare by page index.
  const pageOrder = compareNumbers(aLocation.pageIndex, bLocation.pageIndex);
  if (pageOrder !== 0) {
    return pageOrder;
  }

  // Compare by position relative to top of page.
  const topOrder = compareNumbers(aLocation.top, bLocation.top);
  if (topOrder !== 0) {
    return topOrder;
  }

  // Compare by character offset within the document text.
  const textOrder = compareNumbers(aLocation.charOffset, bLocation.charOffset);
  if (textOrder !== 0) {
    return textOrder;
  }

  // If annotations have the same location, order by creation date.
  return compareStrings(a.annotation.created, b.annotation.created);
}
