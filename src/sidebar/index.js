import { parseJsonConfig } from '../boot/parse-json-config';

import { checkEnvironment } from './config/check-env';
import { buildSettings } from './config/build-settings';
import {
  startServer as startRPCServer,
  preStartServer as preStartRPCServer,
} from './cross-origin-rpc.js';
import { disableOpenerForExternalLinks } from './util/disable-opener-for-external-links';
import * as sentry from './util/sentry';

// Read settings rendered into sidebar app HTML by service/extension.
const configFromSidebar =
  /** @type {import('../types/config').ConfigFromSidebar} */ (
    parseJsonConfig(document)
  );

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

// Load polyfill for :focus-visible pseudo-class.
import 'focus-visible';

// Enable debugging checks for Preact. Removed in prod builds by Rollup config.
import 'preact/debug';

/**
 * @param {import('./services/api').APIService} api
 * @param {import('./services/streamer').StreamerService} streamer
 * @inject
 */
function setupApi(api, streamer) {
  api.setClientId(streamer.clientId);
}

/**
 * Perform the initial fetch of groups and user profile and then set the initial
 * route to match the current URL.
 *
 * @param {import('./services/groups').GroupsService} groups
 * @param {import('./services/session').SessionService} session
 * @param {import('./services/router').RouterService} router
 * @inject
 */
function setupRoute(groups, session, router) {
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
 * @param {import('./services/autosave').AutosaveService} autosaveService
 * @param {import('./services/persisted-defaults').PersistedDefaultsService} persistedDefaults
 * @param {import('./services/service-url').ServiceURLService} serviceURL
 * @inject
 */
function initServices(autosaveService, persistedDefaults, serviceURL) {
  autosaveService.init();
  persistedDefaults.init();
  serviceURL.init();
}

/**
 * @param {import('./services/frame-sync').FrameSyncService} frameSync
 * @param {import('./store').SidebarStore} store
 * @inject
 */
function setupFrameSync(frameSync, store) {
  if (store.route() === 'sidebar') {
    frameSync.connect();
  }
}

// The entry point component for the app.
import { render } from 'preact';
import HypothesisApp from './components/HypothesisApp';
import LaunchErrorPanel from './components/LaunchErrorPanel';
import { ServiceContext } from './service-context';

// Services.
import { AnnotationsService } from './services/annotations';
import { AnnotationActivityService } from './services/annotation-activity';
import { APIService } from './services/api';
import { APIRoutesService } from './services/api-routes';
import { AuthService } from './services/auth';
import { AutosaveService } from './services/autosave';
import { FrameSyncService } from './services/frame-sync';
import { GroupsService } from './services/groups';
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

// Redux store.
import { createSidebarStore } from './store';

// Utilities.
import { Injector } from '../shared/injector';

/**
 * Launch the client application corresponding to the current URL.
 *
 * @param {import('../types/config').SidebarSettings} settings
 * @param {HTMLElement} appEl - Root HTML container for the app
 */
function startApp(settings, appEl) {
  const container = new Injector();

  // Register services.
  container
    .register('annotationsService', AnnotationsService)
    .register('annotationActivity', AnnotationActivityService)
    .register('api', APIService)
    .register('apiRoutes', APIRoutesService)
    .register('auth', AuthService)
    .register('autosaveService', AutosaveService)
    .register('frameSync', FrameSyncService)
    .register('groups', GroupsService)
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
    appEl
  );
}

/**
 * @param {Error} error
 * @param {HTMLElement} appEl
 */
function reportLaunchError(error, appEl) {
  // Report error. In the sidebar the console log is the only notice the user
  // gets because the sidebar does not appear at all if the app fails to start.
  console.error('Failed to start Hypothesis client: ', error);

  // For apps where the UI is visible (eg. notebook, single-annotation view),
  // show an error notice.
  render(<LaunchErrorPanel error={error} />, appEl);
}

const appEl = /** @type {HTMLElement} */ (
  document.querySelector('hypothesis-app')
);

// Start capturing RPC requests before we start the RPC server (startRPCServer)
preStartRPCServer();

buildSettings(configFromSidebar)
  .then(settings => {
    startApp(settings, appEl);
  })
  .catch(err => reportLaunchError(err, appEl));
