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
  /** Whether the list of users is currently being loaded */
  loadingUsers: boolean;
  /** List of users to suggest */
  users: UserItem[];
  /** Index for currently highlighted suggestion */
  highlightedSuggestion: number;
  /** Invoked when a user is selected */
  onSelectUser: (selectedSuggestion: UserItem) => void;
  /** Element ID for the user suggestions listbox */
  usersListboxId: string;
};

/**
 * A Popover component that displays a list of user suggestions for @mentions.
 */
export default function MentionSuggestionsPopover({
  loadingUsers,
  users,
  onSelectUser,
  highlightedSuggestion,
  usersListboxId,
  ...popoverProps
}: MentionSuggestionsPopoverProps) {
  return (
    <Popover {...popoverProps} classes="p-1">
      <ul
        className="flex-col gap-y-0.5"
        role="listbox"
        aria-orientation="vertical"
        id={usersListboxId}
      >
        {loadingUsers ? (
          <li
            className="italic p-2"
            data-testid="suggestions-loading-indicator"
          >
            Loading suggestions…
          </li>
        ) : (
          <>
            {users.map((u, index) => (
              // These options are indirectly handled via keyboard event
              // handlers in the textarea, hence, we don't want to add keyboard
              // event handlers here, but we want to handle click events.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={u.username}
                id={`${usersListboxId}-${u.username}`}
                className={classnames(
                  'flex justify-between items-center gap-x-2',
                  'rounded p-2 hover:bg-grey-2',
                  // Adjust line height relative to the font size. This avoids
                  // vertically cropped usernames due to the use of `truncate`.
                  'leading-tight',
                  {
                    'bg-grey-2': highlightedSuggestion === index,
                  },
                )}
                onClick={e => {
                  e.stopPropagation();
                  onSelectUser(u);
                }}
                role="option"
                aria-selected={highlightedSuggestion === index}
              >
                <span className="truncate">{u.username}</span>
                <span className="text-color-text-light">{u.displayName}</span>
              </li>
            ))}
            {users.length === 0 && (
              <li className="italic p-2" data-testid="suggestions-fallback">
                No matches. You can still write the username
              </li>
            )}
          </>
        )}
      </ul>
    </Popover>
  );
}
