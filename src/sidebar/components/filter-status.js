import { createElement } from 'preact';

import { countVisible } from '../util/thread';

import Button from './Button';

import useRootThread from './hooks/use-root-thread';
import useStore from '../store/use-store';

/**
 * Render information about the currently-applied filters and allow the
 * user to clear filters or toggle user-focus mode on and off
 *
 * When any filtering is applied, we are in one of 3 mutually-exclusive filtering
 * "modes". In any mode, we display descriptive text about what the user
 * is looking at, and present one button to take action on the current filtering
 * state:
 * - selection: One or more annotations have been selected in the document by
 *   the user, or we're looking at a direct-linked annotation. Button clears
 *   the selection. This mode supersedes all others (i.e. other filters ignored).
 * - query: There is a user-entered filter query. It can "stack" with user-focus.
 *    Button clears the selection (query, etc.), but will leave user-focus mode
 *    intact.
 * - focus: Neither of the above two modes apply and user-focus mode is
 *   configured (it may or may not be active). Button toggles activation of
 *   user-focus mode.
 *
 * Descriptive text about the filter status and annotations follows the
 * pattern:
 *
 *   [Showing] (<resultCount>|No) (annotation[s]|result[s]) [for <filterQuery>]
 *   [by <focusedUser>] [\(and <forcedCount> more\)]`
 */
export default function FilterStatus() {
  const rootThread = useRootThread();

  const filterState = useStore(store => store.filterState());

  // The total count of all of the annotations in the store—may differ from
  // the number of annotations in the thread and the number of visible annotations
  const totalCount = useStore(store => store.annotationCount());

  // Actions
  const clearSelection = useStore(store => store.clearSelection);
  const toggleFocusMode = useStore(store => store.toggleFocusMode);

  const filterMode = (state => {
    if (state.selectedCount > 0) {
      return 'selection';
    } else if (state.filterQuery) {
      return 'query';
    } else if (state.focusConfigured) {
      return 'focus';
    }
    return null;
  })(filterState);

  if (!filterMode) {
    // Nothing to do here
    return null;
  }

  // Some threads in the `visibleCount` may have been "forced visible" by
  // the user by clicking "Show x more in conversation" — subtract these
  // forced-visible threads out to get a correct count of actual filter matches.
  // In 'selection' mode, rely on the count of selected annotations
  const visibleCount = countVisible(rootThread);
  const resultCount =
    filterMode === 'selection'
      ? filterState.selectedCount
      : visibleCount - filterState.forcedVisibleCount;

  let buttonText;
  switch (filterMode) {
    case 'selection':
      // In user-focus mode, displayed counts include annotations AND replies,
      // while `totalCount` only includes top-level annotations, so that count
      // doesn't make sense in user-focus mode
      buttonText = filterState.focusConfigured
        ? 'Show all'
        : `Show all (${totalCount})`;
      break;
    case 'focus':
      if (!filterState.forcedVisibleCount) {
        buttonText = filterState.focusActive
          ? 'Show all'
          : `Show only ${filterState.focusDisplayName}`;
      } else {
        // When user focus is applied and there are some forced-visible threads,
        // this special case applies. The button will clear force-visible threads
        // but leave user focus intact
        buttonText = 'Reset filters';
      }
      break;
    case 'query':
    default:
      buttonText = 'Clear search';
      break;
  }

  const buttonProps = {
    buttonText,
    onClick: () => clearSelection(),
    icon: filterMode !== 'focus' ? 'cancel' : null,
  };

  // In most cases, the action button will clear the current (filter) selection,
  // but when in 'focus' mode alone, it will toggle activation of the focus
  if (filterMode === 'focus' && !filterState.forcedVisibleCount) {
    buttonProps.onClick = () => toggleFocusMode();
  }

  return (
    <div className="filter-status">
      <div className="u-layout-row--align-center">
        <div className="filter-status__text">
          {visibleCount > 0 && <span>Showing</span>}{' '}
          <span className="filter-facet">
            {resultCount > 0 ? resultCount : 'No'}{' '}
            {filterMode === 'query' ? 'result' : 'annotation'}
            {resultCount !== 1 ? 's' : '' /* pluralize */}
          </span>{' '}
          {filterMode === 'query' && (
            <span>
              for{' '}
              <span className="filter-facet--pre">
                &#39;{filterState.filterQuery}&#39;
              </span>
            </span>
          )}{' '}
          {filterMode !== 'selection' && filterState.focusActive && (
            <span>
              by{' '}
              <span className="filter-facet">
                {filterState.focusDisplayName}
              </span>
            </span>
          )}{' '}
          {filterState.forcedVisibleCount > 0 && (
            <span className="filter-facet--muted">
              (and {filterState.forcedVisibleCount} more)
            </span>
          )}
        </div>
        <div>
          <Button className="button--primary" {...buttonProps} />
        </div>
      </div>
    </div>
  );
}

FilterStatus.propTypes = {};
