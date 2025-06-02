import { Popover } from '@hypothesis/frontend-shared';
import type { PopoverProps } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import type { UserItem } from '../helpers/mention-suggestions';
import type { MentionMode } from '../helpers/mentions';

type SuggestionItemProps = {
  user: UserItem;
  usersListboxId: string;
  highlighted: boolean;
  mentionMode: MentionMode;
  onSelect: () => void;
  onHighlight: () => void;
};

function SuggestionItem({
  user,
  usersListboxId,
  highlighted,
  mentionMode,
  onSelect,
  onHighlight,
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
          'bg-grey-2': highlighted,
        },
      )}
      onClick={e => {
        e.stopPropagation();
        onSelect();
      }}
      // Using onMouseMove instead of onMouseEnter, so that if the mouse is
      // already hovering this item, and then we change the highlighted
      // suggestion via arrow keys, when the mouse is moved again, this item
      // becomes highlighted without having to first leave it and enter again.
      onMouseMove={onHighlight}
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
  /** Invoked when currently highlighted suggestion index is changed */
  onHighlightSuggestion: (index: number) => void;
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
  onHighlightSuggestion,
  usersListboxId,
  mentionMode,
  ...popoverProps
}: MentionSuggestionsPopoverProps) {
  return (
    <Popover
      {...popoverProps}
      classes={classnames('p-1', [
        // Popovers have a default max-h-80, which only fits a bit more than 9
        // suggestions at their current height.
        // Since we cap at 10 suggestions, increasing this max height prevents
        // scrollbars to appear.
        '!max-h-96',
      ])}
    >
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
                onSelect={() => onSelectUser(u)}
                onHighlight={() => onHighlightSuggestion(index)}
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
