/* global process */

import { parseJsonConfig } from '../boot/parse-json-config';
import * as rendererOptions from '../shared/renderer-options';

import {
  startServer as startRPCServer,
  preStartServer as preStartRPCServer,
} from './cross-origin-rpc.js';
import addAnalytics from './ga';
import disableOpenerForExternalLinks from './util/disable-opener-for-external-links';
import { fetchConfig } from './util/fetch-config';
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

if (appConfig.googleAnalytics) {
  addAnalytics(appConfig.googleAnalytics);
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
 */
// @inject
function setupRoute(groups, session, router) {
  Promise.all([groups.load(), session.load()]).finally(() => {
    router.sync();
  });
}

/**
 * Send a page view event when the app starts up.
 *
 * We don't bother tracking route changes later because the client only uses a
 * single route in a given session.
 */
// @inject
function sendPageView(analytics) {
  analytics.sendPageView();
}

/**
 * Fetch any persisted client-side defaults, and persist any app-state changes to
 * those defaults
 */
// @inject
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
function setupFrameSync(frameSync, isSidebar) {
  if (isSidebar) {
    frameSync.connect(true);
  }
}

// Register icons used by the sidebar app (and maybe other assets in future).
import { registerIcons } from '../shared/components/svg-icon';
import iconSet from './icons';
registerIcons(iconSet);

// The entry point component for the app.
import { createElement, render } from 'preact';
import HypothesisApp from './components/hypothesis-app';
import { ServiceContext } from './util/service-context';

// Services.
import bridgeService from '../shared/bridge';

import analyticsService from './services/analytics';
import annotationsService from './services/annotations';
import apiService from './services/api';
import apiRoutesService from './services/api-routes';
import authService from './services/oauth-auth';
import autosaveService from './services/autosave';
import featuresService from './services/features';
import frameSyncService from './services/frame-sync';
import groupsService from './services/groups';
import loadAnnotationsService from './services/load-annotations';
import localStorageService from './services/local-storage';
import persistedDefaultsService from './services/persisted-defaults';
import routerService from './services/router';
import serviceUrlService from './services/service-url';
import sessionService from './services/session';
import streamFilterService from './services/stream-filter';
import streamerService from './services/streamer';
import tagsService from './services/tags';
import threadsService from './services/threads';
import toastMessenger from './services/toast-messenger';

// Redux store.
import store from './store';

// Utilities.
import { Injector } from '../shared/injector';

function startApp(config) {
  const container = new Injector();

  const isSidebar = !(
    window.location.pathname.startsWith('/stream') ||
    window.location.pathname.startsWith('/a/') ||
    window.location.pathname.startsWith('/notebook')
  );

  // Register services.
  container
    .register('analytics', analyticsService)
    .register('annotationsService', annotationsService)
    .register('api', apiService)
    .register('apiRoutes', apiRoutesService)
    .register('auth', authService)
    .register('autosaveService', autosaveService)
    .register('bridge', bridgeService)
    .register('features', featuresService)
    .register('frameSync', frameSyncService)
    .register('groups', groupsService)
    .register('loadAnnotationsService', loadAnnotationsService)
    .register('localStorage', localStorageService)
    .register('persistedDefaults', persistedDefaultsService)
    .register('router', routerService)
    .register('serviceUrl', serviceUrlService)
    .register('session', sessionService)
    .register('streamer', streamerService)
    .register('streamFilter', streamFilterService)
    .register('tags', tagsService)
    .register('threadsService', threadsService)
    .register('toastMessenger', toastMessenger)
    .register('store', store);

  // Register utility values/classes.
  //
  // nb. In many cases these can be replaced by direct imports in the services
  // that use them, since they don't depend on instances of other services.
  container
    .register('$window', { value: window })
    .register('isSidebar', { value: isSidebar })
    .register('settings', { value: config });

  // Initialize services.
  container.run(persistDefaults);
  container.run(autosave);
  container.run(sendPageView);
  container.run(setupApi);
  container.run(setupRoute);
  container.run(startRPCServer);
  container.run(setupFrameSync);

  // Render the UI.
  const appEl = /** @type {HTMLElement} */ (document.querySelector(
    'hypothesis-app'
  ));
  render(
    <ServiceContext.Provider value={container}>
      <HypothesisApp />
    </ServiceContext.Provider>,
    appEl
  );
}

// Start capturing RPC requests before we start the RPC server (startRPCServer)
preStartRPCServer();

fetchConfig(appConfig)
  .then(config => {
    startApp(config);
  })
  .catch(err => {
    // Report error. This will be the only notice that the user gets because the
    // sidebar does not currently appear at all if the app fails to start.
    console.error('Failed to start Hypothesis client: ', err);
  });
