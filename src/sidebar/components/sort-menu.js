'use strict';

const { createElement } = require('preact');

const useStore = require('../store/use-store');

const Menu = require('./menu');
const MenuItem = require('./menu-item');

/**
 * A drop-down menu of sorting options for a collection of annotations.
 */
function SortMenu() {
  const actions = useStore(store => ({
    setSortKey: store.setSortKey,
  }));
  // The currently-applied sort order
  const sortKey = useStore(store => store.getState().sortKey);
  // All available sorting options. These change depending on current
  // "tab" or context.
  const sortKeysAvailable = useStore(
    store => store.getState().sortKeysAvailable
  );

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

  const menuLabel = <i className="h-icon-sort top-bar__btn" />;

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

module.exports = SortMenu;
