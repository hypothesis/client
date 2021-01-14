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
 * Find the most recent updated date amongst a thread's root annotation set
 *
 * @param {Thread} thread
 * @return {string}
 */
function newestRootAnnotationDate(thread) {
  const annotations = rootAnnotations([thread]);
  return annotations.reduce(
    (newestDate, annotation) =>
      annotation.updated > newestDate ? annotation.updated : newestDate,
    ''
  );
}

/**
 * Find the oldest updated date amongst a thread's root annotation set
 *
 * @param {Thread} thread
 * @return {string}
 */
function oldestRootAnnotationDate(thread) {
  const annotations = rootAnnotations([thread]);
  return annotations.reduce((oldestDate, annotation) => {
    if (!oldestDate) {
      oldestDate = annotation.updated;
    }
    return annotation.updated < oldestDate ? annotation.updated : oldestDate;
  }, '');
}

/**
 * Sorting comparison functions for the three defined application options for
 * sorting annotation (threads)
 */
export const sorters = {
  Newest: function (a, b) {
    const dateA = newestRootAnnotationDate(a);
    const dateB = newestRootAnnotationDate(b);
    if (dateA > dateB) {
      return -1;
    } else if (dateA < dateB) {
      return 1;
    }
    return 0;
  },

  Oldest: function (a, b) {
    const dateA = oldestRootAnnotationDate(a);
    const dateB = oldestRootAnnotationDate(b);
    if (dateA < dateB) {
      return -1;
    } else if (dateA > dateB) {
      return 1;
    }
    return 0;
  },

  Location: function (a, b) {
    if (!a.annotation || !b.annotation) {
      return compareHeadlessThreads(a, b);
    }
    const aLocation = location(a.annotation);
    const bLocation = location(b.annotation);
    if (aLocation < bLocation) {
      return -1;
    } else if (aLocation > bLocation) {
      return 1;
    }
    return 0;
  },
};
