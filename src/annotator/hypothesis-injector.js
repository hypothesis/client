import { parseJsonConfig } from '../boot/parse-json-config';
import { generateHexString } from '../shared/random';
import { onNextDocumentReady, FrameObserver } from './frame-observer';

/**
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 */

/**
 * Options for injecting the client into child frames.
 *
 * This includes the URL of the client's boot script, plus configuration
 * for the client when it loads in the child frame.
 *
 * @typedef {{ clientUrl: string } & Record<string, unknown>} InjectConfig
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
   * @param {InjectConfig} config
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
 * Check if the client was added to a frame by {@link injectClient}.
 *
 * @param {HTMLIFrameElement} iframe
 */
function hasHypothesis(iframe) {
  const iframeDocument = /** @type {Document} */ (iframe.contentDocument);
  return iframeDocument.querySelector('script.js-hypothesis-config') !== null;
}

/**
 * Remove the temporary configuration data added to a document by {@link injectClient}.
 */
export function removeTemporaryClientConfig(document_ = document) {
  const tempConfigEls = Array.from(
    document_.querySelectorAll(
      'script.js-hypothesis-config[data-remove-on-unload]'
    )
  );
  tempConfigEls.forEach(el => el.remove());
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
 * This function does nothing if the client has already been added to the frame.
 * This is determined by the presence of temporary configuration `<script>`s
 * added by this function, which can be removed with {@link removeTemporaryClientConfig}.
 *
 * @param {HTMLIFrameElement} frame
 * @param {InjectConfig} config -
 * @param {string} [frameId] - The ID for the guest frame. If none is provided,
 *   the guest will use a new randomly-generated ID.
 */
export async function injectClient(frame, config, frameId) {
  if (hasHypothesis(frame)) {
    return;
  }

  await onNextDocumentReady(frame);

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

    subFrameIdentifier: frameId ?? generateHexString(10),
  };

  const configElement = document.createElement('script');
  configElement.className = 'js-hypothesis-config';
  configElement.setAttribute('data-remove-on-unload', '');
  configElement.type = 'application/json';
  configElement.innerText = JSON.stringify(injectedConfig);

  const bootScript = document.createElement('script');
  bootScript.async = true;
  bootScript.src = config.clientUrl;

  const iframeDocument = /** @type {Document} */ (frame.contentDocument);
  iframeDocument.body.appendChild(configElement);
  iframeDocument.body.appendChild(bootScript);
}
