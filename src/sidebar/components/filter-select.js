import { createElement } from 'preact';
import propTypes from 'prop-types';

import Menu from './menu';
import MenuItem from './menu-item';
import SvgIcon from '../../shared/components/svg-icon';

/**
 * @typedef {import('../store/modules/filters').FilterOption} FilterOption
 */

/**
 * @typedef FilterSelectProps
 * @prop {FilterOption} defaultOption
 * @prop {string} [icon]
 * @prop {(selectedFilter: FilterOption) => any} onSelect
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
    <span className="filter-select__menu-label">
      {icon && <SvgIcon name={icon} className="filter-select__menu-icon" />}
      {selected.display}
    </span>
  );

  return (
    <Menu label={menuLabel} title={title}>
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

FilterSelect.propTypes = {
  defaultOption: propTypes.object,
  icon: propTypes.string,
  onSelect: propTypes.func,
  options: propTypes.array,
  selectedOption: propTypes.object,
  title: propTypes.string,
};

export default FilterSelect;
