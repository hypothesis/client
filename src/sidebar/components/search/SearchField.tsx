import {
  IconButton,
  Input,
  InputGroup,
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
  query,
  onSearch,
  inputRef,
  classes,
  onKeyDown,
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
      <InputGroup>
        <Input
          aria-label="Search annotations"
          classes={classnames(
            'text-base p-1.5',
            'transition-[max-width] duration-300 ease-out',
          )}
          data-testid="search-input"
          dir="auto"
          name="query"
          placeholder={(isLoading && 'Loading…') || 'Search annotations…'}
          disabled={isLoading}
          elementRef={input}
          value={pendingQuery || ''}
          onInput={(e: Event) =>
            setPendingQuery((e.target as HTMLInputElement).value)
          }
          onKeyDown={onKeyDown}
        />
        <IconButton
          icon={SearchIcon}
          title="Search"
          type="submit"
          variant="dark"
        />
      </InputGroup>
    </form>
  );
}
