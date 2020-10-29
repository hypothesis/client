import { createElement } from 'preact';
import classnames from 'classnames';
import propTypes from 'prop-types';
import scrollIntoView from 'scroll-into-view';

import { setHighlightsFocused } from '../highlighter';
import { findClosestOffscreenAnchor } from '../util/buckets';

/**
 * @typedef {import('../../types/annotator').AnnotationData} AnnotationData
 * @typedef {import('../util/buckets').Bucket} Bucket
 */

/**
 * A left-pointing indicator button that, when hovered or clicked, highlights
 * or selects associated annotations.
 *
 * @param {Object} props
 *  @param {Bucket} props.bucket
 *  @param {(annotations: AnnotationData[], toggle: boolean) => any} props.onSelectAnnotations
 */
function BucketButton({ bucket, onSelectAnnotations }) {
  const annotations = bucket.anchors.map(anchor => anchor.annotation);
  const buttonTitle = `Select nearby annotations (${bucket.anchors.length})`;

  function selectAnnotations(event) {
    event.stopPropagation();
    onSelectAnnotations(annotations, event.metaKey || event.ctrlKey);
  }

  function setFocus(focusState) {
    bucket.anchors.forEach(anchor => {
      setHighlightsFocused(anchor.highlights || [], focusState);
    });
  }

  return (
    <button
      className="bucket-button bucket-button--left"
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

BucketButton.propTypes = {
  bucket: propTypes.object.isRequired,
  onSelectAnnotations: propTypes.func.isRequired,
};

/**
 * An up- or down-pointing button that will scroll to the next closest bucket
 * of annotations in the given direction.
 *
 * @param {Object} props
 *   @param {Bucket} props.bucket
 *   @param {'up'|'down'} props.direction
 */
function NavigationBucketButton({ bucket, direction }) {
  const buttonTitle = `Go ${direction} to next annotations (${bucket.anchors.length})`;

  function scrollToClosest(event) {
    event.stopPropagation();
    const closest = findClosestOffscreenAnchor(bucket.anchors, direction);
    if (closest?.highlights?.length) {
      scrollIntoView(closest.highlights[0]);
    }
  }
  return (
    <button
      className={classnames('bucket-button', `bucket-button--${direction}`)}
      onClick={event => scrollToClosest(event)}
      title={buttonTitle}
      aria-label={buttonTitle}
    >
      {bucket.anchors.length}
    </button>
  );
}

NavigationBucketButton.propTypes = {
  bucket: propTypes.object.isRequired,
  direction: propTypes.string,
};

/**
 * A list of buckets, including up and down navigation (when applicable) and
 * on-screen buckets
 *
 * @param {Object} props
 *   @param {Bucket} props.above
 *   @param {Bucket} props.below
 *   @param {Bucket[]} props.buckets
 *   @param {(annotations: AnnotationData[], toggle: boolean) => any} props.onSelectAnnotations
 */
export default function Buckets({
  above,
  below,
  buckets,
  onSelectAnnotations,
}) {
  const showUpNavigation = above.anchors.length > 0;
  const showDownNavigation = below.anchors.length > 0;

  return (
    <ul className="buckets">
      {showUpNavigation && (
        <li className="bucket" style={{ top: above.position }}>
          <NavigationBucketButton bucket={above} direction="up" />
        </li>
      )}
      {buckets.map((bucket, index) => (
        <li className="bucket" style={{ top: bucket.position }} key={index}>
          <BucketButton
            bucket={bucket}
            onSelectAnnotations={onSelectAnnotations}
          />
        </li>
      ))}
      {showDownNavigation && (
        <li className="bucket" style={{ top: below.position }}>
          <NavigationBucketButton bucket={below} direction="down" />
        </li>
      )}
    </ul>
  );
}

Buckets.propTypes = {
  above: propTypes.object.isRequired,
  below: propTypes.object.isRequired,
  buckets: propTypes.array.isRequired,
  onSelectAnnotations: propTypes.func.isRequired,
};
