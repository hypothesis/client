import {
  IconButton,
  Input,
  SearchIcon,
  Spinner,
} from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import type { RefObject } from 'preact';
import { useCallback, useRef, useState } from 'preact/hooks';

import { useShortcut } from '../../shared/shortcut';
import { isMacOS } from '../../shared/user-agent';
import { useSidebarStore } from '../store';

/**
 * Respond to keydown events on the document (shortcut keys):
 *
 * - Focus the search input when the user presses '/', unless the user is
 *   currently typing in or focused on an input field.
 * - Focus the search input when the user presses CMD-K (MacOS) or CTRL-K
 *   (everyone else)
 * - Restore previous focus when the user presses 'Escape' while the search
 *   input is focused.
 */
function useSearchKeyboardShortcuts(
  searchInputRef: RefObject<HTMLInputElement>
) {
  const prevFocusRef = useRef<HTMLOrSVGElement | null>(null);

  const focusSearch = useCallback(
    (event: KeyboardEvent) => {
      // When user is in an input field, respond to CMD-/CTRL-K keypresses,
      // but ignore '/' keypresses
      if (
        !event.metaKey &&
        !event.ctrlKey &&
        event.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA'].includes(event.target.tagName)
      ) {
        return;
      }
      prevFocusRef.current = document.activeElement as HTMLOrSVGElement | null;
      if (searchInputRef.current) {
        searchInputRef.current?.focus();
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [searchInputRef]
  );

  const restoreFocus = useCallback(() => {
    if (document.activeElement === searchInputRef.current) {
      if (prevFocusRef.current) {
        prevFocusRef.current.focus();
        prevFocusRef.current = null;
      }
      searchInputRef.current?.blur();
    }
  }, [searchInputRef]);

  const modifierKey = isMacOS() ? 'meta' : 'ctrl';

  useShortcut('/', focusSearch);
  useShortcut(`${modifierKey}+k`, focusSearch);
  useShortcut('escape', restoreFocus);
}

export type SearchInputProps = {
  /**
   * When true, the input field is always shown. If false, the input field is
   * only shown if the query is non-empty.
   */
  alwaysExpanded?: boolean;

  /** The currently-active filter query */
  query: string | null;

  /** Callback for when the current filter query changes */
  onSearch: (value: string) => void;
};

/**
 * An input field in the top bar for entering a query that filters annotations
 * (in the sidebar) or searches annotations (in the stream/single annotation
 * view).
 *
 * This component also renders a eloading spinner to indicate when the client
 * is fetching for data from the API or in a "loading" state for any other
 * reason.
 */
export default function SearchInput({
  alwaysExpanded,
  query,
  onSearch,
}: SearchInputProps) {
  const store = useSidebarStore();
  const isLoading = store.isLoading();
  const input = useRef<HTMLInputElement | null>(null);
  useSearchKeyboardShortcuts(input);

  // The active filter query from the previous render.
  const [prevQuery, setPrevQuery] = useState(query);

  // The query that the user is currently typing, but may not yet have applied.
  const [pendingQuery, setPendingQuery] = useState(query);

  const onSubmit = (e: Event) => {
    e.preventDefault();
    if (input.current?.value || prevQuery) {
      // Don't set an initial empty query, but allow a later empty query to
      // clear `prevQuery`
      onSearch(input.current?.value ?? '');
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
      <Input
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
            // Make the 0-padding rule `!important` so that it doesn't get
            // superseded by `Input` padding
            'max-w-0 !p-0': !isExpanded,
            // However, if the input it focused, it is visually expanded, and
            // needs that padding back
            'focus:!p-1.5': true,
            // Make the input have dimensions and padding when focused or
            // expanded. The left-margin is to make room for the focus ring of
            // the search icon-button when navigating by keyboard. Set a
            // max-width to allow transition to work when exact width is unknown.
            'focus:max-w-[150px] focus:ml-[2px]': true,
            'max-w-[150px] p-1.5 ml-[2px]': isExpanded,
          },
          'transition-[max-width] duration-300 ease-out'
        )}
        data-testid="search-input"
        dir="auto"
        type="text"
        name="query"
        placeholder={(isLoading && 'Loading…') || 'Search…'}
        disabled={isLoading}
        elementRef={input}
        value={pendingQuery || ''}
        onInput={(e: Event) =>
          setPendingQuery((e.target as HTMLInputElement).value)
        }
      />
      {!isLoading && (
        <div className="order-0">
          <IconButton
            icon={SearchIcon}
            onClick={() => input.current?.focus()}
            size="xs"
            title="Search annotations"
          />
        </div>
      )}

      {isLoading && <Spinner />}
    </form>
  );
}
