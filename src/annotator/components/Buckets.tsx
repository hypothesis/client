import { LabeledButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

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
    <ul
      className={classnames(
        // 2020-11-20: Making bucket bar one pixel wider (23px vs 22px) is an
        // interim and pragmatic solution for an apparent glitch on
        // Safari and Chrome. Adding one pixel resolves this issue:
        // https://github.com/hypothesis/client/pull/2750
        'absolute w-[23px] left-[-22px] h-full',
        // The background is set to low opacity when the sidebar is collapsed.
        'bg-grey-2 sidebar-collapsed:bg-black/[.08]',
        // Disable pointer events along the sidebar itself; re-enable them in
        // bucket indicator buttons
        'pointer-events-none'
      )}
    >
      {showUpNavigation && (
        <li
          className="absolute right-0 pointer-events-auto"
          style={{ top: above.position }}
        >
          <LabeledButton
            className={classnames(
              'BucketButton UpBucketButton',
              // Center the button vertically at `above.position` by pulling
              // its top margin up by about half the button's height.
              // This puts it nearer the toolbar's other buttons above the
              // bucket list.
              'right-0 mt-[-11px]'
            )}
            data-testid="up-navigation-button"
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
          </LabeledButton>
        </li>
      )}
      {buckets.map((bucket, index) => (
        <li
          className="absolute right-0 pointer-events-auto"
          key={index}
          style={{ top: bucket.position }}
        >
          <LabeledButton
            className={classnames(
              'BucketButton LeftBucketButton',
              // Center the bucket indicator button vertically on `bucket.position`
              // by pulling it by half the height of the button
              'right-0 mt-[-8px]'
            )}
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
          </LabeledButton>
        </li>
      ))}
      {showDownNavigation && (
        <li
          className="absolute right-0 pointer-events-auto"
          style={{ top: below.position }}
        >
          <LabeledButton
            className="BucketButton DownBucketButton right-0"
            data-testid="down-navigation-button"
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
          </LabeledButton>
        </li>
      )}
    </ul>
  );
}
