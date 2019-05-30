'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');
const { useEffect, useMemo, useState } = require('preact/hooks');

const { format: formatDate } = require('../util/date');
const { decayingInterval, toFuzzyString } = require('../util/time');

/**
 * Display a relative timestamp (eg. '6 minutes ago') as static text or a link.
 *
 * The timestamp automatically refreshes at an appropriate frequency.
 */
function Timestamp({ className, href, timestamp }) {
  // "Current" time, used when calculating the relative age of `timestamp`.
  const [now, setNow] = useState(new Date());

  // Fuzzy, relative timestamp (eg. '6 days ago')
  const relativeTimestamp = useMemo(
    () => toFuzzyString(timestamp ? new Date(timestamp) : null, now),
    [timestamp, now]
  );

  // Absolute timestamp (eg. 'Tue 22nd Dec 2015, 16:00')
  const absoluteTimestamp = useMemo(() => formatDate(new Date(timestamp)), [
    timestamp,
  ]);

  // Refresh relative timestamp, at a frequency appropriate for the age.
  useEffect(() => {
    const cancelRefresh = decayingInterval(timestamp, () => setNow(new Date()));
    return cancelRefresh;
  }, [timestamp]);

  return href ? (
    <a
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      title={absoluteTimestamp}
      href={href}
    >
      {relativeTimestamp}
    </a>
  ) : (
    <span className={className} title={absoluteTimestamp}>
      {relativeTimestamp}
    </span>
  );
}

Timestamp.propTypes = {
  /** Custom class name for the anchor/span element. */
  className: propTypes.string,

  /** Link destination. */
  href: propTypes.string,

  /**
   * The timestamp as an ISO 8601 date string.
   */
  timestamp: propTypes.string.isRequired,
};

module.exports = Timestamp;
