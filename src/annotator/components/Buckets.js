import { LabeledButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

/**
 * @typedef {import('../util/buckets').Bucket} Bucket
 * @typedef {import("preact").ComponentChildren} Children
 */

/**
 * Render a set of buckets in a vertical channel positioned along the edge of
 * the sidebar.
 *
 * @param {object} props
 *   @param {Children} props.children
 */
function BucketList({ children }) {
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
      {children}
    </ul>
  );
}

/**
 * Render a vertically-positioned bucket-list item.
 *
 * @param {object} props
 *  @param {Children} props.children
 *  @param {number} props.topPosition - The vertical top position, in pixels,
 *   for this bucket item relative to the top of the containing BucketList
 */
function BucketItem({ children, topPosition }) {
  return (
    <li
      className={classnames(
        'absolute right-0',
        // Re-enable pointer events, which are disabled on the containing list
        'pointer-events-auto'
      )}
      style={{ top: topPosition }}
    >
      {children}
    </li>
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
  const showUpNavigation = above.tags.size > 0;
  const showDownNavigation = below.tags.size > 0;

  return (
    <BucketList>
      {showUpNavigation && (
        <BucketItem topPosition={above.position}>
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
        </BucketItem>
      )}
      {buckets.map((bucket, index) => (
        <BucketItem topPosition={bucket.position} key={index}>
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
        </BucketItem>
      ))}
      {showDownNavigation && (
        <BucketItem topPosition={below.position}>
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
        </BucketItem>
      )}
    </BucketList>
  );
}
