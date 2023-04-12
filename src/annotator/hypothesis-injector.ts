import { parseJsonConfig } from '../boot/parse-json-config';
import { generateHexString } from '../shared/random';
import type { Destroyable } from '../types/annotator';
import { onNextDocumentReady, FrameObserver } from './frame-observer';

/**
 * Options for injecting the client into child frames.
 *
 * This includes the URL of the client's boot script, plus configuration
 * for the client when it loads in the child frame.
 */
export type InjectConfig = { clientUrl: string } & Record<string, unknown>;

/**
 * HypothesisInjector injects the Hypothesis client into same-origin iframes.
 *
 * The client will be injected automatically into frames that have the
 * `enable-annotation` attribute set (see {@link FrameObserver}) and can be
 * manually injected into other frames using {@link injectClient}.
 */
export class HypothesisInjector implements Destroyable {
  private _config: InjectConfig;
  private _frameObserver: FrameObserver;

  /**
   * @param element - root of the DOM subtree to watch for the addition and
   *   removal of annotatable iframes
   */
  constructor(element: Element, config: InjectConfig) {
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
 */
function hasHypothesis(iframe: HTMLIFrameElement) {
  const iframeDocument = iframe.contentDocument!;
  return iframeDocument.querySelector('script.js-hypothesis-config') !== null;
}

/**
 * Remove the temporary client configuration added to a document by
 * {@link injectClient} or {@link HypothesisInjector}.
 */
export function removeTemporaryClientConfig(document_: Document = document) {
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
 * @param frameId - The ID for the guest frame. If none is provided, the guest
 *   will use a new randomly-generated ID.
 */
export async function injectClient(
  frame: HTMLIFrameElement,
  config: InjectConfig,
  frameId?: string
) {
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
  const { assetRoot, notebookAppUrl, profileAppUrl, sidebarAppUrl } =
    parseJsonConfig(document);

  const injectedConfig = {
    ...config,

    assetRoot,

    // FIXME - We propagate these settings because the boot script expects them,
    // but they shouldn't actually be needed when launching the client in a
    // frame as a guest only (ie. no sidebar). A caveat is that the
    // `<link>` element generated using the `sidebarAppUrl` value does also get
    // used for other purposes by the annotator entry point.
    notebookAppUrl,
    profileAppUrl,
    sidebarAppUrl,

    // Tell the client that it should load as a guest only (no sidebar).
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

  const iframeDocument = frame.contentDocument!;
  iframeDocument.body.appendChild(configElement);
  iframeDocument.body.appendChild(bootScript);
}
