import { Icon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import Menu from './Menu';
import MenuItem from './MenuItem';

/**
 * @typedef {import('../store/modules/filters').FilterOption} FilterOption
 */

/**
 * @typedef FilterSelectProps
 * @prop {FilterOption} defaultOption
 * @prop {string} [icon]
 * @prop {(selectedFilter: FilterOption) => void} onSelect
 * @prop {FilterOption[]} options
 * @prop {FilterOption} [selectedOption]
 * @prop {string} title
 */

/**
 * A select-element-like control for selecting one of a defined set of
 * options.
 *
 * @param {FilterSelectProps} props
 */
function FilterSelect({
  defaultOption,
  icon,
  onSelect,
  options,
  selectedOption,
  title,
}) {
  const filterOptions = [defaultOption, ...options];
  const selected = selectedOption ?? defaultOption;

  const menuLabel = (
    <span
      className={classnames(
        // Don't allow the label text to wrap
        'shrink-0 flex items-center gap-x-2',
        'text-color-text font-bold text-lg'
      )}
    >
      {icon && <Icon name={icon} classes="w-4 h-4" />}
      {selected.display}
    </span>
  );

  return (
    <Menu
      label={menuLabel}
      title={title}
      contentClass={classnames(
        // Don't let filter list get too terribly tall. On shorter screens,
        // restrict to 70vh; set a static max-height for taller screens.
        'max-h-[70vh] tall:max-h-[504px] overflow-y-auto'
      )}
    >
      {filterOptions.map(filterOption => (
        <MenuItem
          onClick={() => onSelect(filterOption)}
          key={filterOption.value}
          isSelected={filterOption.value === selected.value}
          label={filterOption.display}
        />
      ))}
    </Menu>
  );
}

export default FilterSelect;
