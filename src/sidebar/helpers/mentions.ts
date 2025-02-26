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

// Pattern that matches the special tag used to wrap mentions.
//
// Attempting to parse HTML with a regex is usually problematic, but we make
// some assumptions about the tag content in order to be able to get away
// with it. Specifically we assume that these tags will not contain `<` or
// `>` in attribute values or the HTML content of the tag.
const MENTION_TAG_RE = /<a[^>]\bdata-hyp-mention\b[^>]*>([^<]+)<\/a>/g;

/**
 * Replace all mentions wrapped in the special `<a data-hyp-mention />` tag with
 * their plain-text representation.
 */
export function unwrapMentions(text: string) {
  // Use a regex rather than HTML parser to replace the mentions in order
  // to avoid modifying any of the content outside of the replaced tags. This
  // includes avoiding modifications such as encoding characters that will
  // happen when parsing and re-serializing HTML via eg. `innerHTML`.
  return text.replace(MENTION_TAG_RE, (match, mention) => mention);
}

/**
 * A username for a mention that the backend "discarded" as invalid. Possible
 * reasons are: the user does not exist, belongs to a different group, is
 * nipsa'd, etc.
 */
export type InvalidUsername = string;

/**
 * Replace an unprocessed mention tag with another element that represents the
 * proper type of mention ('link', 'no-link' or 'invalid').
 */
function processAndReplaceMention(
  unprocessedMention: HTMLElement,
  mention?: Mention,
): [HTMLElement, Mention | InvalidUsername] {
  const username = unprocessedMention.textContent ?? '';
  const mentionOrUsername = mention ?? username;

  // If this mention element has already been processed, return as is
  if (unprocessedMention.hasAttribute('data-hyp-mention-type')) {
    return [unprocessedMention, mentionOrUsername];
  }

  const type =
    mention && mention.link ? 'link' : mention ? 'no-link' : 'invalid';
  const processedMention = document.createElement(
    type === 'link' ? 'a' : 'span',
  );

  processedMention.setAttribute('data-hyp-mention', '');
  processedMention.setAttribute('data-hyp-mention-type', type);
  processedMention.textContent = username;

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
  return [processedMention, mentionOrUsername];
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
): Map<HTMLElement, Mention | InvalidUsername> {
  const mentionElements = element.querySelectorAll('[data-hyp-mention]');
  const foundMentions = new Map<HTMLElement, Mention | string>();

  for (const mentionElement of mentionElements) {
    const htmlMentionElement = mentionElement as HTMLElement;
    const mentionUserId = htmlMentionElement.dataset.userid;
    const mention = mentionUserId
      ? mentions.find(m => m.userid === mentionUserId)
      : undefined;

    foundMentions.set(...processAndReplaceMention(htmlMentionElement, mention));
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
