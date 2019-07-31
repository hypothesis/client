'use strict';

const minute = 60;
const hour = minute * 60;

function lessThanThirtySecondsAgo(date, now) {
  return now - date < 30 * 1000;
}

function lessThanOneMinuteAgo(date, now) {
  return now - date < 60 * 1000;
}

function lessThanOneHourAgo(date, now) {
  return now - date < 60 * 60 * 1000;
}

function lessThanOneDayAgo(date, now) {
  return now - date < 24 * 60 * 60 * 1000;
}

function thisYear(date, now) {
  return date.getFullYear() === now.getFullYear();
}

function delta(date, now) {
  return Math.round((now - date) / 1000);
}

function nSec(date, now) {
  return '{} secs'.replace('{}', Math.floor(delta(date, now)));
}

function nMin(date, now) {
  const n = Math.floor(delta(date, now) / minute);
  let template = '{} min';

  if (n > 1) {
    template = template + 's';
  }

  return template.replace('{}', n);
}

function nHr(date, now) {
  const n = Math.floor(delta(date, now) / hour);
  let template = '{} hr';

  if (n > 1) {
    template = template + 's';
  }

  return template.replace('{}', n);
}

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
 * Efficiently return `date` formatted with `options`.
 *
 * This is a wrapper for Intl.DateTimeFormat.format() that caches
 * DateTimeFormat instances because they're expensive to create.
 * Calling Date.toLocaleDateString() lots of times is also expensive in some
 * browsers as it appears to create a new formatter for each call.
 *
 * @returns {string}
 *
 */
function format(date, options, Intl) {
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

function dayAndMonth(date, now, Intl) {
  return format(date, { month: 'short', day: 'numeric' }, Intl);
}

function dayAndMonthAndYear(date, now, Intl) {
  return format(
    date,
    { day: 'numeric', month: 'short', year: 'numeric' },
    Intl
  );
}

const BREAKPOINTS = [
  {
    test: lessThanThirtySecondsAgo,
    format: function() {
      return 'Just now';
    },
    nextUpdate: 1,
  },
  {
    test: lessThanOneMinuteAgo,
    format: nSec,
    nextUpdate: 1,
  },
  {
    test: lessThanOneHourAgo,
    format: nMin,
    nextUpdate: minute,
  },
  {
    test: lessThanOneDayAgo,
    format: nHr,
    nextUpdate: hour,
  },
  {
    test: thisYear,
    format: dayAndMonth,
    nextUpdate: null,
  },
  {
    test: function() {
      return true;
    },
    format: dayAndMonthAndYear,
    nextUpdate: null,
  },
];

/**
 * Returns a dict that describes how to format the date based on the delta
 * between date and now.
 *
 * @param {Date} date - The date to consider as the timestamp to format.
 * @param {Date} now - The date to consider as the current time.
 * @return {breakpoint} A dict that describes how to format the date.
 */
function getBreakpoint(date, now) {
  let breakpoint;
  for (let i = 0; i < BREAKPOINTS.length; i++) {
    breakpoint = BREAKPOINTS[i];
    if (breakpoint.test(date, now)) {
      return breakpoint;
    }
  }

  return null;
}

function nextFuzzyUpdate(date, now) {
  if (!date) {
    return null;
  }

  let secs = getBreakpoint(date, now).nextUpdate;

  if (secs === null) {
    return null;
  }

  // We don't want to refresh anything more often than 5 seconds
  secs = Math.max(secs, 5);

  // setTimeout limit is MAX_INT32=(2^31-1) (in ms),
  // which is about 24.8 days. So we don't set up any timeouts
  // longer than 24 days, that is, 2073600 seconds.
  secs = Math.min(secs, 2073600);

  return secs;
}

/**
 * Starts an interval whose frequency decays depending on the relative
 * age of 'date'.
 *
 * This can be used to refresh parts of a UI whose
 * update frequency depends on the age of a timestamp.
 *
 * @param {String} date - An ISO 8601 date string timestamp to format.
 * @param {Date} callback - A callback function to call when the timestamp changes.
 * @return {Function} A function that cancels the automatic refresh.
 */
function decayingInterval(date, callback) {
  let timer;
  const timeStamp = date ? new Date(date) : null;
  const update = function() {
    const fuzzyUpdate = nextFuzzyUpdate(timeStamp, new Date());
    if (fuzzyUpdate === null) {
      return;
    }
    const nextUpdate = 1000 * fuzzyUpdate + 500;
    timer = setTimeout(function() {
      callback(date);
      update();
    }, nextUpdate);
  };
  update();

  return function() {
    clearTimeout(timer);
  };
}

/**
 * Formats a date as a string relative to the current date.
 *
 * @param {Date} date - The date to consider as the timestamp to format.
 * @param {Date} now - The date to consider as the current time.
 * @param {Object} Intl - JS internationalization API implementation.
 * @return {string} A 'fuzzy' string describing the relative age of the date.
 */
function toFuzzyString(date, now, Intl) {
  if (!date) {
    return '';
  }
  return getBreakpoint(date, now).format(date, now, Intl);
}

module.exports = {
  clearFormatters: clearFormatters,
  decayingInterval: decayingInterval,
  nextFuzzyUpdate: nextFuzzyUpdate,
  toFuzzyString: toFuzzyString,
};
