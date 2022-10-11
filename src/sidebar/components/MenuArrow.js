import {
  PointerDownIcon,
  PointerUpIcon,
} from '@hypothesis/frontend-shared/lib/next';
import classnames from 'classnames';

/**
 * @typedef MenuArrowProps
 * @prop {string} [classes]
 * @prop {'up'|'down'} [direction]
 */

/**
 * Render a white-filled "pointer" arrow for use in menus and menu-like
 * elements
 *
 * This will set up absolute positioning for this arrow, but the vertical and
 * horizontal positioning will need to be tuned in the component using the
 * arrow by adding additional utlity classes (`classes` prop here).
 *
 * @param {MenuArrowProps} props
 */
export default function MenuArrow({ classes, direction = 'up' }) {
  const Icon = direction === 'up' ? PointerUpIcon : PointerDownIcon;
  return (
    <Icon
      name="pointer"
      className={classnames(
        'absolute inline z-2 text-grey-3 fill-white',
        classes
      )}
    />
  );
}
