import classnames from 'classnames';

/**
 * @typedef {import('../util/buckets').Bucket} Bucket
 */

/**
 * A left-pointing indicator button that, when hovered or clicked, highlights
 * or selects associated annotations.
 *
 * @param {object} props
 *   @param {Bucket} props.bucket
 *   @param {(tags: string[]) => void} props.onFocusAnnotations
 *   @param {(tags: string[], toggle: boolean) => void} props.onSelectAnnotations
 */
function BucketButton({ bucket, onFocusAnnotations, onSelectAnnotations }) {
  const buttonTitle = `Select nearby annotations (${bucket.anchors.length})`;

  function selectAnnotations(event) {
    const tags = bucket.anchors.map(anchor => anchor.annotation.$tag);
    onSelectAnnotations(tags, event.metaKey || event.ctrlKey);
  }

  function setFocus(hasFocus) {
    if (hasFocus) {
      const tags = bucket.anchors.map(anchor => anchor.annotation.$tag);
      onFocusAnnotations(tags);
    } else {
      onFocusAnnotations([]);
    }
  }

  return (
    <button
      className="Buckets__button Buckets__button--left"
      onClick={event => selectAnnotations(event)}
      onMouseMove={() => setFocus(true)}
      onMouseOut={() => setFocus(false)}
      onBlur={() => setFocus(false)}
      title={buttonTitle}
      aria-label={buttonTitle}
    >
      {bucket.anchors.length}
    </button>
  );
}

/**
 * An up- or down-pointing button that will scroll to the next closest bucket
 * of annotations in the given direction.
 *
 * @param {object} props
 *   @param {Bucket} props.bucket
 *   @param {'down'|'up'} props.direction
 *   @param {(tags: string[], direction: 'down'|'up') => void} props.onScrollToClosestOffScreenAnchor
 */
function NavigationBucketButton({
  bucket,
  direction,
  onScrollToClosestOffScreenAnchor,
}) {
  const buttonTitle = `Go ${direction} to next annotations (${bucket.anchors.length})`;

  function scrollToClosest() {
    const tags = bucket.anchors.map(anchor => anchor.annotation.$tag);
    onScrollToClosestOffScreenAnchor(tags, direction);
  }

  return (
    <button
      className={classnames('Buckets__button', `Buckets__button--${direction}`)}
      onClick={scrollToClosest}
      title={buttonTitle}
      aria-label={buttonTitle}
    >
      {bucket.anchors.length}
    </button>
  );
}

/**
 * A list of buckets, including up and down navigation (when applicable) and
 * on-screen buckets
 *
 * @param {object} props
 *   @param {Bucket} props.above
 *   @param {Bucket} props.below
 *   @param {Bucket[]} props.buckets
 *   @param {(tags: string[]) => void} props.onFocusAnnotations
 *   @param {(tags: string[], direction: 'down'|'up') => void} props.onScrollToClosestOffScreenAnchor
 *   @param {(tags: string[], toggle: boolean) => void} props.onSelectAnnotations
 */
export default function Buckets({
  above,
  below,
  buckets,
  onFocusAnnotations,
  onScrollToClosestOffScreenAnchor,
  onSelectAnnotations,
}) {
  const showUpNavigation = above.anchors.length > 0;
  const showDownNavigation = below.anchors.length > 0;

  return (
    <ul className="Buckets__list">
      {showUpNavigation && (
        <li className="Buckets__bucket" style={{ top: above.position }}>
          <NavigationBucketButton
            bucket={above}
            direction="up"
            onScrollToClosestOffScreenAnchor={onScrollToClosestOffScreenAnchor}
          />
        </li>
      )}
      {buckets.map((bucket, index) => (
        <li
          className="Buckets__bucket"
          style={{ top: bucket.position }}
          key={index}
        >
          <BucketButton
            bucket={bucket}
            onFocusAnnotations={onFocusAnnotations}
            onSelectAnnotations={onSelectAnnotations}
          />
        </li>
      ))}
      {showDownNavigation && (
        <li className="Buckets__bucket" style={{ top: below.position }}>
          <NavigationBucketButton
            bucket={below}
            direction="down"
            onScrollToClosestOffScreenAnchor={onScrollToClosestOffScreenAnchor}
          />
        </li>
      )}
    </ul>
  );
}
