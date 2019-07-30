'use strict';

/**
 * Utility functions for generating formatted "fuzzy" date strings and
 * computing decaying intervals for updating those dates in a UI.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

// Cached DateTimeFormat instances,
// because instantiating a DateTimeFormat is expensive.
let formatters = {};

/**
 * Clears the cache of formatters.
 */
function clearFormatters() {
  formatters = {};
}

/**
 * Calculate time delta in milliseconds between two `Date` objects
 *
 * @param {Date} date
 * @param {Date} now
 */
function delta(date, now) {
  return now - date;
}

/**
 * Efficiently return date string formatted with `options`.
 *
 * This is a wrapper for `Intl.DateTimeFormat.format()` that caches
 * `DateTimeFormat` instances because they're expensive to create.
 * Calling `Date.toLocaleDateString()` lots of times is also expensive in some
 * browsers as it appears to create a new formatter for each call.
 *
 * @param {Date} date
 * @param {Object} options - Options for `Intl.DateTimeFormat.format()`
 * @param {Object} Intl - JS internationalization API implementation; this
 *                      param is present for dependency injection during test.
 * @returns {string}
 */
function formatIntl(date, options, Intl) {
  // If the tests have passed in a mock Intl then use it, otherwise use the
  // real one.
  if (typeof Intl === 'undefined') {
    Intl = window.Intl;
  }

  if (Intl && Intl.DateTimeFormat) {
    const key = JSON.stringify(options);
    let formatter = formatters[key];

    if (!formatter) {
      formatter = formatters[key] = new Intl.DateTimeFormat(undefined, options);
    }

    return formatter.format(date);
  } else {
    // IE < 11, Safari <= 9.0.
    return date.toDateString();
  }
}

/**
 * Date templating functions.
 *
 * @param {Date} date
 * @param {Date} now
 * @return {String} formatted date
 */
function nSec(date, now) {
  const n = Math.floor(delta(date, now) / SECOND);
  return `${n} secs ago`;
}

function nMin(date, now) {
  const n = Math.floor(delta(date, now) / MINUTE);
  const plural = n > 1 ? 's' : '';
  return `${n} min${plural} ago`;
}

function nHr(date, now) {
  const n = Math.floor(delta(date, now) / HOUR);
  const plural = n > 1 ? 's' : '';
  return `${n} hr${plural} ago`;
}

function dayAndMonth(date, now, Intl) {
  return formatIntl(date, { month: 'short', day: 'numeric' }, Intl);
}

function dayAndMonthAndYear(date, now, Intl) {
  return formatIntl(
    date,
    { day: 'numeric', month: 'short', year: 'numeric' },
    Intl
  );
}

const BREAKPOINTS = [
  {
    // Less than 30 seconds
    test: (date, now) => delta(date, now) < 30 * SECOND,
    formatFn: () => 'Just now',
    nextUpdate: 1 * SECOND,
  },
  {
    // Less than 1 minute
    test: (date, now) => delta(date, now) < 1 * MINUTE,
    formatFn: nSec,
    nextUpdate: 1 * SECOND,
  },
  {
    // less than one hour
    test: (date, now) => delta(date, now) < 1 * HOUR,
    formatFn: nMin,
    nextUpdate: 1 * MINUTE,
  },
  {
    // less than one day
    test: (date, now) => delta(date, now) < 24 * HOUR,
    formatFn: nHr,
    nextUpdate: 1 * HOUR,
  },
  {
    // this year
    test: (date, now) => date.getFullYear() === now.getFullYear(),
    formatFn: dayAndMonth,
    nextUpdate: null,
  },
  {
    // everything else (default case)
    test: () => true,
    formatFn: dayAndMonthAndYear,
    nextUpdate: null,
  },
];

/**
 * Returns a dict that describes how to format the date based on the delta
 * between date and now.
 *
 * @param {Date} date - The date to consider as the timestamp to format.
 * @param {Date} now - The date to consider as the current time.
 * @return {breakpoint|null} An object that describes how to format the date or
 *                           null if no breakpoint matches.
 */
function getBreakpoint(date, now) {
  for (let breakpoint of BREAKPOINTS) {
    if (breakpoint.test(date, now)) {
      return breakpoint;
    }
  }
  return null;
}

/**
 * Return the number of milliseconds until the next update for a given date
 * should be handled, based on the delta between `date` and `now`.
 *
 * @param {Date} date
 * @param {Date} now
 * @return {Number|null} - ms until next update or `null` if no update
 *                         should occur
 */
function nextFuzzyUpdate(date, now) {
  if (!date) {
    return null;
  }

  let nextUpdate = getBreakpoint(date, now).nextUpdate;

  if (nextUpdate === null) {
    return null;
  }

  // We don't want to refresh anything more often than 5 seconds
  nextUpdate = Math.max(nextUpdate, 5 * SECOND);

  // setTimeout limit is MAX_INT32=(2^31-1) (in ms),
  // which is about 24.8 days. So we don't set up any timeouts
  // longer than 24 days, that is, 2073600 seconds.
  nextUpdate = Math.min(nextUpdate, 2073600 * SECOND);

  return nextUpdate;
}

/**
 * Starts an interval whose frequency decays depending on the relative
 * age of 'date'.
 *
 * This can be used to refresh parts of a UI whose
 * update frequency depends on the age of a timestamp.
 *
 * @param {String} date - An ISO 8601 date string timestamp to format.
 * @param {UpdateCallback} callback - A callback function to call when the timestamp changes.
 * @return {Function} A function that cancels the automatic refresh.
 */
function decayingInterval(date, callback) {
  let timer;
  const timeStamp = date ? new Date(date) : null;

  const update = () => {
    const fuzzyUpdate = nextFuzzyUpdate(timeStamp, new Date());
    if (fuzzyUpdate === null) {
      return;
    }
    const nextUpdate = fuzzyUpdate + 500;
    timer = setTimeout(() => {
      callback(date);
      update();
    }, nextUpdate);
  };

  update();

  return () => clearTimeout(timer);
}

/**
 * This callback is a param for the `decayingInterval` function.
 * @callback UpdateCallback
 * @param {Date} - The date associated with the current interval/timeout
 */

/**
 * Formats a date as a string relative to the current date.
 *
 * @param {Date} date - The date to consider as the timestamp to format.
 * @param {Date} now - The date to consider as the current time.
 * @param {Object} Intl - JS internationalization API implementation; this
 *                      param is present for dependency injection during test.
 * @return {string} A 'fuzzy' string describing the relative age of the date.
 */
function toFuzzyString(date, now, Intl) {
  if (!date) {
    return '';
  }
  return getBreakpoint(date, now).formatFn(date, now, Intl);
}

module.exports = {
  clearFormatters: clearFormatters, // For testing
  decayingInterval: decayingInterval,
  nextFuzzyUpdate: nextFuzzyUpdate, // For testing
  toFuzzyString: toFuzzyString,
};
