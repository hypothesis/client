/** @param {URL} url */
function extractPathAndQuery(url) {
  const path = url.pathname;
  if (!url.search) {
    return path;
  }
  // TODO - Sort query params
  return `${path}?${url.search}`;
}

/**
 * CanonicalURLRevalidator revalidates `<link rel=canonical>` if it is
 * potentially out of sync with the current document URL.
 *
 * We have seen an issue on various websites, including YouTube and Reddit,
 * where the `<link rel=canonical>` element is not updated after a client-side
 * navigation. This class checks whether the current canonical link is
 * potentially affected and if so, re-fetches the page HTML from the origin
 * server and updates the element.
 */
export class CanonicalURLRevalidator {
  /**
   * @param {HTMLHeadElement} headEl
   */
  constructor(headEl = document.head) {
    this._headElement = headEl;

    /** @type {{ pageURL: string, canonicalURL: string}|null} */
    this._validatedHref = null;
  }

  destroy() {
    // TODO - Abort any in-flight requests
  }

  /**
   * Revalidate and return the canonical URL for the document.
   *
   * Returns the document URL (`location.href`) if the document does not have
   * a `<link rel=canonical>` element.
   *
   * TODO: Decide what happen if called while a request is in-flight.
   *
   * @return {Promise<string>}
   */
  async revalidate() {
    const canonicalLink = /** @type {HTMLLinkElement|null} */ (
      this._headElement.querySelector('link[rel=canonical]')
    );
    if (!canonicalLink) {
      return location.href;
    }

    // Skip revalidation if the existing canonical link appears to be valid.
    if (
      location.href === this._validatedHref?.pageURL &&
      canonicalLink.href === this._validatedHref?.canonicalURL
    ) {
      return canonicalLink.href;
    }

    const canonicalURL = new URL(canonicalLink.href);
    const currentURL = new URL(location.href);

    // TODO: Strip off unimportant query params

    const canonicalPath = extractPathAndQuery(canonicalURL);
    const currentPath = extractPathAndQuery(currentURL);

    if (canonicalPath === currentPath) {
      return canonicalLink.href;
    }

    // Re-fetch the page from the origin server and extract the canonical link
    // from it.
    let htmlText;
    try {
      // TODO - Pass an abort signal here
      const htmlResponse = await fetch(location.href);
      htmlText = await htmlResponse.text();
    } catch {
      throw new Error('Unable to revalidate canonical link');
    }

    const htmlLinks = htmlText.match(/<link[^>]+>/g);
    if (!htmlLinks) {
      throw new Error('Unable to revalidate canonical link');
    }

    const parser = new DOMParser();
    const linkDoc = parser.parseFromString(htmlLinks.join('\n'), 'text/html');
    const newCanonicalLink = /** @type {HTMLLinkElement|null} */ (
      linkDoc.querySelector('link[rel=canonical]')
    );

    if (!newCanonicalLink) {
      throw new Error('Unable to revalidate canonical link');
    }

    // Save validation result so that future calls to revalidate can return
    // immediately, unless the page URL or canonical URL changes again.
    this._validatedHref = {
      pageURL: location.href,
      canonicalURL: canonicalLink.href,
    };

    if (newCanonicalLink.href === canonicalLink.href) {
      return canonicalLink.href;
    }

    canonicalLink.href = newCanonicalLink.href;
    return canonicalLink.href;
  }
}
