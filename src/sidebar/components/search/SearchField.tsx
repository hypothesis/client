import {
  CancelIcon,
  IconButton,
  Input,
  SearchIcon,
  useSyncedRef,
} from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import type { RefObject, JSX } from 'preact';
import { useState } from 'preact/hooks';

import { useShortcut } from '../../../shared/shortcut';
import { useSidebarStore } from '../../store';

export type SearchFieldProps = {
  /** The currently-active filter query */
  query: string | null;

  onClearSearch: () => void;

  /** Disable input editing or submitting the search field. */
  disabled?: boolean;

  /** Callback for when the current filter query changes */
  onSearch: (value: string) => void;

  /** Callback for when a key is pressed in the input itself */
  onKeyDown?: JSX.KeyboardEventHandler<HTMLInputElement>;

  /** The input's ref object, in case it needs to be handled by consumers */
  inputRef?: RefObject<HTMLInputElement | undefined>;

  /** Classes to be added to the outermost element */
  classes?: string | string[];
};

/**
 * An input field for entering a query that filters annotations (in the sidebar)
 * or searches annotations (in the stream/single annotation view).
 */
export default function SearchField({
  classes,
  disabled = false,
  inputRef,
  onClearSearch,
  onKeyDown,
  onSearch,
  query,
}: SearchFieldProps) {
  const store = useSidebarStore();
  const isLoading = store.isLoading();
  const input = useSyncedRef(inputRef);

  // The active filter query from the previous render.
  const [prevQuery, setPrevQuery] = useState(query);

  // The query that the user is currently typing, but may not yet have applied.
  const [pendingQuery, setPendingQuery] = useState(query);

  // As long as this input is mounted, pressing `/` should make it recover focus
  useShortcut('/', e => {
    if (document.activeElement !== input.current) {
      e.preventDefault();
      input.current?.focus();
    }
  });

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

  return (
    <form
      name="searchForm"
      onSubmit={onSubmit}
      className={classnames('space-y-3', classes)}
    >
      <div className="relative">
        <IconButton
          // Vertically center icon on left side of input. Increase the text
          // size to make the icon the same size as the top bar icons.
          classes="absolute left-0 text-[16px] top-[50%] translate-y-[-50%]"
          icon={SearchIcon}
          size="lg"
          title="Search"
          type="submit"
          disabled={disabled}
        />
        <Input
          aria-label="Search annotations"
          classes={classnames(
            'pl-8 pr-8', // Add padding so input does not overlap search/clear buttons.
            'disabled:text-grey-6', // Dim text when input is disabled
            'text-base touch:text-touch-base', // Larger font on touch devices
          )}
          data-testid="search-input"
          dir="auto"
          name="query"
          placeholder={(isLoading && 'Loading…') || 'Search annotations…'}
          disabled={disabled || isLoading}
          elementRef={input}
          value={pendingQuery || ''}
          onInput={(e: Event) =>
            setPendingQuery((e.target as HTMLInputElement).value)
          }
          onKeyDown={onKeyDown}
        />
        {pendingQuery && (
          <IconButton
            classes="absolute right-0 text-[16px] top-[50%] translate-y-[-50%]"
            size="lg"
            icon={CancelIcon}
            data-testid="clear-button"
            title="Clear search"
            onClick={onClearSearch}
            disabled={disabled}
          />
        )}
      </div>
    </form>
  );
}
