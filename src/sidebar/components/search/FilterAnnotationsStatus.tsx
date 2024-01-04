import { Button } from '@hypothesis/frontend-shared';

import { useSidebarStore } from '../../store';

type FilterToggleProps = {
  label: string;
  active: boolean;
  setActive: (active: boolean) => void;
};

function FilterToggle({ label, active, setActive }: FilterToggleProps) {
  return (
    <Button onClick={() => setActive(!active)}>
      {label} {active ? 'On' : 'Off'}
    </Button>
  );
}

export default function FilterAnnotationsStatus() {
  const store = useSidebarStore();

  const selectedCount = store.selectedAnnotations().length;
  const hasSelection = selectedCount > 0;

  const focusActive = store.getFocusActive();
  const focusFilters = store.getFocusFilters();

  return (
    <div>
      {hasSelection && (
        <FilterToggle
          label="Selection"
          active={true}
          setActive={() => store.clearSelection()}
        />
      )}
      {focusFilters.user && (
        <FilterToggle
          label="User focus"
          active={focusActive.has('user')}
          setActive={() =>
            store.toggleFocusMode(undefined /* toggle */, 'user')
          }
        />
      )}
      {focusFilters.page && (
        <FilterToggle
          label="Page focus"
          active={focusActive.has('page')}
          setActive={() =>
            store.toggleFocusMode(undefined /* toggle */, 'page')
          }
        />
      )}
      {focusFilters.cfi && (
        <FilterToggle
          label="Section focus"
          active={focusActive.has('cfi')}
          setActive={() => store.toggleFocusMode(undefined /* toggle */, 'cfi')}
        />
      )}
    </div>
  );
}
