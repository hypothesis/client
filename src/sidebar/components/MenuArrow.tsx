import { PointerDownIcon, PointerUpIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

type MenuArrowProps = {
  classes?: string;
  direction?: 'up' | 'down';
};

/**
 * Render a white-filled "pointer" arrow for use in menus and menu-like
 * elements
 *
 * This will set up absolute positioning for this arrow, but the vertical and
 * horizontal positioning will need to be tuned in the component using the
 * arrow by adding additional utility classes (`classes` prop here).
 */
export default function MenuArrow({
  classes,
  direction = 'up',
}: MenuArrowProps) {
  const Icon = direction === 'up' ? PointerUpIcon : PointerDownIcon;
  return (
    <Icon
      name="pointer"
      className={classnames(
        'absolute inline z-2 text-grey-3 fill-white',
        classes,
      )}
    />
  );
}
