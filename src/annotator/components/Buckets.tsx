import { PointerButton } from '@hypothesis/frontend-shared';

import type { Bucket } from '../util/buckets';

export type BucketsProps = {
  /**
   * Bucket containing the $tags of any annotations that are offscreen above
   * the current viewport. If the set of $tags is non-empty, up navigation
   * will be rendered.
   */
  above: Bucket;

  /**
   * Bucket containing the $tags of any annotations that are offscreen below
   * the current viewport. If the set of $tags is non-empty, down navigation
   * will be rendered.
   */
  below: Bucket;

  /**
   * A list of buckets visible on-screen. A left-pointing arrow will be
   * rendered for each bucket.
   */
  buckets: Bucket[];
  onFocusAnnotations: ($tags: string[]) => void;
  onScrollToClosestOffScreenAnchor: (
    $tags: string[],
    direction: 'down' | 'up'
  ) => void;
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
  onScrollToClosestOffScreenAnchor,
  onSelectAnnotations,
}: BucketsProps) {
  const showUpNavigation = above.tags.size > 0;
  const showDownNavigation = below.tags.size > 0;

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
            onClick={() =>
              onScrollToClosestOffScreenAnchor([...above.tags], 'up')
            }
            onBlur={() => onFocusAnnotations([])}
            onFocus={() => onFocusAnnotations([...above.tags])}
            onMouseEnter={() => onFocusAnnotations([...above.tags])}
            onMouseOut={() => onFocusAnnotations([])}
            title={`Go up to next annotations (${above.tags.size})`}
          >
            {above.tags.size}
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
                [...bucket.tags],
                event.metaKey || event.ctrlKey
              )
            }
            onBlur={() => onFocusAnnotations([])}
            onFocus={() => onFocusAnnotations([...bucket.tags])}
            onMouseEnter={() => onFocusAnnotations([...bucket.tags])}
            onMouseOut={() => onFocusAnnotations([])}
            title={`Select nearby annotations (${bucket.tags.size})`}
          >
            {bucket.tags.size}
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
            onClick={() =>
              onScrollToClosestOffScreenAnchor([...below.tags], 'down')
            }
            onBlur={() => onFocusAnnotations([])}
            onFocus={() => onFocusAnnotations([...below.tags])}
            onMouseEnter={() => onFocusAnnotations([...below.tags])}
            onMouseOut={() => onFocusAnnotations([])}
            title={`Go up to next annotations (${below.tags.size})`}
          >
            {below.tags.size}
          </PointerButton>
        </li>
      )}
    </ul>
  );
}
