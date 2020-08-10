import { createElement } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import propTypes from 'prop-types';

import { format as formatDate } from '../util/date';
import { decayingInterval, toFuzzyString } from '../util/time';

/**
 * @typedef TimestampProps
 * @prop {string} [className] - Custom class name for the anchor/span element
 * @prop {string} [href] - Link destination
 * @prop {string} timestamp - The timestamp as an ISO 8601 date string
 */

/**
 * Display a relative timestamp (eg. '6 minutes ago') as static text or a link.
 *
 * @param {TimestampProps} props
 *
 * The timestamp automatically refreshes at an appropriate frequency.
 */
export default function Timestamp({ className, href, timestamp }) {
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
  className: propTypes.string,
  href: propTypes.string,
  timestamp: propTypes.string.isRequired,
};
