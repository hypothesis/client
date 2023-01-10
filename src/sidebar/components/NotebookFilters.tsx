import { ProfileIcon } from '@hypothesis/frontend-shared/lib/next';

import { useSidebarStore } from '../store';
import { useUserFilterOptions } from './hooks/use-filter-options';

import FilterSelect from './FilterSelect';

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
