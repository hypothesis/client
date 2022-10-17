import { compareCFIs } from '../util/cfi';
import { location } from './annotation-metadata';
import { rootAnnotations } from './thread';

/** @typedef {import('./build-thread').Thread} Thread */

/**
 * Sort comparison function when one or both threads being compared is lacking
 * an annotation.
 * Sort such that a thread without an annotation sorts to the top
 *
 * @param {Thread} a
 * @param {Thread} b
 * @return {number}
 */
function compareHeadlessThreads(a, b) {
  if (!a.annotation && !b.annotation) {
    return 0;
  } else {
    return !a.annotation ? -1 : 1;
  }
}

/**
 * Find the most recent created date amongst a thread's root annotation set
 *
 * @param {Thread} thread
 * @return {string}
 */
function newestRootAnnotationDate(thread) {
  const annotations = rootAnnotations([thread]);
  return annotations.reduce(
    (newestDate, annotation) =>
      annotation.created > newestDate ? annotation.created : newestDate,
    ''
  );
}

/**
 * Find the oldest created date amongst a thread's root annotation set
 *
 * @param {Thread} thread
 * @return {string}
 */
function oldestRootAnnotationDate(thread) {
  const annotations = rootAnnotations([thread]);
  return annotations.reduce((oldestDate, annotation) => {
    if (!oldestDate) {
      oldestDate = annotation.created;
    }
    return annotation.created < oldestDate ? annotation.created : oldestDate;
  }, '');
}

/** @typedef {(a: Thread, b: Thread) => number} SortFunction */

/**
 * Sorting comparison functions for the three defined application options for
 * sorting annotation (threads)
 */
export const sorters = {
  /** @type {SortFunction} */
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

  /** @type {SortFunction} */
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

  /** @type {SortFunction} */
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
};
