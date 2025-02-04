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
