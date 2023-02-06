// Load polyfill for :focus-visible pseudo-class.
import 'focus-visible';
// Enable debug checks for Preact. Removed in prod builds by Rollup config.
import 'preact/debug';

import {
  PortProvider,
  installPortCloseWorkaroundForSafari,
} from '../shared/messaging';
import type { Destroyable } from '../types/annotator';
import type { NotebookConfig } from './components/NotebookModal';
import type { ProfileConfig } from './components/ProfileModal';
import { getConfig } from './config/index';
import { Guest } from './guest';
import type { GuestConfig } from './guest';
import {
  HypothesisInjector,
  removeTemporaryClientConfig,
} from './hypothesis-injector';
import type { InjectConfig } from './hypothesis-injector';
import {
  VitalSourceInjector,
  vitalSourceFrameRole,
} from './integrations/vitalsource';
import { Notebook } from './notebook';
import { Profile } from './profile';
import { Sidebar } from './sidebar';
import type { SidebarConfig } from './sidebar';
import { EventBus } from './util/emitter';

// Look up the URL of the sidebar. This element is added to the page by the
// boot script before the "annotator" bundle loads.
const sidebarLinkElement = document.querySelector(
  'link[type="application/annotator+html"][rel="sidebar"]'
) as HTMLLinkElement;

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
  const annotatorConfig = getConfig('annotator') as GuestConfig & InjectConfig;

  let resolveUnloadRequested = () => {};
  const unloadRequested = new Promise<void>(resolve => {
    resolveUnloadRequested = resolve;
  });
  sidebarLinkElement.addEventListener('destroy', resolveUnloadRequested);

  const hostFrame = annotatorConfig.subFrameIdentifier ? window.parent : window;

  const destroyables = [] as Destroyable[];

  if (hostFrame === window) {
    // Ensure port "close" notifications from eg. guest frames are delivered properly.
    const removeWorkaround = installPortCloseWorkaroundForSafari();
    destroyables.push({ destroy: removeWorkaround });

    const sidebarConfig = getConfig('sidebar') as SidebarConfig;

    const hypothesisAppsOrigin = new URL(sidebarConfig.sidebarAppUrl).origin;
    const portProvider = new PortProvider(hypothesisAppsOrigin);

    const eventBus = new EventBus();
    const sidebar = new Sidebar(document.body, eventBus, sidebarConfig);
    const notebook = new Notebook(
      document.body,
      eventBus,
      getConfig('notebook') as NotebookConfig
    );
    const profile = new Profile(
      document.body,
      eventBus,
      getConfig('profile') as ProfileConfig
    );

    portProvider.on('frameConnected', (source, port) =>
      sidebar.onFrameConnected(source, port)
    );
    destroyables.push(portProvider, sidebar, notebook, profile);
  }

  const vsFrameRole = vitalSourceFrameRole();
  if (vsFrameRole === 'container') {
    const vitalSourceInjector = new VitalSourceInjector(annotatorConfig);
    destroyables.push(vitalSourceInjector);
  } else {
    // Set up automatic injection of the client into iframes in this frame.
    const hypothesisInjector = new HypothesisInjector(
      document.body,
      annotatorConfig
    );

    // Create the guest that handles creating annotations and displaying highlights.
    const guest = new Guest(document.body, annotatorConfig, hostFrame);

    // When the client is unloaded in the host frame, also unload it from any
    // connected iframes.
    guest.on('hostDisconnected', resolveUnloadRequested);

    destroyables.push(hypothesisInjector, guest);
  }

  unloadRequested.then(() => {
    destroyables.forEach(instance => instance.destroy());

    // Remove all the `<link>`, `<script>` and `<style>` elements added to the
    // page by the boot script.
    const clientAssets = document.querySelectorAll('[data-hypothesis-asset]');
    clientAssets.forEach(el => el.remove());

    // If this is a guest-only frame, remove client config added by the host
    // frame. This enables the client to later be re-loaded in this frame.
    removeTemporaryClientConfig();
  });
}

/**
 * Returns a Promise that resolves when the document has loaded (but subresources
 * may still be loading).
 */
function documentReady(): Promise<void> {
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
