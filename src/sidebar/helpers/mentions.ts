import type { Mention } from '../../types/api';

/**
 * Wrap all occurrences of @mentions in provided text into the corresponding
 * special tag, as long as they are surrounded by "empty" space (space, tab, new
 * line, or beginning/end of the whole text).
 *
 * For example: `@someuser` with the `hypothes.is` authority would become
 *  `<a data-hyp-mention data-userid="acct:someuser@hypothes.is">@someuser</a>`
 */
export function wrapMentions(text: string, authority: string): string {
  return text.replace(/(?:^|\s)@(\w+)(?=\s|$)/g, (match, username) => {
    const tag = document.createElement('a');

    tag.setAttribute('data-hyp-mention', '');
    tag.setAttribute('data-userid', `acct:${username}@${authority}`);
    tag.textContent = `@${username}`;

    return ` ${tag.outerHTML}`;
  });
}

/**
 * Replace all mentions wrapped in the special `<a data-hyp-mention />` tag with
 * their corresponding plain-text representation
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
 * Searches for mention tags inside an HTML element, and tries to match them
 * with a provided list of mentions.
 * Those that are valid are rendered as links, and those that are not are styled
 * so that it is possible to identify them.
 *
 * @return - Map of HTML elements with their corresponding mention
 */
export function renderMentionTags(
  element: HTMLElement,
  mentions: Mention[] = [],
): Map<HTMLElement, Mention> {
  const mentionLinks = element.querySelectorAll('a[data-hyp-mention]');
  const foundMentions = new Map<HTMLElement, Mention>();

  for (const mentionLink of mentionLinks) {
    const htmlMentionLink = mentionLink as HTMLElement;
    const mentionUserId = htmlMentionLink.dataset.userid;
    const mention =
      mentionUserId && mentions.find(m => m.userid === mentionUserId);

    if (mention) {
      // If the mention exists in the list of mentions, render it as a link to
      // the user profile
      mentionLink.setAttribute('href', mention.link);
      mentionLink.setAttribute('target', '_blank');

      foundMentions.set(htmlMentionLink, mention);
    } else {
      // If it doesn't, convert it to "plain text"
      const plainTextMention = document.createElement('span');
      plainTextMention.textContent = mentionLink.textContent;
      plainTextMention.style.fontStyle = 'italic';
      plainTextMention.style.borderBottom = 'dotted';
      mentionLink.parentElement?.replaceChild(plainTextMention, mentionLink);
    }
  }

  return foundMentions;
}
