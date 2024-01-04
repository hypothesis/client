import { Button } from '@hypothesis/frontend-shared';

import { useSidebarStore } from '../../store';

type FilterToggleProps = {
  /** A short description of what the filter matches (eg. "Pages 10-20") */
  label: string;

  /**
   * A longer description of what the filter matches (eg. "Show annotations
   * on pages 10-20").
   */
  description: string;

  /** Is the filter currently active? */
  active: boolean;

  /** Toggle whether the filter is active. */
  setActive: (active: boolean) => void;
};

/**
 * A switch for toggling whether a filter is active or not.
 */
function FilterToggle({
  label,
  description,
  active,
  setActive,
}: FilterToggleProps) {
  return (
    <Button
      onClick={() => setActive(!active)}
      variant={active ? 'primary' : 'secondary'}
      title={description}
    >
      {label}
    </Button>
  );
}

/**
 * Displays the state of various filters and allows the user to toggle them.
 *
 * This includes:
 *
 *  - Focus filters which show anotations from particular user, page range
 *    etc.
 *  - Selection state
 *
 * This doesn't include the state of other layers of filters which have their
 * own UI controls such as search or the annotation type tabs.
 */
export default function FilterAnnotationsStatus() {
  const store = useSidebarStore();

  const selectedCount = store.selectedAnnotations().length;
  const hasSelection = selectedCount > 0;

  const focusActive = store.getFocusActive();
  const focusFilters = store.getFocusFilters();

  // Are any focus filters configured?
  const hasFocusFilters = Object.keys(focusFilters).length > 0;

  const hasFilters = hasSelection || hasFocusFilters;

  // When there are no active filters, remove the container so its padding
  // doesn't unnecessarily take up empty space.
  if (!hasFilters) {
    return null;
  }

  return (
    <div className="flex flex-row gap-x-2 py-2" data-testid="filter-controls">
      {hasSelection && (
        <FilterToggle
          label={`${selectedCount} selected`}
          description={`Showing ${selectedCount} selected annotations`}
          active={true}
          setActive={() => store.clearSelection()}
        />
      )}
      {focusFilters.user && (
        <FilterToggle
          label={`By ${focusFilters.user.display}`}
          description={`Showing annotations by ${focusFilters.user.display}`}
          active={focusActive.has('user')}
          setActive={() => store.toggleFocusMode({ key: 'user' })}
        />
      )}
      {focusFilters.page && (
        <FilterToggle
          label={`Pages ${focusFilters.page.display}`}
          description={`Showing annotations on pages ${focusFilters.page.display}`}
          active={focusActive.has('page')}
          setActive={() => store.toggleFocusMode({ key: 'page' })}
        />
      )}
      {focusFilters.cfi && (
        <FilterToggle
          label="Section focus"
          description="Showing annotations on selected book chapter(s)"
          active={focusActive.has('cfi')}
          setActive={() => store.toggleFocusMode({ key: 'cfi' })}
        />
      )}
    </div>
  );
}
