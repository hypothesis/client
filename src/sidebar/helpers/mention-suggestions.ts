import type { FocusedGroupMembers } from '../store/modules/groups';

export type UserItem = {
  username: string;
  displayName: string | null;
};

export type UsersForMentions =
  | { status: 'loading' }
  | { status: 'loaded'; users: UserItem[] };

/**
 * Merge, deduplicate and sort a list of users to be used for mention suggestions.
 * The list includes both users who already annotated the document, and members
 * of the currently focused group.
 *
 * We won't return any users if the group members are being loaded, preventing a
 * mix of some already-fetched users and a loading indicator from being shown at
 * the same time.
 */
export function combineUsersForMentions(
  usersWhoAnnotated: UserItem[],
  focusedGroupMembers: FocusedGroupMembers,
): UsersForMentions {
  if (!Array.isArray(focusedGroupMembers)) {
    return { status: 'loading' };
  }

  // Once group members are loaded, we can merge them with the users who
  // already annotated the document, then deduplicate and sort the result.
  const focusedGroupUsers: UserItem[] = focusedGroupMembers.map(
    ({ username, display_name: displayName }) => ({ username, displayName }),
  );
  const addedUsernames = new Set<string>();
  const users = [...usersWhoAnnotated, ...focusedGroupUsers]
    .filter(({ username }) => {
      const usernameAlreadyAdded = addedUsernames.has(username);
      addedUsernames.add(username);
      return !usernameAlreadyAdded;
    })
    .sort((a, b) => a.username.localeCompare(b.username));

  return { status: 'loaded', users };
}

export type UsersMatchingMentionOptions = {
  /** Maximum amount of users to return. Defaults to 10 */
  maxUsers?: number;
};

/**
 * Finds the users that match a mention
 */
export function usersMatchingMention(
  mentionToMatch: string | undefined,
  usersForMentions: UsersForMentions,
  options?: UsersMatchingMentionOptions,
): UserItem[] {
  if (mentionToMatch === undefined || usersForMentions.status === 'loading') {
    return [];
  }

  return usersForMentions.users
    .filter(
      u =>
        // Match all users if the active mention is empty, which happens right
        // after typing `@`
        !mentionToMatch ||
        `${u.username} ${u.displayName ?? ''}`
          .toLowerCase()
          .match(mentionToMatch.toLowerCase()),
    )
    .slice(0, options?.maxUsers ?? 10);
}
