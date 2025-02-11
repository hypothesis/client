import type { Mention } from '../../types/api';
import { buildAccountID } from './account-id';

// Pattern that matches characters treated as the boundary of a mention.
const BOUNDARY_CHARS = String.raw`[\s,.;:|?!'"\-()[\]{}]`;

// Pattern that matches Hypothesis usernames.
// See https://github.com/hypothesis/h/blob/797d9a4/h/models/user.py#L25
const USERNAME_PAT = '[A-Za-z0-9_][A-Za-z0-9._]+[A-Za-z0-9_]';

// Pattern that finds user mentions in text.
const MENTIONS_PAT = new RegExp(
  `(^|${BOUNDARY_CHARS})@(${USERNAME_PAT})(?=${BOUNDARY_CHARS}|$)`,
  'g',
);

/**
 * Wrap all occurrences of @mentions in provided text into the corresponding
 * special tag, as long as they are surrounded by "empty" space (space, tab, new
 * line, or beginning/end of the whole text).
 *
 * For example: `@someuser` with the `hypothes.is` authority would become
 *  `<a data-hyp-mention data-userid="acct:someuser@hypothes.is">@someuser</a>`
 */
export function wrapMentions(text: string, authority: string): string {
  return text.replace(MENTIONS_PAT, (match, precedingChar, username) => {
    const tag = document.createElement('a');

    tag.setAttribute('data-hyp-mention', '');
    tag.setAttribute('data-userid', buildAccountID(username, authority));
    tag.textContent = `@${username}`;

    return `${precedingChar}${tag.outerHTML}`;
  });
}

/**
 * Replace all mentions wrapped in the special `<a data-hyp-mention />` tag with
 * their plain-text representation.
 */
export function unwrapMentions(text: string) {
  const tmp = document.createElement('div');
  tmp.innerHTML = text;
  for (const node of tmp.querySelectorAll('a[data-hyp-mention]')) {
    node.replaceWith(node.textContent ?? '');
  }
  return tmp.innerHTML;
}

/**
 * A username for a mention that the backend "discarded" as invalid. Possible
 * reasons are: the user does not exist, belongs to a different group, is
 * nipsa'd, etc.
 */
export type InvalidUsername = string;

function elementForMention(
  mentionLink: HTMLElement,
  mention?: Mention,
): [HTMLElement, Mention | InvalidUsername] {
  // If the mention exists in the list of mentions and contains a link, render
  // it as an anchor pointing to that link
  if (mention && mention.link) {
    mentionLink.setAttribute('href', mention.link);
    mentionLink.setAttribute('target', '_blank');
    mentionLink.setAttribute('data-hyp-mention-type', 'link');

    return [mentionLink, mention];
  }

  const username = mentionLink.textContent ?? '';

  // If the mention doesn't exist, render a "plain text" element
  if (!mention) {
    const invalidMention = document.createElement('span');

    invalidMention.setAttribute('data-hyp-mention', '');
    invalidMention.setAttribute('data-hyp-mention-type', 'invalid');
    invalidMention.textContent = username;
    mentionLink.replaceWith(invalidMention);

    return [invalidMention, username];
  }

  // If the mention exists but has no link, render a "highlighted" element which
  // is not a link
  const nonLinkMention = document.createElement('span');

  nonLinkMention.setAttribute('data-hyp-mention', '');
  nonLinkMention.setAttribute('data-hyp-mention-type', 'no-link');
  nonLinkMention.setAttribute('data-userid', mentionLink.dataset.userid ?? '');
  nonLinkMention.textContent = username;
  mentionLink.replaceWith(nonLinkMention);

  return [nonLinkMention, mention];
}

/**
 * Search for mention tags inside an HTML element, and try to match them with a
 * provided list of mentions.
 * Those that are valid are rendered as links, and those that are not are styled
 * in a way that it's possible to visually identify them.
 *
 * @return - Map of HTML elements that matched a mention tag, with their
 *           corresponding mention or invalid username
 */
export function renderMentionTags(
  element: HTMLElement,
  mentions: Mention[],
): Map<HTMLElement, Mention | InvalidUsername> {
  const mentionLinks = element.querySelectorAll('a[data-hyp-mention]');
  const foundMentions = new Map<HTMLElement, Mention | string>();

  for (const mentionLink of mentionLinks) {
    const htmlMentionLink = mentionLink as HTMLElement;
    const mentionUserId = htmlMentionLink.dataset.userid;
    const mention = mentionUserId
      ? mentions.find(m => m.userid === mentionUserId)
      : undefined;

    foundMentions.set(...elementForMention(htmlMentionLink, mention));
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
