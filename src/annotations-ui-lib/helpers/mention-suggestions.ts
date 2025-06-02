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

      return contentToMatch
        .toLowerCase()
        .includes(mentionToMatch.toLowerCase());
    })
    .slice(0, maxUsers);
}
