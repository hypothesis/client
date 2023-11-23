import { Card, CardContent, CloseButton } from '@hypothesis/frontend-shared';
import { useRef } from 'preact/hooks';

import { useSidebarStore } from '../store';
import FilterStatus from './FilterStatus';
import SearchInput from './SearchInput';
import SidebarPanel from './SidebarPanel';

export default function SearchPanel() {
  const store = useSidebarStore();
  const filterQuery = store.filterQuery();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const showFilterStatus = !store.hasDirectLinkedError();

  return (
    <SidebarPanel
      panelName="searchAnnotations"
      variant="custom"
      title="Search annotations"
      initialFocus={inputRef}
      onActiveChanged={active => {
        if (!active) {
          store.clearSelection();
        }
      }}
    >
      <Card>
        <CardContent>
          <div className="flex gap-x-3">
            <SearchInput
              inputRef={inputRef}
              classes="grow"
              query={filterQuery || null}
              onSearch={store.setFilterQuery}
              onKeyDown={e => {
                // Close panel on Escape, which will also clear search
                if (e.key === 'Escape') {
                  store.closeSidebarPanel('searchAnnotations');
                }
              }}
            />
            <CloseButton
              classes="text-[16px] text-grey-6 hover:text-grey-7 hover:bg-grey-3/50"
              title="Close"
              variant="custom"
              size="sm"
            />
          </div>
          {showFilterStatus && <FilterStatus />}
        </CardContent>
      </Card>
    </SidebarPanel>
  );
}
