/**
 * Return the href of the first annotator link in the given
 * document with this `rel` attribute.
 *
 * Return the value of the href attribute of the first
 * `<link type="application/annotator+html" rel="${rel}">`
 *
 * or
 *
 * * `<link type="application/annotator+javascript" rel="hypothesis-client">`
 *
 * element in the given document. This URL is used as the `src` for sidebar
 * or notebook iframes, or to identify where the client is from and what url
 * should be used inside of subframes.
 *
 * @param {Window} window_
 * @param {string} rel - The `rel` attribute to match
 * @param {'javascript'|'html'} type - document type
 * @throws {Error} - If there's no link with the `rel` indicated, or the first
 *   matching link has no `href`
 */
export function urlFromLinkTag(window_, rel, type) {
  const link = /** @type {HTMLLinkElement} */ (
    window_.document.querySelector(
      `link[type="application/annotator+${type}"][rel="${rel}"]`
    )
  );

  if (!link) {
    throw new Error(
      `No application/annotator+${type} (rel="${rel}") link in the document`
    );
  }

  if (!link.href) {
    throw new Error(
      `application/annotator+${type} (rel="${rel}") link has no href`
    );
  }

  return link.href;
}
