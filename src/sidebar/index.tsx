// Load polyfill for :focus-visible pseudo-class.
import 'focus-visible';
import { render } from 'preact';
// Enable debugging checks for Preact. Removed in prod builds by Rollup config.
import 'preact/debug';

import { parseJsonConfig } from '../boot/parse-json-config';
import { Injector } from '../shared/injector';
import type { ConfigFromSidebar } from '../types/config';
import type { SidebarSettings } from '../types/config';
import HypothesisApp from './components/HypothesisApp';
import LaunchErrorPanel from './components/LaunchErrorPanel';
import { buildSettings } from './config/build-settings';
import { checkEnvironment } from './config/check-env';
import {
  startServer as startRPCServer,
  preStartServer as preStartRPCServer,
} from './cross-origin-rpc';
import { ServiceContext } from './service-context';
import { AnnotationActivityService } from './services/annotation-activity';
import { AnnotationsService } from './services/annotations';
import { AnnotationsExporter } from './services/annotations-exporter';
import { APIService } from './services/api';
import { APIRoutesService } from './services/api-routes';
import { AuthService } from './services/auth';
import { AutosaveService } from './services/autosave';
import { FrameSyncService } from './services/frame-sync';
import { GroupsService } from './services/groups';
import { ImportAnnotationsService } from './services/import-annotations';
import { LoadAnnotationsService } from './services/load-annotations';
import { LocalStorageService } from './services/local-storage';
import { PersistedDefaultsService } from './services/persisted-defaults';
import { RouterService } from './services/router';
import { ServiceURLService } from './services/service-url';
import { SessionService } from './services/session';
import { StreamFilter } from './services/stream-filter';
import { StreamerService } from './services/streamer';
import { TagsService } from './services/tags';
import { ThreadsService } from './services/threads';
import { ToastMessengerService } from './services/toast-messenger';
import { createSidebarStore } from './store';
import type { SidebarStore } from './store';
import { disableOpenerForExternalLinks } from './util/disable-opener-for-external-links';
import * as sentry from './util/sentry';

// Read settings rendered into sidebar app HTML by service/extension.
const configFromSidebar = parseJsonConfig(document) as ConfigFromSidebar;

// Check for known issues which may prevent the client from working.
//
// If any checks fail we'll log warnings and disable error reporting, but try
// and continue anyway.
const envOk = checkEnvironment(window);

if (configFromSidebar.sentry && envOk) {
  // Initialize Sentry. This is required at the top of this file
  // so that it happens early in the app's startup flow
  sentry.init(configFromSidebar.sentry);
}

// Prevent tab-jacking.
disableOpenerForExternalLinks(document.body);

/**
 * @inject
 */
function setupApi(api: APIService, streamer: StreamerService) {
  api.setClientId(streamer.clientId);
}

/**
 * Perform the initial fetch of groups and user profile and then set the initial
 * route to match the current URL.
 *
 * @inject
 */
function setupRoute(
  groups: GroupsService,
  session: SessionService,
  router: RouterService,
) {
  groups.load();
  session.load();
  router.sync();
}

/**
 * Initialize background processes provided by various services.
 *
 * These processes include persisting or synchronizing data from one place
 * to another.
 *
 * @inject
 */
function initServices(
  autosaveService: AutosaveService,
  persistedDefaults: PersistedDefaultsService,
  serviceURL: ServiceURLService,
) {
  autosaveService.init();
  persistedDefaults.init();
  serviceURL.init();
}

/**
 * Setup connection between sidebar and host page.
 *
 * @inject
 */
function setupFrameSync(
  frameSync: FrameSyncService,
  store: SidebarStore,
  toastMessenger: ToastMessengerService,
) {
  if (store.route() === 'sidebar') {
    frameSync.connect().catch(() => {
      toastMessenger.error(
        'Hypothesis failed to connect to the web page. Try reloading the page.',
        {
          autoDismiss: false,
        },
      );
    });
  }
}

/**
 * Launch the client application corresponding to the current URL.
 *
 * @param appEl - Root HTML container for the app
 */
function startApp(settings: SidebarSettings, appEl: HTMLElement) {
  const container = new Injector();

  // Register services.
  container
    .register('annotationsExporter', AnnotationsExporter)
    .register('annotationsService', AnnotationsService)
    .register('annotationActivity', AnnotationActivityService)
    .register('api', APIService)
    .register('apiRoutes', APIRoutesService)
    .register('auth', AuthService)
    .register('autosaveService', AutosaveService)
    .register('frameSync', FrameSyncService)
    .register('groups', GroupsService)
    .register('importAnnotationsService', ImportAnnotationsService)
    .register('loadAnnotationsService', LoadAnnotationsService)
    .register('localStorage', LocalStorageService)
    .register('persistedDefaults', PersistedDefaultsService)
    .register('router', RouterService)
    .register('serviceURL', ServiceURLService)
    .register('session', SessionService)
    .register('streamer', StreamerService)
    .register('streamFilter', StreamFilter)
    .register('tags', TagsService)
    .register('threadsService', ThreadsService)
    .register('toastMessenger', ToastMessengerService)
    .register('store', { factory: createSidebarStore });

  // Register utility values/classes.
  //
  // nb. In many cases these can be replaced by direct imports in the services
  // that use them, since they don't depend on instances of other services.
  container
    .register('$window', { value: window })
    .register('settings', { value: settings });

  // Initialize services.
  container.run(initServices);
  container.run(setupApi);
  container.run(setupRoute);
  container.run(startRPCServer);
  container.run(setupFrameSync);

  // Render the UI.
  render(
    <ServiceContext.Provider value={container}>
      <HypothesisApp />
    </ServiceContext.Provider>,
    appEl,
  );
}

function reportLaunchError(error: Error, appEl: HTMLElement) {
  // Report error. In the sidebar the console log is the only notice the user
  // gets because the sidebar does not appear at all if the app fails to start.
  console.error('Failed to start Hypothesis client: ', error);

  // For apps where the UI is visible (eg. notebook, single-annotation view),
  // show an error notice.
  render(<LaunchErrorPanel error={error} />, appEl);
}

const appEl = document.querySelector('hypothesis-app') as HTMLElement;

// Start capturing RPC requests before we start the RPC server (startRPCServer)
preStartRPCServer();

buildSettings(configFromSidebar)
  .then(settings => {
    startApp(settings, appEl);
  })
  .catch(err => reportLaunchError(err, appEl));
