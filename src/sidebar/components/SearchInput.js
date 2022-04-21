import { IconButton, Spinner, TextInput } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useRef, useState } from 'preact/hooks';

import { useStoreProxy } from '../store/use-store';

/**
 * @typedef SearchInputProps
 * @prop {boolean} [alwaysExpanded] -
 *   If true, the input field is always shown. If false, the input field is only shown
 *   if the query is non-empty.
 * @prop {string|null} query - The currently active filter query
 * @prop {(value: string) => void} onSearch -
 *   Callback to invoke when the current filter query changes
 */

/**
 * An input field in the top bar for entering a query that filters annotations
 * (in the sidebar) or searches annotations (in the stream/single annotation
 * view).
 *
 * This component also renders a eloading spinner to indicate when the client
 * is fetching for data from the API or in a "loading" state for any other
 * reason.
 *
 * @param {SearchInputProps} props
 */
export default function SearchInput({ alwaysExpanded, query, onSearch }) {
  const store = useStoreProxy();
  const isLoading = store.isLoading();
  const input = /** @type {{ current: HTMLInputElement }} */ (useRef());

  // The active filter query from the previous render.
  const [prevQuery, setPrevQuery] = useState(query);

  // The query that the user is currently typing, but may not yet have applied.
  const [pendingQuery, setPendingQuery] = useState(query);

  /** @param {Event} e */
  const onSubmit = e => {
    e.preventDefault();
    if (input.current.value || prevQuery) {
      // Don't set an initial empty query, but allow a later empty query to
      // clear `prevQuery`
      onSearch(input.current.value);
    }
  };

  // When the active query changes outside of this component, update the input
  // field to match. This happens when clearing the current filter for example.
  if (query !== prevQuery) {
    setPendingQuery(query);
    setPrevQuery(query);
  }

  const isExpanded = alwaysExpanded || query;

  return (
    <form
      action="#"
      className={classnames(
        // Relative positioning allows the search input to expand without
        // pushing other things in the top bar to the right when there is
        // a long group name (input will slide "over" end of group name in menu)
        'relative',
        'flex items-center',
        // Having a nearly opaque white background makes the collision with
        // group names to the left a little less jarring. Full white on hover
        // to fully remove the distraction.
        'bg-white/90 hover:bg-white transition-colors'
      )}
      name="searchForm"
      onSubmit={onSubmit}
    >
      <TextInput
        aria-label="Search"
        classes={classnames(
          // This element is ordered second in the flex layout (appears to the
          // right of the search icon-button) but having it first in source
          // ensures it is first in keyboard tab order
          'order-1',
          'text-base',
          {
            // Borders must be turned off when input is not expanded or focused
            // to ensure it has 0 dimensions
            'border-0': !isExpanded,
            // The goal is to have a one-pixel grey border when `isExpanded`.
            // Setting it both on focus (when it will be ofuscated by the focus
            // ring) and when expanded prevents any change in the input's size
            // when moving between the two states.
            'focus:border': true,
            border: isExpanded,
          },
          {
            // Make the input dimensionless when not expanded (or focused)
            'max-w-0 p-0': !isExpanded,
            // Make the input have dimensions and padding when focused or
            // expanded. The left-margin is to make room for the focus ring of
            // the search icon-button when navigating by keyboard. Set a
            // max-width to allow transition to work when exact width is unknown.
            'focus:max-w-[150px] focus:p-1.5 focus:ml-[2px]': true,
            'max-w-[150px] p-1.5 ml-[2px]': isExpanded,
          },
          'transition-[max-width] duration-300 ease-out'
        )}
        dir="auto"
        type="text"
        name="query"
        placeholder={(isLoading && 'Loading…') || 'Search…'}
        disabled={isLoading}
        inputRef={input}
        value={pendingQuery || ''}
        onInput={e =>
          setPendingQuery(/** @type {HTMLInputElement} */ (e.target).value)
        }
      />
      {!isLoading && (
        <div className="order-0">
          <IconButton
            icon="search"
            onClick={() => input.current.focus()}
            size="small"
            title="Search annotations"
          />
        </div>
      )}

      {isLoading && <Spinner size="small" />}
    </form>
  );
}
