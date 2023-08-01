function isHTMLAnchorElement(
  element: HTMLElement,
): element is HTMLAnchorElement {
  return element.tagName === 'A';
}

/**
 * Prevent windows or tabs opened via links under `root` from accessing their
 * opening `Window`.
 *
 * This makes links with `target="blank"` attributes act as if they also had
 * the `rel="noopener"` [1] attribute set.
 *
 * In addition to preventing tab-jacking [2], this also enables multi-process
 * browsers to more easily use a new process for instances of Hypothesis in the
 * newly-opened tab and works around a bug in Chrome [3]
 *
 * [1] https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types#noopener
 * [2] https://mathiasbynens.github.io/rel-noopener/
 * [3] https://bugs.chromium.org/p/chromium/issues/detail?id=753314
 */
export function disableOpenerForExternalLinks(root: Element) {
  root.addEventListener('click', event => {
    const target = event.target as HTMLElement;

    if (isHTMLAnchorElement(target)) {
      if (target.target === '_blank') {
        target.rel = 'noopener';
      }
    }
  });
}
