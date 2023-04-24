import { ProfileIcon } from '@hypothesis/frontend-shared';

import { useSidebarStore } from '../store';
import FilterSelect from './FilterSelect';
import { useUserFilterOptions } from './hooks/use-filter-options';

/**
 * Filters for the Notebook
 */
function NotebookFilters() {
  const store = useSidebarStore();

  const userFilter = store.getFilter('user');
  const userFilterOptions = useUserFilterOptions();

  return (
    <FilterSelect
      defaultOption={{ value: '', display: 'Everybody' }}
      icon={ProfileIcon}
      onSelect={userFilter => store.setFilter('user', userFilter)}
      options={userFilterOptions}
      selectedOption={userFilter}
      title="Filter by user"
    />
  );
}

export default NotebookFilters;
