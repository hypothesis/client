import {
  Button,
  CancelIcon,
  Card,
  CardContent,
  Spinner,
} from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useMemo } from 'preact/hooks';

import { countVisible } from '../helpers/thread';
import { useSidebarStore } from '../store';
import { useRootThread } from './hooks/use-root-thread';

type FilterStatusMessageProps = {
  /**
   * A count of items that are visible but do not match the filters (i.e. items
   * that have been "forced visible" by the user)
   */
  additionalCount: number;

  /** Singular unit of the items being shown, e.g. "result" or "annotation" */
  entitySingular: string;

  /** Plural unit of the items being shown */
  entityPlural: string;

  /** Currently-applied filter query string, if any */
  filterQuery: string | null;

  /** Display name for the user currently focused, if any */
  focusDisplayName?: string | null;

  /**
   * The number of items that match the current filter(s). When searching by
   * query or focusing on a user, this value includes annotations and replies.
   * When there are selected annotations, this number includes only top-level
   * annotations.
   */
  resultCount: number;
};

/**
 * Render status text describing the currently-applied filters.
 */
function FilterStatusMessage({
  additionalCount,
  entitySingular,
  entityPlural,
  filterQuery,
  focusDisplayName,
  resultCount,
}: FilterStatusMessageProps) {
  return (
    <>
      {resultCount > 0 && <span>Showing </span>}
      <span className="whitespace-nowrap font-bold">
        {resultCount > 0 ? resultCount : 'No'}{' '}
        {resultCount === 1 ? entitySingular : entityPlural}
      </span>
      {filterQuery && (
        <span>
          {' '}
          for <span className="break-words">{`'${filterQuery}'`}</span>
        </span>
      )}
      {focusDisplayName && (
        <span>
          {' '}
          by{' '}
          <span className="whitespace-nowrap font-bold">
            {focusDisplayName}
          </span>
        </span>
      )}
      {additionalCount > 0 && (
        <span className="whitespace-nowrap italic text-color-text-light">
          {' '}
          (and {additionalCount} more)
        </span>
      )}
    </>
  );
}

/**
 * Show a description of currently-applied filters and a button to clear the
 * filter(s).
 *
 * There are four filter modes. Exactly one is applicable at any time. In order
 * of precedence:
 *
 * 1. selection
 *    One or more annotations is "selected", either by direct user input or
 *    "direct-linked" annotation(s)
 *
 *    Message formatting:
 *      "[Showing] (No|<resultCount>) annotation[s] [\(and <additionalCount> more\)]"
 *    Button:
 *      "<cancel icon> Show all [\(<totalCount)\)]" - clears the selection
 *
 * 2. query
 *    A search query filter is applied
 *
 *    Message formatting:
 *      "[Showing] (No|<resultCount>) result[s] for '<filterQuery>'
 *       by <focusDisplayName] [\(and <additionalCount> more\)]"
 *    Button:
 *      "<cancel icon> Clear search" - Clears the search query
 *
 * 3. focus
 *    User-focused mode is configured, but may or may not be active/applied.
 *
 *    Message formatting:
 *      "[Showing] (No|<resultCount>) annotation[s] [by <focusDisplayName>]
 *       [\(and <additionalCount> more\)]"
 *    Button:
 *    - If there are no forced-visible threads:
 *      "Show (all|only <focusDisplayName>)" - Toggles the user filter activation
 *    - If there are any forced-visible threads:
 *      "Reset filters" - Clears selection/filters (does not affect user filter activation)
 *
 * 4. null
 *    No filters are applied.
 *
 *   Message formatting:
 *     N/A (but container elements still render)
 *   Button:
 *     N/A
 *
 * This component must render its container elements if no filters are applied
 * ("null" filter mode). This is because the element with `role="status"`
 * needs to be continuously present in the DOM such that dynamic updates to its
 * text content are available to assistive technology.
 * See https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA22
 */
export default function FilterStatus() {
  const store = useSidebarStore();
  const rootThread = useRootThread();

  const annotationCount = store.annotationCount();
  const directLinkedId = store.directLinkedAnnotationId();
  const filterQuery = store.filterQuery();
  const focusState = store.focusState();
  const forcedVisibleCount = store.forcedVisibleThreads().length;
  const selectedCount = store.selectedAnnotations().length;

  const filterMode = useMemo(() => {
    if (selectedCount > 0) {
      return 'selection';
    } else if (filterQuery) {
      return 'query';
    } else if (focusState.configured) {
      return 'focus';
    }
    return null;
  }, [selectedCount, filterQuery, focusState]);

  // Number of items that match the current filters
  const resultCount = useMemo(() => {
    return filterMode === 'selection'
      ? selectedCount
      : countVisible(rootThread) - forcedVisibleCount;
  }, [filterMode, selectedCount, rootThread, forcedVisibleCount]);

  // Number of additional items that are visible but do not match current
  // filters. This can happen when, e.g.:
  //  - A user manually expands a thread that does not match the current
  //    filtering
  //  - A user creates a new annotation when there are applied filters
  const additionalCount = useMemo(() => {
    if (filterMode === 'selection') {
      // Selection filtering deals in top-level annotations only.
      // Compare visible top-level annotations against the count of selected
      // (top-level) annotatinos.
      const visibleAnnotationCount = (rootThread.children || []).filter(
        thread => thread.annotation && thread.visible,
      ).length;
      return visibleAnnotationCount - selectedCount;
    } else {
      return forcedVisibleCount;
    }
  }, [filterMode, forcedVisibleCount, rootThread.children, selectedCount]);

  const buttonText = useMemo(() => {
    if (filterMode === 'selection') {
      // Because of the confusion between counts of entities between selected
      // annotations and filtered annotations, don't display the total number
      // when in user-focus mode because the numbers won't appear to make sense.
      // Don't display total count, either, when viewing a direct-linked annotation.
      const showCount = !focusState.configured && !directLinkedId;
      return showCount ? `Show all (${annotationCount})` : 'Show all';
    } else if (filterMode === 'focus') {
      if (forcedVisibleCount > 0) {
        return 'Reset filters';
      }
      return focusState.active
        ? 'Show all'
        : `Show only ${focusState.displayName}`;
    }
    return 'Clear search';
  }, [
    annotationCount,
    directLinkedId,
    focusState,
    filterMode,
    forcedVisibleCount,
  ]);

  return (
    <div
      // This container element needs to be present at all times but
      // should only be visible when there are applied filters
      className={classnames('mb-3', { 'sr-only': !filterMode })}
      data-testid="filter-status-container"
    >
      <Card>
        <CardContent>
          {store.isLoading() ? (
            <Spinner size="md" />
          ) : (
            <div className="flex items-center justify-center space-x-1">
              <div
                className={classnames(
                  // Setting `min-width: 0` here allows wrapping to work as
                  // expected for long `filterQuery` strings. See
                  // https://css-tricks.com/flexbox-truncated-text/
                  'grow min-w-[0]',
                )}
                role="status"
              >
                {filterMode && (
                  <FilterStatusMessage
                    additionalCount={additionalCount}
                    entitySingular={
                      filterMode === 'query' ? 'result' : 'annotation'
                    }
                    entityPlural={
                      filterMode === 'query' ? 'results' : 'annotations'
                    }
                    filterQuery={filterQuery}
                    focusDisplayName={
                      filterMode !== 'selection' && focusState.active
                        ? focusState.displayName
                        : ''
                    }
                    resultCount={resultCount}
                  />
                )}
              </div>
              {filterMode && (
                <Button
                  onClick={
                    filterMode === 'focus' && !forcedVisibleCount
                      ? () => store.toggleFocusMode()
                      : () => store.clearSelection()
                  }
                  size="sm"
                  title={buttonText}
                  variant="primary"
                  data-testid="clear-button"
                >
                  {/** @TODO: Set `icon` prop in `Button` instead when https://github.com/hypothesis/frontend-shared/issues/675 is fixed*/}
                  {filterMode !== 'focus' && <CancelIcon />}
                  {buttonText}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
