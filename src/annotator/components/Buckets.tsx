import { PointerButton } from '@hypothesis/frontend-shared';

import type { Bucket } from '../util/buckets';

export type BucketsProps = {
  /**
   * Bucket containing anchors that are above the bucket bar. If non-empty,
   * an "Up" bucket will be rendered.
   */
  above: Bucket;

  /**
   * Bucket containing anchors that are below the bucket bar. If non-empty,
   * a "Down" bucket will be rendered.
   */
  below: Bucket;

  /**
   * A list of buckets visible on-screen. A left-pointing arrow will be
   * rendered for each bucket.
   */
  buckets: Bucket[];
  onFocusAnnotations: ($tags: string[]) => void;
  onScrollToAnnotation: ($tag: string) => void;
  onSelectAnnotations: ($tags: string[], toggle: boolean) => void;
};

/**
 * A list of buckets, including up and down navigation (when applicable) and
 * on-screen buckets
 *
 * This component and its buttons are sized with absolute units such that they
 * don't scale with changes to the host page's root font size. They will still
 * properly scale with user/browser zooming.
 */
export default function Buckets({
  above,
  below,
  buckets,
  onFocusAnnotations,
  onScrollToAnnotation,
  onSelectAnnotations,
}: BucketsProps) {
  const showUpNavigation = above.anchors.length > 0;
  const showDownNavigation = below.anchors.length > 0;
  const bucketTags = (b: Bucket) => b.anchors.map(a => a.tag);

  return (
    <ul className="relative">
      {showUpNavigation && (
        <li
          className="absolute right-0 pointer-events-auto mt-[-11px]"
          style={{ top: above.position }}
        >
          <PointerButton
            data-testid="up-navigation-button"
            direction="up"
            onClick={() => {
              const anchors = [...above.anchors].sort(
                (a, b) => a.bottom - b.bottom,
              );
              const bottomAnchor = anchors[anchors.length - 1];
              onScrollToAnnotation(bottomAnchor.tag);
            }}
            onBlur={() => onFocusAnnotations([])}
            onFocus={() => onFocusAnnotations(bucketTags(above))}
            onMouseEnter={() => onFocusAnnotations(bucketTags(above))}
            onMouseOut={() => onFocusAnnotations([])}
            title={`Go up to next annotations (${above.anchors.length})`}
          >
            {above.anchors.length}
          </PointerButton>
        </li>
      )}
      {buckets.map((bucket, index) => (
        <li
          className="absolute right-0 pointer-events-auto mt-[-8px]"
          key={index}
          style={{ top: bucket.position }}
        >
          <PointerButton
            direction="left"
            onClick={event =>
              onSelectAnnotations(
                bucketTags(bucket),
                event.metaKey || event.ctrlKey,
              )
            }
            onBlur={() => onFocusAnnotations([])}
            onFocus={() => onFocusAnnotations(bucketTags(bucket))}
            onMouseEnter={() => onFocusAnnotations(bucketTags(bucket))}
            onMouseOut={() => onFocusAnnotations([])}
            title={`Select nearby annotations (${bucket.anchors.length})`}
          >
            {bucket.anchors.length}
          </PointerButton>
        </li>
      ))}
      {showDownNavigation && (
        <li
          className="absolute right-0 pointer-events-auto"
          style={{ top: below.position }}
        >
          <PointerButton
            data-testid="down-navigation-button"
            direction="down"
            onClick={() => {
              const anchors = [...below.anchors].sort((a, b) => a.top - b.top);
              const topAnchor = anchors[0];
              onScrollToAnnotation(topAnchor.tag);
            }}
            onBlur={() => onFocusAnnotations([])}
            onFocus={() => onFocusAnnotations(bucketTags(below))}
            onMouseEnter={() => onFocusAnnotations(bucketTags(below))}
            onMouseOut={() => onFocusAnnotations([])}
            title={`Go up to next annotations (${below.anchors.length})`}
          >
            {below.anchors.length}
          </PointerButton>
        </li>
      )}
    </ul>
  );
}
