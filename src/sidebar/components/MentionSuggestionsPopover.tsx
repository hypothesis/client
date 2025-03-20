import { Popover } from '@hypothesis/frontend-shared';
import type { PopoverProps } from '@hypothesis/frontend-shared/lib/components/feedback/Popover';
import classnames from 'classnames';

import type { UserItem } from '../helpers/mention-suggestions';
import type { MentionMode } from '../helpers/mentions';

type SuggestionItemProps = {
  user: UserItem;
  usersListboxId: string;
  highlighted: boolean;
  mentionMode: MentionMode;
  onSelectUser: (user: UserItem) => void;
};

function SuggestionItem({
  user,
  usersListboxId,
  highlighted,
  mentionMode,
  onSelectUser,
}: SuggestionItemProps) {
  const showUsername = mentionMode === 'username';

  return (
    // These options are indirectly handled via keyboard event
    // handlers in the textarea, hence, we don't want to add keyboard
    // event handlers here, but we want to handle click events.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <li
      key={user.username}
      id={`${usersListboxId}-${user.username}`}
      className={classnames(
        'flex justify-between items-center gap-x-2 rounded p-2',
        // Adjust line height relative to the font size. This avoids
        // vertically cropped usernames due to the use of `truncate`.
        'leading-tight',
        {
          'hover:bg-grey-1': !highlighted,
          'bg-grey-3': highlighted,
        },
      )}
      onClick={e => {
        e.stopPropagation();
        onSelectUser(user);
      }}
      role="option"
      aria-selected={highlighted}
    >
      {showUsername && (
        <span className="truncate" data-testid={`username-${user.username}`}>
          {user.username}
        </span>
      )}
      <span className={classnames({ 'text-color-text-light': showUsername })}>
        {user.displayName}
      </span>
    </li>
  );
}

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
  /** Determines what information to display in suggestions */
  mentionMode: MentionMode;
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
  mentionMode,
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
              <SuggestionItem
                key={u.username}
                user={u}
                highlighted={highlightedSuggestion === index}
                mentionMode={mentionMode}
                usersListboxId={usersListboxId}
                onSelectUser={onSelectUser}
              />
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
