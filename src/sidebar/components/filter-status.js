import { createElement } from 'preact';

import { countVisible } from '../util/thread';

import Button from './button';

import useRootThread from './hooks/use-root-thread';
import useStore from '../store/use-store';

/**
 * Render information about the currently-applied filters and allow the
 * user to clear filters or toggle user-focus mode on and off
 *
 * When any filtering is applied, we are in one of 3 mutually-exclusive filtering
 * "modes". In any mode, we display descriptive text about what the user
 * is looking at, and present one button to take action on the current filtering
 * state.
 *
 * Descriptive text about the filter status and annotations follows the
 * pattern:
 *
 *   [Showing] (<resultCount>|No) (annotation[s]|result[s]) [for <filterQuery>]
 *   [by <focusedUser>] [\(and <forcedCount> more\)]`
 *
 * Modes are as follows:
 *
 * - selection: One of more annotations have been selected in the document by
 *   the user, or there is a direct-linked annotation active. Other filters
 *   will be ignored and it supersedes other modes.
 *    - Text:
 *      "Showing <selectedCount> annotation[s]"
 *    - Button:
 *      "<cancelIcon> Show all [\(<totalCount>\)]"
 *      Action: clears selection
 *      (`totalCount` is not displayed if user focus is configured)
 *
 * - query: There is a user-entered filter query, and potentially other filters
 *   (e.g. user-focus).
 *    - Text:
 *    "[Showing] (No|<resultCount>) result[s] for '<filterQuery>'
 *    [by <focusDisplayName>] [\(and <forcedVisibleCount> more\)]"
 *    - Button:
 *      "<cancelIcon> Clear search"
 *      Action: clears selection/filters (leaves user focus state intact)
 *
 * - focusOnly: Neither of the above two modes apply and user-focus is
 *   configured.
 *   - Text:
 *     "[Showing] (No|<resultCount>) annotation[s]
 *     by <focusDisplayName> [\(and <forcedVisibleCount> more\)]"
 *   - Button:
 *     "Show only <focusDisplayName>" (when user-focus mode not active)
 *     "Show all" (when user-focus mode active)
 *     "Reset filters" (When user-focus mode is active
 *                      and threads are force-expanded)
 *     Action: Toggle user focus
 *
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

  const filterMode = (() => {
    if (filterState.selectedCount > 0) {
      return 'selection';
    } else if (filterState.filterQuery) {
      return 'query';
    } else if (filterState.focusConfigured) {
      return 'focusOnly';
    }
    return null;
  })();

  if (!filterMode) {
    // Nothing to do here
    return null;
  }

  // Some threads in the `visibleCount` may have been "forced visible" by
  // the user by clicking "Show x more in conversation" — subtract these
  // forced-visible threads out to get a correct count of actual filter matches.
  // In 'selection' mode, rely on the count of selected annotations
  const visibleCount = countVisible(rootThread);
  const visibleAnnotationCount = rootThread.children.filter(
    thread => thread.annotation && thread.visible
  ).length;

  const resultCount =
    filterMode === 'selection'
      ? filterState.selectedCount
      : visibleCount - filterState.forcedVisibleCount;

  const additionalCount =
    filterMode === 'selection'
      ? visibleAnnotationCount - resultCount
      : filterState.forcedVisibleCount;

  let buttonText;
  switch (filterMode) {
    case 'selection':
      // If user focus is configured, displayed counts include annotations AND replies,
      // while `totalCount` only includes top-level annotations, so that count
      // doesn't make sense when user focus is involved in the mix
      buttonText = filterState.focusConfigured
        ? 'Show all'
        : `Show all (${totalCount})`;
      break;
    case 'focusOnly':
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
      buttonText = 'Clear search';
      break;
  }

  const buttonProps = {
    buttonText,
    onClick: () => clearSelection(),
  };

  if (filterMode !== 'focusOnly') {
    buttonProps.icon = 'cancel';
  }

  // In most cases, the action button will clear the current (filter) selection,
  // but when in 'focusOnly' mode, it will toggle activation of the focus
  if (filterMode === 'focusOnly' && !additionalCount) {
    buttonProps.onClick = () => toggleFocusMode();
  }

  return (
    <div className="filter-status">
      <div className="u-layout-row--align-center">
        <div className="filter-status__text">
          {resultCount > 0 && <span>Showing </span>}
          <span className="filter-facet">
            {resultCount > 0 ? resultCount : 'No'}{' '}
            {filterMode === 'selection' && additionalCount > 0
              ? 'selected '
              : ''}
            {filterMode === 'query' ? 'result' : 'annotation'}
            {resultCount !== 1 ? 's' : '' /* pluralize */}
          </span>
          {filterMode === 'query' && (
            <span>
              {' '}
              for{' '}
              <span className="filter-facet--pre">
                &#39;{filterState.filterQuery}&#39;
              </span>
            </span>
          )}
          {filterMode !== 'selection' && filterState.focusActive && (
            <span>
              {' '}
              by{' '}
              <span className="filter-facet">
                {filterState.focusDisplayName}
              </span>
            </span>
          )}
          {additionalCount > 0 && (
            <span className="filter-facet--muted">
              {' '}
              (and {additionalCount} more)
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
