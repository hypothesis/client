import { buildAccountID } from './account-id';
import type { UserItem } from './mention-suggestions';
import type { Mention } from './types';

// Pattern that matches characters treated as the boundary of a mention.
const BOUNDARY_CHARS = String.raw`[\s,.;:|?!'"\-()[\]{}]`;

// Pattern that matches Hypothesis usernames.
// See https://github.com/hypothesis/h/blob/797d9a4/h/models/user.py#L25
const USERNAME_PAT = '[A-Za-z0-9_][A-Za-z0-9._]+[A-Za-z0-9_]';

// Pattern that finds username-based mentions in text.
const USERNAME_MENTIONS_PAT = new RegExp(
  `(^|${BOUNDARY_CHARS})@(${USERNAME_PAT})(?=${BOUNDARY_CHARS}|$)`,
  'g',
);

// Pattern that matches display names.
// Display names can have any amount of characters, except opening or closing
// square brackets, which are used to delimit the display name itself.
const DISPLAY_NAME_PAT = String.raw`[^\]^[]*`;

// Pattern that finds display-name-based mentions in text.
const DISPLAY_NAME_MENTIONS_PAT = new RegExp(
  `(^|${BOUNDARY_CHARS})@\\[(${DISPLAY_NAME_PAT})](?=${BOUNDARY_CHARS}|$)`,
  'g',
);

/**
 * Create a mention tag for provided userid and content.
 *
 * `<a data-hyp-mention="" data-userid={userid}>{content}</a>`
 */
function buildMentionTag(userid: string, content: string): string {
  const tag = document.createElement('a');

  tag.setAttribute('data-hyp-mention', '');
  tag.setAttribute('data-userid', userid);
  tag.textContent = content;

  return tag.outerHTML;
}

/**
 * Wrap all occurrences of @mention in provided text into the corresponding
 * special tag, as long as they are surrounded by boundary chars.
 *
 * For example: `@someuser` with the `hypothes.is` authority would become
 *  `<a data-hyp-mention data-userid="acct:someuser@hypothes.is">@someuser</a>`
 */
export function wrapMentions(text: string, authority: string): string {
  return text.replace(
    USERNAME_MENTIONS_PAT,
    (match, precedingChar, username) => {
      const mentionTag = buildMentionTag(
        buildAccountID(username, authority),
        `@${username}`,
      );
      return `${precedingChar}${mentionTag}`;
    },
  );
}

/**
 * Wrap all occurrences of @[Display Name] in provided text into the
 * corresponding mention tag, as long as they are surrounded by boundary chars.
 *
 * Every matched plain-text mention will need a corresponding entry in the
 * users map to produce a valid mention tag.
 * Non-matching ones will be kept as plain-text.
 */
export function wrapDisplayNameMentions(
  text: string,
  usersMap: Map<string, UserItem>,
): string {
  return text.replace(
    DISPLAY_NAME_MENTIONS_PAT,
    (match, precedingChar, displayName) => {
      const suggestion = usersMap.get(displayName);
      if (!suggestion) {
        return `${precedingChar}${displayNameMention(displayName)}`;
      }

      const mentionTag = buildMentionTag(suggestion.userid, `@${displayName}`);
      return `${precedingChar}${mentionTag}`;
    },
  );
}

// Pattern that matches the special tag used to wrap mentions.
//
// Attempting to parse HTML with a regex is usually problematic, but we make
// some assumptions about the tag content in order to be able to get away
// with it. Specifically we assume that these tags will not contain `<` or
// `>` in attribute values or the HTML content of the tag.
const MENTION_TAG_RE = /<a[^>]\bdata-hyp-mention\b[^>]*>@([^<]+)<\/a>/g;

export type UnwrapMentionsOptions = {
  text: string;
  mentionMode: MentionMode;
  mentions?: Mention[];
};

/**
 * Replace all mentions wrapped in the special `<a data-hyp-mention />` tag with
 * their plain-text representation.
 *
 * The plain-text representation depends on the mention mode:
 * - `username`: @username
 * - `display-name`: @[Display Name]
 *
 * If a list of mentions is provided, the tag's userid will be matched against
 * it, so that the plain-text version uses the most recent username or display
 * name, in case they have changed since the mention was created.
 * If a list is not provided or the mention is not found, the tag's content will
 * be used as username or display name.
 */
export function unwrapMentions({
  text,
  mentionMode,
  mentions = [],
}: UnwrapMentionsOptions) {
  // Use a regex rather than HTML parser to replace the mentions in order
  // to avoid modifying any of the content outside of the replaced tags. This
  // includes avoiding modifications such as encoding characters that will
  // happen when parsing and re-serializing HTML via eg. `innerHTML`.
  return text.replace(MENTION_TAG_RE, (match, tagContent) => {
    // Even though we need to capture the tag content via a regex for the
    // reasons explained above, we can use regular DOM APIs to get the userid
    const tempElement = document.createElement('div');
    tempElement.innerHTML = match;
    const userid = tempElement
      .querySelector('a[data-hyp-mention]')
      ?.getAttribute('data-userid');

    const mention = mentions.find(
      ({ original_userid }) => original_userid === userid,
    );

    return mentionMode === 'username'
      ? `@${mention?.username ?? tagContent}`
      : // Using || rather than ?? for the display name, to avoid setting an
        // empty string if the user used to have a display name and has been
        // removed since the mention was created
        displayNameMention(mention?.display_name || tagContent);
  });
}

/**
 * The content of a mention tag that the backend "discarded" as invalid.
 * Possible reasons are: the user does not exist, belongs to a different group,
 * is nipsa'd, etc.
 */
export type InvalidMentionContent = string;

/**
 * Replace an unprocessed mention tag with another element that represents the
 * proper type of mention ('link', 'no-link' or 'invalid').
 */
function processAndReplaceMention(
  unprocessedMention: HTMLElement,
  mention: Mention | undefined,
  mentionMode: MentionMode,
): [HTMLElement, Mention | InvalidMentionContent] {
  const originalTagContent = unprocessedMention.textContent ?? '';
  const mentionOrInvalidContent = mention ?? originalTagContent;

  // If this mention element has already been processed, return as is
  if (unprocessedMention.hasAttribute('data-hyp-mention-type')) {
    return [unprocessedMention, mentionOrInvalidContent];
  }

  const type =
    mention && mention.link ? 'link' : mention ? 'no-link' : 'invalid';
  const processedMention = document.createElement(
    type === 'link' ? 'a' : 'span',
  );

  processedMention.setAttribute('data-hyp-mention', '');
  processedMention.setAttribute('data-hyp-mention-type', type);

  // For valid mentions, resolve the most recent username or display name, in
  // case it has changed since the mention was created.
  // The only exception is when a valid mention with an empty display name is
  // resolved, in which case we fall back to the original tag content.
  if (!mention) {
    processedMention.textContent = originalTagContent;
  } else if (mentionMode === 'username') {
    processedMention.textContent = `@${mention.username}`;
  } else {
    processedMention.textContent = mention.display_name
      ? `@${mention.display_name}`
      : originalTagContent;
  }

  if (type === 'link') {
    // If the mention exists in the list of mentions and contains a link, render
    // it as an anchor pointing to that link
    processedMention.setAttribute('href', mention?.link ?? '');
    processedMention.setAttribute('target', '_blank');
  }

  if (type !== 'invalid') {
    processedMention.setAttribute(
      'data-userid',
      unprocessedMention.dataset.userid ?? '',
    );
  }

  unprocessedMention.replaceWith(processedMention);
  return [processedMention, mentionOrInvalidContent];
}

/**
 * Search for mention tags inside an HTML element, and try to match them with a
 * provided list of mentions. Every matched element will be replaced with
 * another one that represents the proper type of mention ('link', 'no-link' or
 * 'invalid').
 *
 * @return - Map of HTML elements that matched a mention tag, with their
 *           corresponding mention or invalid username
 */
export function processAndReplaceMentionElements(
  element: HTMLElement,
  mentions: Mention[],
  mentionMode: MentionMode,
): Map<HTMLElement, Mention | InvalidMentionContent> {
  const mentionElements = element.querySelectorAll('[data-hyp-mention]');
  const foundMentions = new Map<HTMLElement, Mention | string>();

  for (const mentionElement of mentionElements) {
    const htmlMentionElement = mentionElement as HTMLElement;
    const mentionUserId = htmlMentionElement.dataset.userid;
    const mention = mentionUserId
      ? mentions.find(m => m.userid === mentionUserId)
      : undefined;

    foundMentions.set(
      ...processAndReplaceMention(htmlMentionElement, mention, mentionMode),
    );
  }

  return foundMentions;
}

/**
 * Returns the word at a specific position in a string, surrounded by empty
 * characters or punctuation characters.
 */
export function termBeforePosition(text: string, position: number): string {
  const { start } = getContainingMentionOffsets(text, position);
  return text.slice(start, position);
}

export type WordOffsets = {
  start: number;
  end: number;
};

/**
 * Returns the `start` and `end` positions for the word or mention that overlaps
 * with provided reference position.
 *
 * For example, given the text "hello @hypothesis", and the reference position 9
 * (which corresponds to the `y` character) it will return the start and end of
 * the `@hypothesis` mention, hence { start: 6, end: 17 }.
 *
 * Useful to get the offsets of the mention matching the caret position in text
 * inputs and textareas.
 */
export function getContainingMentionOffsets(
  text: string,
  referencePosition: number,
): WordOffsets {
  const precedingText = text.slice(0, referencePosition);
  const matches = [...precedingText.matchAll(new RegExp(BOUNDARY_CHARS, 'g'))];
  const precedingCharPos =
    matches.length > 0 ? Math.max(...matches.map(match => match.index)) : -1;

  const subsequentCharPos = text
    .slice(referencePosition)
    .search(new RegExp(BOUNDARY_CHARS));

  return {
    start: precedingCharPos + 1,
    end:
      subsequentCharPos === -1
        ? text.length
        : referencePosition + subsequentCharPos,
  };
}

/**
 * Whether mentions should be done via username (`@username`) or display name
 * (`@[Display Name]`).
 *
 * This also affects the information displayed in suggestions, which will not
 * include the username in the second case.
 */
export type MentionMode = 'username' | 'display-name';

/**
 * Converts provided user into a plain-text mention (not wrapped in a mention
 * tag).
 *
 * Depending on the mention mode it will return `@username` or `@[Display Name]`.
 */
export function toPlainTextMention(
  user: UserItem,
  mentionMode: MentionMode,
): string {
  return mentionMode === 'display-name'
    ? displayNameMention(user.displayName ?? '')
    : `@${user.username}`;
}

/**
 * Convert a display name into a plain-text mention.
 * `Display Name` -> `@[Display Name]`
 *
 * Square brackets are removed from it, as they are reserved to delimit the
 * beginning and end of the display name itself.
 * `Foo [Bar]` -> `@[Foo Bar]`
 */
function displayNameMention(displayName: string): string {
  return `@[${displayName.replace(/[[\]]/g, '')}]`;
}
