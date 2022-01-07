// Load polyfill for :focus-visible pseudo-class.
import 'focus-visible';

// Enable debug checks for Preact. Removed in prod builds by Rollup config.
import 'preact/debug';

// Load icons.
import { registerIcons } from '@hypothesis/frontend-shared';
import iconSet from './icons';
registerIcons(iconSet);

import { PortProvider } from '../shared/messaging';
import { getConfig } from './config/index';
import Guest from './guest';
import Notebook from './notebook';
import Sidebar from './sidebar';
import { EventBus } from './util/emitter';

// Look up the URL of the sidebar. This element is added to the page by the
// boot script before the "annotator" bundle loads.
const sidebarLinkElement = /** @type {HTMLLinkElement} */ (
  document.querySelector(
    'link[type="application/annotator+html"][rel="sidebar"]'
  )
);

/**
 * Entry point for the part of the Hypothesis client that runs in the page being
 * annotated.
 *
 * Depending on the client configuration in the current frame, this can
 * initialize different functionality. In "host" frames the sidebar controls and
 * iframe containing the sidebar application are created. In "guest" frames the
 * functionality to support anchoring and creating annotations is loaded. An
 * instance of Hypothesis will have one host frame, one sidebar frame and one or
 * more guest frames. The most common case is that the host frame, where the
 * client is initially loaded, is also the only guest frame.
 */
function init() {
  const annotatorConfig = getConfig('annotator');

  const hostFrame = annotatorConfig.subFrameIdentifier ? window.parent : window;

  // Create the guest that handles creating annotations and displaying highlights.
  const guest = new Guest(document.body, annotatorConfig, hostFrame);

  let sidebar;
  let notebook;
  let portProvider;
  if (hostFrame === window) {
    const sidebarConfig = getConfig('sidebar');

    const hypothesisAppsOrigin = new URL(sidebarConfig.sidebarAppUrl).origin;
    portProvider = new PortProvider(hypothesisAppsOrigin);

    const eventBus = new EventBus();
    sidebar = new Sidebar(document.body, eventBus, guest, sidebarConfig);
    notebook = new Notebook(document.body, eventBus, getConfig('notebook'));

    portProvider.on('frameConnected', (source, port) =>
      sidebar.onFrameConnected(source, port)
    );
  }

  sidebarLinkElement.addEventListener('destroy', () => {
    portProvider?.destroy();
    sidebar?.destroy();
    notebook?.destroy();
    guest.destroy();

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
