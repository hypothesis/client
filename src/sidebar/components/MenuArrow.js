import { Icon } from '@hypothesis/frontend-shared';
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
 * @param {MenuArrowProps} props
 */
export default function MenuArrow({ classes, direction = 'up' }) {
  return (
    <Icon
      name="pointer"
      classes={classnames(
        'absolute inline z-2 text-grey-3 fill-white',
        { 'rotate-180': direction === 'down' },
        classes
      )}
    />
  );
}
