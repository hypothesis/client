// Global functions exposed on all pages on the dev server where the client
// is embedded.
//
// Ideally this would be an ES module and we'd avoid the globals. However ES
// modules do not work in XHTML documents in all browsers. This mainly affects
// our EPUB test cases. See https://github.com/hypothesis/client/pull/4353.

/** @type {string|null} */
let activeClientUrl;

/**
 * Load the Hypothesis client into the page.
 *
 * @param {string} clientUrl
 */
function loadClient(clientUrl) {
  let embedScript = document.createElement('script');
  embedScript.src = clientUrl;
  document.body.appendChild(embedScript);
  activeClientUrl = clientUrl;
}

/**
 * Remove the Hypothesis client from the page.
 *
 * This uses the same method as the browser extension does to deactivate the client.
 */
function unloadClient() {
  let annotatorLink = document.querySelector(
    'link[type="application/annotator+html"]',
  );

  if (annotatorLink) {
    annotatorLink.dispatchEvent(new Event('destroy'));
  }
  activeClientUrl = null;
}
