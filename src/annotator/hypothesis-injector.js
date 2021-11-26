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
 * @implements Destroyable
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
      frame => this.injectClient(frame), // Frame added callback
      () => {} // Frame removed callback
    );
  }

  /**
   * Disables the injection of the Hypothesis client into child iframes.
   */
  destroy() {
    this._frameObserver.disconnect();
  }

  /**
   * Inject Hypothesis client into a frame.
   *
   * IMPORTANT: This method requires that the iframe is "accessible"
   * (frame.contentDocument|contentWindow is not null).
   *
   * This waits for the frame to finish loading before injecting the client.
   * See {@link onDocumentReady}.
   *
   * @param {HTMLIFrameElement} frame
   */
  async injectClient(frame) {
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

    // Generate a random string to use as a frame ID. The format is not important.
    const subFrameIdentifier = generateHexString(10);
    const injectedConfig = {
      ...this._config,

      assetRoot,
      notebookAppUrl,
      sidebarAppUrl,

      subFrameIdentifier,
    };

    const { clientUrl } = this._config;
    injectHypothesis(frame, clientUrl, injectedConfig);
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
 * Inject the client's boot script into the iframe. The iframe must be from the
 * same origin as the current window.
 *
 * @param {HTMLIFrameElement} iframe
 * @param {string} scriptSrc
 * @param {Record<string, any>} config
 */
function injectHypothesis(iframe, scriptSrc, config) {
  const configElement = document.createElement('script');
  configElement.className = 'js-hypothesis-config';
  configElement.type = 'application/json';
  configElement.innerText = JSON.stringify(config);

  const bootScript = document.createElement('script');
  bootScript.async = true;
  bootScript.src = scriptSrc;

  const iframeDocument = /** @type {Document} */ (iframe.contentDocument);
  iframeDocument.body.appendChild(configElement);
  iframeDocument.body.appendChild(bootScript);
}
