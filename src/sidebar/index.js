/* global process */

import { jsonConfigsFrom } from '../shared/settings';
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
const appConfig = jsonConfigsFrom(document);

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

const isSidebar = !(
  window.location.pathname.startsWith('/stream') ||
  window.location.pathname.startsWith('/a/')
);

// Install Preact renderer options to work around IE11 quirks
rendererOptions.setupIE11Fixes();

// @ngInject
function setupApi(api, streamer) {
  api.setClientId(streamer.clientId);
}

/**
 * Perform the initial fetch of groups and user profile and then set the initial
 * route to match the current URL.
 */
// @ngInject
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
// @ngInject
function sendPageView(analytics) {
  analytics.sendPageView();
}

/**
 * Fetch any persisted client-side defaults, and persist any app-state changes to
 * those defaults
 */
// @ngInject
function persistDefaults(persistedDefaults) {
  persistedDefaults.init();
}

/**
 * Set up autosave-new-highlights service
 */
// @ngInject
function autosave(autosaveService) {
  autosaveService.init();
}

// @ngInject
function setupFrameSync(frameSync) {
  if (isSidebar) {
    frameSync.connect();
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
import rootThreadService from './services/root-thread';
import routerService from './services/router';
import searchFilterService from './services/search-filter';
import serviceUrlService from './services/service-url';
import sessionService from './services/session';
import streamFilterService from './services/stream-filter';
import streamerService from './services/streamer';
import tagsService from './services/tags';
import threadsService from './services/threads';
import toastMessenger from './services/toast-messenger';
import unicodeService from './services/unicode';
import viewFilterService from './services/view-filter';

// Redux store.
import store from './store';

// Utilities.
import { Injector } from '../shared/injector';
import EventEmitter from 'tiny-emitter';

function startApp(config) {
  const container = new Injector();

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
    .register('rootThread', rootThreadService)
    .register('router', routerService)
    .register('searchFilter', searchFilterService)
    .register('serviceUrl', serviceUrlService)
    .register('session', sessionService)
    .register('streamer', streamerService)
    .register('streamFilter', streamFilterService)
    .register('tags', tagsService)
    .register('threadsService', threadsService)
    .register('toastMessenger', toastMessenger)
    .register('unicode', unicodeService)
    .register('viewFilter', viewFilterService)
    .register('store', store);

  // Register a dummy `$rootScope` pub-sub service for services that still
  // use it.
  const emitter = new EventEmitter();
  const dummyRootScope = {
    $on: (event, callback) => emitter.on(event, data => callback({}, data)),
    $broadcast: (event, data) => emitter.emit(event, data),
  };
  container.register('$rootScope', { value: dummyRootScope });

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
  const appEl = document.querySelector('hypothesis-app');
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
