/* global process */

/**
 * @typedef {import('../types/annotator').HypothesisWindow} HypothesisWindow
 */

// Load polyfill for :focus-visible pseudo-class.
import 'focus-visible';

// Enable debug checks for Preact components.
if (process.env.NODE_ENV !== 'production') {
  require('preact/debug');
}

// Load icons.
import { registerIcons } from '@hypothesis/frontend-shared';
import iconSet from './icons';
registerIcons(iconSet);

import Bridge from '../shared/bridge';
import { FrameConnector, PortFinder } from '../shared/communicator';

import { getConfig } from './config/index';
import { CrossFrame } from './cross-frame';
import Guest from './guest';
import Notebook from './notebook';
import Sidebar from './sidebar';
import { EventBus } from './util/emitter';

const _window = /** @type {HypothesisWindow} */ (window);

// Look up the URL of the sidebar. This element is added to the page by the
// boot script before the "annotator" bundle loads.
const appLinkEl = /** @type {Element} */ (
  document.querySelector(
    'link[type="application/annotator+html"][rel="sidebar"]'
  )
);

function init() {
  const annotatorConfig = getConfig('annotator');

  // Enables intra-frame communication between different "parts" within the `host`
  // or `guest` frame.
  const eventBus = new EventBus();

  // Enables inter-frame communication between `host` or `guest` frame and other
  // frames (`notebook` and `sidebar`)
  const bridge = new Bridge();

  // The bridge is wrapped inside `CrossFrame` and pass it directly or indirectly
  // (as `Guest`) to other classes.
  const crossframe = new CrossFrame(
    document.body,
    eventBus,
    bridge,
    annotatorConfig
  );

  const isPDF = typeof _window.PDFViewerApplication !== 'undefined';

  const guest = new Guest(document.body, eventBus, crossframe, {
    ...annotatorConfig,
    // Load the PDF anchoring/metadata integration.
    // nb. documentType is an internal config property only
    documentType: isPDF ? 'pdf' : 'html',
  });

  let frameConnector = /** @type {FrameConnector?} */ (null);
  let sidebar = /** @type {Sidebar?} */ (null);
  let notebook = /** @type {Notebook?} */ (null);

  if (annotatorConfig.subFrameIdentifier) {
    // Other modules use this to detect if this frame context belongs to hypothesis.
    // Needs to be a global property.
    Object.defineProperty(_window, '__hypothesis_frame', { value: true });

    // This enables the communication channel between `guest` <-> `sidebar`.
    // Discover the `guest` port on the `guestToSidebar` channel using the
    // parent window
    const portFinder = new PortFinder();
    portFinder
      .discover({
        channel: 'guestToSidebar',
        hostFrame: window.parent,
        port: 'guest',
      })
      .then(port => bridge.createChannelFromPort(port, 'sidebar'));
  } else {
    const sidebarConfig = getConfig('sidebar');
    const { sidebarAppUrl } = sidebarConfig;

    frameConnector = new FrameConnector(sidebarAppUrl);
    frameConnector.listen();

    sidebar = new Sidebar(document.body, eventBus, guest, sidebarConfig);

    // Clear `annotations` value from the notebook's config to prevent direct-linked
    // annotations from filtering the threads.
    notebook = new Notebook(document.body, eventBus, getConfig('notebook'));

    const hostPort = frameConnector.getPort({
      channel: 'hostToSidebar',
      port: 'host',
    });

    // This enables the communication channel between `host` <-> `sidebar`.
    // The creation of the channel must happen after the `Sidebar` is created because
    // `Sidebar` registers event listeners using `guest.crossframe`.
    if (hostPort) {
      bridge.createChannelFromPort(hostPort, 'sidebar');
    }
  }

  appLinkEl.addEventListener('destroy', () => {
    bridge.destroy();
    crossframe.destroy();
    guest.destroy();
    frameConnector?.destroy();
    sidebar?.destroy();
    notebook?.destroy();

    // Remove all the `<link>`, `<script>` and `<style>` elements added to the
    // page by the boot script.
    const clientAssets = document.querySelectorAll('[data-hypothesis-asset]');
    clientAssets.forEach(el => el.remove());
  });
}

/**
 * Returns a Promise that resolves when the document has loaded (but subresources
 * may still be loading).
 * @returns {Promise<void>}
 */
function documentReady() {
  return new Promise(resolve => {
    if (document.readyState !== 'loading') {
      resolve();
    }
    // nb. `readystatechange` may be emitted twice, but `resolve` only resolves
    // on the first call.
    document.addEventListener('readystatechange', () => resolve());
  });
}

documentReady().then(init);
