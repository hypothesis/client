import { Popover } from '@hypothesis/frontend-shared';
import type { PopoverProps } from '@hypothesis/frontend-shared/lib/components/feedback/Popover';
import classnames from 'classnames';

export type UserItem = {
  username: string;
  displayName: string | null;
};

export type MentionSuggestionsPopoverProps = Pick<
  PopoverProps,
  'open' | 'onClose' | 'anchorElementRef'
> & {
  /** List of suggestions to display */
  suggestions: UserItem[];
  /** Index for currently highlighted suggestion */
  highlightedSuggestion: number;
  /** Invoked when a suggestion is selected */
  onSelectSuggestion: (selectedSuggestion: UserItem) => void;
};

/**
 * A Popover component that displays a list of user suggestions.
 */
export default function MentionSuggestionsPopover({
  suggestions,
  onSelectSuggestion,
  highlightedSuggestion,
  ...popoverProps
}: MentionSuggestionsPopoverProps) {
  return (
    <Popover {...popoverProps} classes="p-1">
      <ul
        className="flex-col gap-y-0.5"
        role="listbox"
        aria-orientation="vertical"
      >
        {suggestions.map((s, index) => (
          // These options are indirectly handled via keyboard event
          // handlers in the textarea, hence, we don't want to add keyboard
          // event handlers here, but we want to handle click events.
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <li
            key={s.username}
            className={classnames(
              'flex justify-between items-center',
              'rounded p-2 hover:bg-grey-2',
              {
                'bg-grey-2': highlightedSuggestion === index,
              },
            )}
            onClick={e => {
              e.stopPropagation();
              onSelectSuggestion(s);
            }}
            role="option"
            aria-selected={highlightedSuggestion === index}
          >
            <span className="truncate">{s.username}</span>
            <span className="text-color-text-light">{s.displayName}</span>
          </li>
        ))}
        {suggestions.length === 0 && (
          <li className="italic p-2" data-testid="suggestions-fallback">
            No matches. You can still write the username
          </li>
        )}
      </ul>
    </Popover>
  );
}
