import { parseJsonConfig } from '../boot/parse-json-config';
import { generateHexString } from '../shared/random';
import { onDocumentReady, FrameObserver } from './frame-observer';

/**
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 */

/**
 * HypothesisInjector injects the Hypothesis client into same-origin iframes.
 *
 * The client will be injected automatically into frames that have the
 * `enable-annotation` attribute set (see {@link FrameObserver}) and can be
 * manually injected into other frames using {@link injectClient}.
 *
 * @implements {Destroyable}
 */
export class HypothesisInjector {
  /**
   * @param {Element} element - root of the DOM subtree to watch for the
   *   addition and removal of annotatable iframes
   * @param {Record<string, any>} config - Annotator configuration that is
   *   injected, along with the Hypothesis client, into the child iframes
   */
  constructor(element, config) {
    this._config = config;
    this._frameObserver = new FrameObserver(
      element,
      frame => injectClient(frame, config), // Frame added callback
      () => {} // Frame removed callback
    );
  }

  /**
   * Disables the injection of the Hypothesis client into child iframes.
   */
  destroy() {
    this._frameObserver.disconnect();
  }
}

/**
 * Check if the Hypothesis client has already been injected into an iframe
 *
 * @param {HTMLIFrameElement} iframe
 */
function hasHypothesis(iframe) {
  const iframeWindow = /** @type {Window} */ (iframe.contentWindow);
  return '__hypothesis' in iframeWindow;
}

/**
 * Inject Hypothesis client into a frame.
 *
 * IMPORTANT: This method requires that the iframe is same-origin
 * (frame.contentDocument|contentWindow is not null).
 *
 * This waits for the frame to finish loading before injecting the client.
 * See {@link onDocumentReady}.
 *
 * @param {HTMLIFrameElement} frame
 * @param {Record<string, any>} config - Annotator configuration that is
 *   injected, along with the Hypothesis client, into the child iframes
 */
export async function injectClient(frame, config) {
  if (hasHypothesis(frame)) {
    return;
  }

  await onDocumentReady(frame);

  // Propagate the client resource locations from the current frame.
  //
  // These settings are set only in the browser extension and not by the
  // embedded client (served by h).
  //
  // We could potentially do this by allowing these settings to be part of
  // the "annotator" config (see `annotator/config/index.js`) which gets passed
  // to the constructor.
  const { assetRoot, notebookAppUrl, sidebarAppUrl } =
    parseJsonConfig(document);

  const injectedConfig = {
    ...config,

    assetRoot,
    notebookAppUrl,
    sidebarAppUrl,

    // Generate a random string to use as a frame ID. The format is not important.
    subFrameIdentifier: generateHexString(10),
  };

  const configElement = document.createElement('script');
  configElement.className = 'js-hypothesis-config';
  configElement.type = 'application/json';
  configElement.innerText = JSON.stringify(injectedConfig);

  const bootScript = document.createElement('script');
  bootScript.async = true;
  bootScript.src = config.clientUrl;

  const iframeDocument = /** @type {Document} */ (frame.contentDocument);
  iframeDocument.body.appendChild(configElement);
  iframeDocument.body.appendChild(bootScript);
}
