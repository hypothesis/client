/* global process */

import { parseJsonConfig } from '../boot/parse-json-config';
import * as rendererOptions from '../shared/renderer-options';

import {
  startServer as startRPCServer,
  preStartServer as preStartRPCServer,
} from './cross-origin-rpc.js';
import disableOpenerForExternalLinks from './util/disable-opener-for-external-links';
import { fetchConfig } from './config/fetch-config';
import * as sentry from './util/sentry';

// Read settings rendered into sidebar app HTML by service/extension.
const appConfig = /** @type {import('../types/config').SidebarConfig} */ (parseJsonConfig(
  document
));

if (appConfig.sentry) {
  // Initialize Sentry. This is required at the top of this file
  // so that it happens early in the app's startup flow
  sentry.init(appConfig.sentry);
}

// Prevent tab-jacking.
disableOpenerForExternalLinks(document.body);

// Load polyfill for :focus-visible pseudo-class.
import 'focus-visible';

// Enable debugging checks for Preact.
if (process.env.NODE_ENV !== 'production') {
  require('preact/debug');
}

// Install Preact renderer options to work around browser quirks
rendererOptions.setupBrowserFixes();

// @inject
function setupApi(api, streamer) {
  api.setClientId(streamer.clientId);
}

/**
 * Perform the initial fetch of groups and user profile and then set the initial
 * route to match the current URL.
 *
 * @param {Object} groups
 * @param {Object} session
 * @param {import('./services/router').RouterService} router
 */
// @inject
function setupRoute(groups, session, router) {
  groups.load();
  session.load();
  router.sync();
}

/**
 * Fetch any persisted client-side defaults, and persist any app-state changes to
 * those defaults
 *
 * @param {import('./services/persisted-defaults').PersistedDefaultsService} persistedDefaults
 * @inject
 */
function persistDefaults(persistedDefaults) {
  persistedDefaults.init();
}

/**
 * Set up autosave-new-highlights service
 */
// @inject
function autosave(autosaveService) {
  autosaveService.init();
}

// @inject
function setupFrameSync(frameSync, store) {
  if (store.route() === 'sidebar') {
    frameSync.connect(true);
  }
}

// Register icons used by the sidebar app (and maybe other assets in future).
import { registerIcons } from '@hypothesis/frontend-shared';
import iconSet from './icons';

registerIcons(iconSet);

// The entry point component for the app.
import { render } from 'preact';
import HypothesisApp from './components/HypothesisApp';
import LaunchErrorPanel from './components/LaunchErrorPanel';
import { ServiceContext } from './service-context';

// Services.
import bridgeService from '../shared/bridge';

import { AnnotationsService } from './services/annotations';
import apiService from './services/api';
import { APIRoutesService } from './services/api-routes';
import authService from './services/oauth-auth';
import autosaveService from './services/autosave';
import featuresService from './services/features';
import frameSyncService from './services/frame-sync';
import groupsService from './services/groups';
import loadAnnotationsService from './services/load-annotations';
import { LocalStorageService } from './services/local-storage';
import { PersistedDefaultsService } from './services/persisted-defaults';
import { RouterService } from './services/router';
import serviceUrlService from './services/service-url';
import sessionService from './services/session';
import { StreamFilter } from './services/stream-filter';
import streamerService from './services/streamer';
import { TagsService } from './services/tags';
import { ThreadsService } from './services/threads';
import { ToastMessengerService } from './services/toast-messenger';

// Redux store.
import store from './store';

// Utilities.
import { Injector } from '../shared/injector';

/**
 * Launch the client application corresponding to the current URL.
 *
 * @param {object} config
 * @param {HTMLElement} appEl - Root HTML container for the app
 */
function startApp(config, appEl) {
  const container = new Injector();

  // Register services.
  container
    .register('annotationsService', AnnotationsService)
    .register('api', apiService)
    .register('apiRoutes', APIRoutesService)
    .register('auth', authService)
    .register('autosaveService', autosaveService)
    .register('bridge', bridgeService)
    .register('features', featuresService)
    .register('frameSync', frameSyncService)
    .register('groups', groupsService)
    .register('loadAnnotationsService', loadAnnotationsService)
    .register('localStorage', LocalStorageService)
    .register('persistedDefaults', PersistedDefaultsService)
    .register('router', RouterService)
    .register('serviceUrl', serviceUrlService)
    .register('session', sessionService)
    .register('streamer', streamerService)
    .register('streamFilter', StreamFilter)
    .register('tags', TagsService)
    .register('threadsService', ThreadsService)
    .register('toastMessenger', ToastMessengerService)
    .register('store', store);

  // Register utility values/classes.
  //
  // nb. In many cases these can be replaced by direct imports in the services
  // that use them, since they don't depend on instances of other services.
  container
    .register('$window', { value: window })
    .register('settings', { value: config });

  // Initialize services.
  container.run(persistDefaults);
  container.run(autosave);
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

const appEl = /** @type {HTMLElement} */ (document.querySelector(
  'hypothesis-app'
));

// Start capturing RPC requests before we start the RPC server (startRPCServer)
preStartRPCServer();

fetchConfig(appConfig)
  .then(config => {
    startApp(config, appEl);
  })
  .catch(err => {
    // Report error. In the sidebar the console log is the only notice the user
    // gets because the sidebar does not appear at all if the app fails to start.
    console.error('Failed to start Hypothesis client: ', err);

    // For apps where the UI is visible (eg. notebook, single-annotation view),
    // show an error notice.
    render(<LaunchErrorPanel error={err} />, appEl);
  });
