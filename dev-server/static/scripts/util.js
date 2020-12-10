/** @type {string|null} */
export let activeClientUrl;

/**
 * Load the Hypothesis client into the page.
 *
 * @param {string} clientUrl
 */
export function loadClient(clientUrl) {
  const embedScript = document.createElement('script');
  embedScript.src = clientUrl;
  document.body.appendChild(embedScript);
  activeClientUrl = clientUrl;
}

/**
 * Remove the Hypothesis client from the page.
 *
 * This uses the same method as the browser extension does to deactivate the client.
 */
export function unloadClient() {
  const annotatorLink = document.querySelector('link[type="application/annotator+html"]');
  annotatorLink?.dispatchEvent(new Event('destroy'));
  activeClientUrl = null;
}
