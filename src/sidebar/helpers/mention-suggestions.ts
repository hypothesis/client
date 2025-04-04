import type { FocusedGroupMembers } from '../store/modules/groups';
import type { MentionMode } from './mentions';

export type UserItem = {
  /** User ID in the form of acct:[username]@[authority] */
  userid: string;
  username: string;
  displayName: string | null;
};

export type UsersForMentions =
  | { status: 'loading' }
  | { status: 'loaded'; users: UserItem[] };

export type CombineUsersOptions = {
  usersWhoAnnotated: UserItem[];
  usersWhoWereMentioned: UserItem[];
  focusedGroupMembers: FocusedGroupMembers;
  mentionMode: MentionMode;
};

/**
 * Merge, deduplicate and sort a list of users to be used for mention suggestions.
 * The list includes both users who already annotated the document, and members
 * of the currently focused group.
 *
 * The list is sorted differently depending on the mentionMode:
 * - `username`: By username only, as it's a unique field
 * - `display-name`: By display name first, then by username, in case of same
 *                   display name
 *
 * We won't return any users if the group members are being loaded, preventing a
 * mix of some already-fetched users and a loading indicator from being shown at
 * the same time.
 */
export function combineUsersForMentions({
  usersWhoAnnotated,
  usersWhoWereMentioned,
  focusedGroupMembers,
  mentionMode,
}: CombineUsersOptions): UsersForMentions {
  if (focusedGroupMembers.status !== 'loaded') {
    return { status: 'loading' };
  }

  // Once group members are loaded, we can merge them with the users who
  // already annotated the document, then deduplicate and sort the result.
  const focusedGroupUsers: UserItem[] = focusedGroupMembers.members.map(
    ({ userid, username, display_name: displayName }) => ({
      userid,
      username,
      displayName,
    }),
  );
  const addedUserIds = new Set<string>();
  const users = [
    ...usersWhoAnnotated,
    ...usersWhoWereMentioned,
    ...focusedGroupUsers,
  ]
    .filter(({ userid }) => {
      const usernameAlreadyAdded = addedUserIds.has(userid);
      addedUserIds.add(userid);
      return !usernameAlreadyAdded;
    })
    .sort((a, b) => {
      if (mentionMode === 'username') {
        return a.username.localeCompare(b.username);
      }

      const displayNameA = a.displayName ?? '';
      const displayNameB = b.displayName ?? '';

      // For display-name mentions, sort by display name first, then by username
      return (
        displayNameA.localeCompare(displayNameB, undefined, {
          sensitivity: 'base',
        }) || a.username.localeCompare(b.username)
      );
    });

  return { status: 'loaded', users };
}

export type UsersMatchingMentionOptions = {
  mentionMode: MentionMode;
  /** Maximum amount of users to return. Defaults to 10 */
  maxUsers?: number;
};

/**
 * Finds the users that match a mention
 */
export function usersMatchingMention(
  mentionToMatch: string | undefined,
  usersForMentions: UsersForMentions,
  { mentionMode, maxUsers = 10 }: UsersMatchingMentionOptions,
): UserItem[] {
  if (mentionToMatch === undefined || usersForMentions.status === 'loading') {
    return [];
  }

  return usersForMentions.users
    .filter(u => {
      if (!mentionToMatch) {
        // Match all users if the active mention is empty, which happens right
        // after typing `@`
        return true;
      }

      const displayName = u.displayName ?? '';
      const contentToMatch =
        mentionMode === 'username'
          ? `${u.username} ${displayName}`
          : displayName;

      return contentToMatch.match(new RegExp(mentionToMatch, 'i'));
    })
    .slice(0, maxUsers);
}
