import { createElement } from 'preact';

import useStore from '../store/use-store';

import Menu from './menu';
import MenuItem from './menu-item';
import SvgIcon from '../../shared/components/svg-icon';

/**
 * A drop-down menu of sorting options for a collection of annotations.
 */
export default function SortMenu() {
  const actions = useStore(store => ({
    setSortKey: store.setSortKey,
  }));
  // The currently-applied sort order
  const sortKey = useStore(store => store.getState().selection.sortKey);
  // All available sorting options. These change depending on current
  // "tab" or context.
  const sortKeysAvailable = useStore(store => store.sortKeys());

  const menuItems = sortKeysAvailable.map(sortOption => {
    return (
      <MenuItem
        key={sortOption}
        label={sortOption}
        onClick={() => actions.setSortKey(sortOption)}
        isSelected={sortOption === sortKey}
      >
        {sortOption}
      </MenuItem>
    );
  });

  const menuLabel = (
    <span className="top-bar__menu-label">
      <SvgIcon name="sort" className="top-bar__menu-icon" />
    </span>
  );

  return (
    <div className="sort-menu">
      <Menu
        label={menuLabel}
        title={`Sort by ${sortKey}`}
        align="right"
        menuIndicator={false}
      >
        {menuItems}
      </Menu>
    </div>
  );
}

SortMenu.propTypes = {};
