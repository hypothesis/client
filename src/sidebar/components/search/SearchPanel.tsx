import { Card, CardContent } from '@hypothesis/frontend-shared';
import { useRef } from 'preact/hooks';

import { useSidebarStore } from '../../store';
import SidebarPanel from '../SidebarPanel';
import FilterControls from './FilterControls';
import SearchField from './SearchField';

export default function SearchPanel() {
  const store = useSidebarStore();
  const filterQuery = store.filterQuery();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasSelection = store.hasSelectedAnnotations();

  const clearSearch = () => {
    store.closeSidebarPanel('searchAnnotations');
  };

  return (
    <SidebarPanel
      panelName="searchAnnotations"
      variant="custom"
      title="Search"
      initialFocus={inputRef}
      onActiveChanged={active => {
        if (!active) {
          store.setFilterQuery(null);
        }
      }}
    >
      <Card>
        <CardContent>
          <div className="flex gap-x-3">
            <SearchField
              inputRef={inputRef}
              classes="grow"
              // Disable the input when there is a selection, as the selection
              // replaces any other filters.
              disabled={hasSelection}
              query={filterQuery || null}
              onClearSearch={clearSearch}
              onSearch={store.setFilterQuery}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  clearSearch();
                }
              }}
            />
          </div>
          <FilterControls />
        </CardContent>
      </Card>
    </SidebarPanel>
  );
}
