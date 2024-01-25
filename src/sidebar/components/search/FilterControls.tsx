import {
  Card,
  CardContent,
  Button,
  FileGenericIcon,
  MinusIcon,
  PlusIcon,
  ProfileIcon,
} from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { Fragment } from 'preact';
import type { ComponentChildren } from 'preact';

import { useSidebarStore } from '../../store';

type IconComponent = typeof FileGenericIcon;

type FilterToggleProps = {
  /** A short description of what the filter matches (eg. "Pages 10-20") */
  label: string;

  /**
   * Icon representation of the filter controlled by this toggle, displayed
   * alongside the label.
   */
  icon?: IconComponent;

  /**
   * A longer description of what the filter matches (eg. "Show annotations
   * on pages 10-20").
   */
  description: string;

  /** Is the filter currently active? */
  active: boolean;

  /** Toggle whether the filter is active. */
  setActive: (active: boolean) => void;

  testId?: string;

  disabled?: boolean;
};

/**
 * A switch for toggling whether a filter is active or not.
 */
function FilterToggle({
  label,
  icon: IconComponent,
  description,
  active,
  disabled = false,
  setActive,
  testId,
}: FilterToggleProps) {
  return (
    <Button
      data-testid={testId}
      classes={classnames({
        // Compared to our regular buttons, these have less vertical padding,
        // stronger rounding and slightly thinner text.
        'font-medium rounded-lg py-1': true,
        'text-grey-7 bg-grey-2': !active,
        'text-grey-1 bg-grey-7': active,
        'opacity-50': disabled,
      })}
      disabled={disabled}
      onClick={() => setActive(!active)}
      pressed={active}
      variant="custom"
      title={description}
    >
      {IconComponent && <IconComponent className="w-em h-em" />}
      <span className="max-w-36 truncate">{label}</span>
      <div
        // Vertical divider line between label and active/inactive state.
        // This should fill the button vertically.
        className={classnames({
          'h-[2em] w-[1.5px] -mt-1 -mb-1': true,
          'bg-grey-3': !active,
          'bg-grey-5': active,
        })}
      />
      {active ? (
        <MinusIcon className="w-em h-em" />
      ) : (
        <PlusIcon className="w-em h-em" />
      )}
    </Button>
  );
}

/**
 * Container for the filter controls when it is rendered standalone, outside
 * the search panel.
 */
function CardContainer({ children }: { children: ComponentChildren }) {
  return (
    <div className="mb-3">
      <Card>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

export type FilterControlsProps = {
  /**
   * Whether to render the controls in a card container.
   *
   * The container is rendered by `FilterControls` rather than the parent,
   * because `FilterControls` can conditionally render nothing if no filter is
   * configured.
   */
  withCardContainer?: boolean;
};

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
export default function FilterControls({
  withCardContainer = false,
}: FilterControlsProps) {
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

  const Container = withCardContainer ? CardContainer : Fragment;

  return (
    <Container>
      <div
        className="flex flex-row flex-wrap gap-2 items-center"
        data-testid="filter-controls"
      >
        <b>Filters</b>
        {hasSelection && (
          <FilterToggle
            label={`${selectedCount} selected`}
            description={`Show ${selectedCount} selected annotations`}
            active={true}
            setActive={() => store.clearSelection()}
            testId="selection-toggle"
          />
        )}
        {focusFilters.user && (
          <FilterToggle
            icon={ProfileIcon}
            label={`By ${focusFilters.user.display}`}
            description={`Show annotations by ${focusFilters.user.display}`}
            active={focusActive.has('user')}
            // When a selection exists, it replaces other filters.
            disabled={hasSelection}
            setActive={() => store.toggleFocusMode({ key: 'user' })}
            testId="user-focus-toggle"
          />
        )}
        {focusFilters.page && (
          <FilterToggle
            icon={FileGenericIcon}
            label={`Pages ${focusFilters.page.display}`}
            description={`Show annotations on pages ${focusFilters.page.display}`}
            active={focusActive.has('page')}
            disabled={hasSelection}
            setActive={() => store.toggleFocusMode({ key: 'page' })}
            testId="page-focus-toggle"
          />
        )}
        {focusFilters.cfi && (
          <FilterToggle
            icon={FileGenericIcon}
            label="Selected chapter"
            description="Show annotations on selected book chapter(s)"
            active={focusActive.has('cfi')}
            disabled={hasSelection}
            setActive={() => store.toggleFocusMode({ key: 'cfi' })}
            testId="cfi-focus-toggle"
          />
        )}
      </div>
    </Container>
  );
}
