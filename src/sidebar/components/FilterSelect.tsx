import type { IconComponent } from '@hypothesis/frontend-shared/lib/types';
import classnames from 'classnames';

import type { FilterOption } from '../store/modules/filters';
import Menu from './Menu';
import MenuItem from './MenuItem';

type FilterSelectProps = {
  defaultOption: FilterOption;
  icon?: IconComponent;
  onSelect: (selectedFilter: FilterOption) => void;
  options: FilterOption[];
  selectedOption?: FilterOption;
  title: string;
};

/**
 * A select-element-like control for selecting one of a defined set of
 * options.
 */
function FilterSelect({
  defaultOption,
  icon: Icon,
  onSelect,
  options,
  selectedOption,
  title,
}: FilterSelectProps) {
  const filterOptions = [defaultOption, ...options];
  const selected = selectedOption ?? defaultOption;

  const menuLabel = (
    <span
      className={classnames(
        // Don't allow the label text to wrap
        'shrink-0 flex items-center gap-x-2',
        'text-color-text font-bold text-md',
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {selected.display}
    </span>
  );

  return (
    <Menu
      label={menuLabel}
      title={title}
      contentClass={classnames(
        // Don't let filter list get too terribly tall. Where space allows,
        // use `504px` (this odd number is to maximize the likelihood that the
        // overflow cutoff is in the middle of an option, making it more obvious
        // that the list is scrollable), but don't exceed 60vh.
        'max-h-[min(60vh,504px)] overflow-y-auto',
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
