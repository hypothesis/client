import type { Mention } from '../../types/api';
import { buildAccountID } from './account-id';

/**
 * Wrap all occurrences of @mentions in provided text into the corresponding
 * special tag, as long as they are surrounded by "empty" space (space, tab, new
 * line, or beginning/end of the whole text).
 *
 * For example: `@someuser` with the `hypothes.is` authority would become
 *  `<a data-hyp-mention data-userid="acct:someuser@hypothes.is">@someuser</a>`
 */
export function wrapMentions(text: string, authority: string): string {
  return text.replace(
    // Capture both the potential empty character before the mention (space, tab
    // or new line), and the term following the `@` character.
    // When we build the mention tag, we need to prepend that empty character to
    // avoid altering the spacing and structure of the text.
    /(^|\s)@(\w+)(?=\s|$)/g,
    (match, precedingWhitespace, username) => {
      const tag = document.createElement('a');

      tag.setAttribute('data-hyp-mention', '');
      tag.setAttribute('data-userid', buildAccountID(username, authority));
      tag.textContent = `@${username}`;

      return `${precedingWhitespace}${tag.outerHTML}`;
    },
  );
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
  // If the mention exists in the list of mentions, render it as a link
  if (mention && mention.link) {
    mentionLink.setAttribute('href', mention.link ?? '');
    mentionLink.setAttribute('target', '_blank');
    mentionLink.classList.add('font-bold');

    return [mentionLink, mention];
  }

  const username = mentionLink.textContent ?? '';

  // If the mention doesn't exist, render a "plain text" element
  if (!mention) {
    const invalidMention = document.createElement('span');

    invalidMention.textContent = username;
    invalidMention.style.fontStyle = 'italic';
    invalidMention.style.borderBottom = 'dotted';
    mentionLink.replaceWith(invalidMention);

    return [invalidMention, username];
  }

  // If the mention exists but has no link, render a "highlighted" element which
  // is not a link
  const nonLinkMention = document.createElement('span');

  nonLinkMention.setAttribute('data-hyp-mention', '');
  nonLinkMention.setAttribute('data-userid', mentionLink.dataset.userid ?? '');
  nonLinkMention.classList.add('text-brand', 'font-bold');
  nonLinkMention.textContent = username;

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
