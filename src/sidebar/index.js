'use strict';

const addAnalytics = require('./ga');
const disableOpenerForExternalLinks = require('./util/disable-opener-for-external-links');
const { fetchConfig } = require('./util/fetch-config');
const serviceConfig = require('./service-config');
const crossOriginRPC = require('./cross-origin-rpc.js');

let raven;

// Read settings rendered into sidebar app HTML by service/extension.
const appConfig = require('../shared/settings').jsonConfigsFrom(document);

if (appConfig.raven) {
  // Initialize Raven. This is required at the top of this file
  // so that it happens early in the app's startup flow
  raven = require('./raven');
  raven.init(appConfig.raven);
}

// Disable Angular features that are not compatible with CSP.
//
// See https://docs.angularjs.org/api/ng/directive/ngCsp
//
// The `ng-csp` attribute must be set on some HTML element in the document
// _before_ Angular is require'd for the first time.
document.body.setAttribute('ng-csp', '');

// Prevent tab-jacking.
disableOpenerForExternalLinks(document.body);

const angular = require('angular');

// autofill-event relies on the existence of window.angular so
// it must be require'd after angular is first require'd
require('autofill-event');

// Load polyfill for :focus-visible pseudo-class.
require('focus-visible');

// Enable debugging checks for Preact.
require('preact/debug');

const wrapReactComponent = require('./util/wrap-react-component');

// Setup Angular integration for Raven
if (appConfig.raven) {
  raven.angularModule(angular);
} else {
  angular.module('ngRaven', []);
}

if (appConfig.googleAnalytics) {
  addAnalytics(appConfig.googleAnalytics);
}

// Fetch external state that the app needs before it can run. This includes the
// user's profile and list of groups.
const resolve = {
  // @ngInject
  state: function(groups, session) {
    return Promise.all([groups.load(), session.load()]);
  },
};

const isSidebar = !(
  window.location.pathname.startsWith('/stream') ||
  window.location.pathname.startsWith('/a/')
);

// @ngInject
function configureLocation($locationProvider) {
  // Use HTML5 history
  return $locationProvider.html5Mode(true);
}

// @ngInject
function configureRoutes($routeProvider) {
  // The `vm.{auth,search}` properties used in these templates come from the
  // `<hypothesis-app>` component which hosts the router's container element.
  $routeProvider.when('/a/:id', {
    template: '<annotation-viewer-content></annotation-viewer-content>',
    reloadOnSearch: false,
    resolve: resolve,
  });
  $routeProvider.when('/stream', {
    template: '<stream-content></stream-content>',
    reloadOnSearch: false,
    resolve: resolve,
  });
  $routeProvider.otherwise({
    template:
      '<sidebar-content auth="vm.auth" on-login="vm.login()"></sidebar-content>',
    reloadOnSearch: false,
    resolve: resolve,
  });
}

// @ngInject
function configureToastr(toastrConfig) {
  angular.extend(toastrConfig, {
    preventOpenDuplicates: true,
  });
}

// @ngInject
function setupApi(api, streamer) {
  api.setClientId(streamer.clientId);
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

function startAngularApp(config) {
  angular
    .module('h', [
      // Angular addons which export the Angular module name
      // via module.exports
      require('angular-route'),
      require('angular-toastr'),

      // Angular addons which do not export the Angular module
      // name via module.exports
      ['ngTagsInput', require('ng-tags-input')][0],

      // Local addons
      'ngRaven',
    ])

    // The root component for the application
    .component('hypothesisApp', require('./components/hypothesis-app'))

    // UI components
    .component('annotation', require('./components/annotation'))
    .component(
      'annotationHeader',
      wrapReactComponent(require('./components/annotation-header'))
    )
    .component(
      'annotationActionButton',
      wrapReactComponent(require('./components/annotation-action-button'))
    )
    .component(
      'annotationPublishControl',
      wrapReactComponent(require('./components/annotation-publish-control'))
    )
    .component(
      'annotationShareDialog',
      require('./components/annotation-share-dialog')
    )
    .component('annotationThread', require('./components/annotation-thread'))
    .component(
      'annotationViewerContent',
      require('./components/annotation-viewer-content')
    )
    .component('excerpt', require('./components/excerpt'))
    .component(
      'helpLink',
      wrapReactComponent(require('./components/help-link'))
    )
    .component('helpPanel', require('./components/help-panel'))
    .component(
      'loggedOutMessage',
      wrapReactComponent(require('./components/logged-out-message'))
    )
    .component('markdown', require('./components/markdown'))
    .component(
      'moderationBanner',
      wrapReactComponent(require('./components/moderation-banner'))
    )
    .component(
      'searchStatusBar',
      wrapReactComponent(require('./components/search-status-bar'))
    )
    .component(
      'focusedModeHeader',
      wrapReactComponent(require('./components/focused-mode-header'))
    )
    .component(
      'selectionTabs',
      wrapReactComponent(require('./components/selection-tabs'))
    )
    .component('sidebarContent', require('./components/sidebar-content'))
    .component(
      'sidebarContentError',
      wrapReactComponent(require('./components/sidebar-content-error'))
    )
    .component('sidebarTutorial', require('./components/sidebar-tutorial'))
    .component('shareDialog', require('./components/share-dialog'))
    .component('streamContent', require('./components/stream-content'))
    .component('svgIcon', wrapReactComponent(require('./components/svg-icon')))
    .component('tagEditor', require('./components/tag-editor'))
    .component('threadList', require('./components/thread-list'))
    .component('topBar', wrapReactComponent(require('./components/top-bar')))
    .directive('hAutofocus', require('./directive/h-autofocus'))
    .directive('hBranding', require('./directive/h-branding'))
    .directive('hOnTouch', require('./directive/h-on-touch'))
    .directive('hTooltip', require('./directive/h-tooltip'))
    .directive('windowScroll', require('./directive/window-scroll'))

    .service('analytics', require('./services/analytics'))
    .service('annotationMapper', require('./services/annotation-mapper'))
    .service('annotations', require('./services/annotations'))
    .service('api', require('./services/api'))
    .service('apiRoutes', require('./services/api-routes'))
    .service('auth', require('./services/oauth-auth'))
    .service('bridge', require('../shared/bridge'))
    .service('features', require('./services/features'))
    .service('flash', require('./services/flash'))
    .service('frameSync', require('./services/frame-sync').default)
    .service('groups', require('./services/groups'))
    .service('localStorage', require('./services/local-storage'))
    .service('permissions', require('./services/permissions'))
    .service('rootThread', require('./services/root-thread'))
    .service('searchFilter', require('./services/search-filter'))
    .service('serviceUrl', require('./services/service-url'))
    .service('session', require('./services/session'))
    .service('streamer', require('./services/streamer'))
    .service('streamFilter', require('./services/stream-filter'))
    .service('tags', require('./services/tags'))
    .service('unicode', require('./services/unicode'))
    .service('viewFilter', require('./services/view-filter'))

    // Redux store
    .service('store', require('./store'))

    // Utilities
    .value('Discovery', require('../shared/discovery'))
    .value('ExcerptOverflowMonitor', require('./util/excerpt-overflow-monitor'))
    .value('OAuthClient', require('./util/oauth-client'))
    .value('VirtualThreadList', require('./virtual-thread-list'))
    .value('isSidebar', isSidebar)
    .value('random', require('./util/random'))
    .value('raven', require('./raven'))
    .value('serviceConfig', serviceConfig)
    .value('settings', config)
    .value('time', require('./util/time'))
    .value('urlEncodeFilter', require('./filter/url').encode)

    .config(configureLocation)
    .config(configureRoutes)
    .config(configureToastr)

    .run(sendPageView)
    .run(setupApi)
    .run(crossOriginRPC.server.start);

  if (config.liveReloadServer) {
    require('./live-reload-client').connect(config.liveReloadServer);
  }

  // Work around a check in Angular's $sniffer service that causes it to
  // incorrectly determine that Firefox extensions are Chrome Packaged Apps which
  // do not support the HTML 5 History API. This results Angular redirecting the
  // browser on startup and thus the app fails to load.
  // See https://github.com/angular/angular.js/blob/a03b75c6a812fcc2f616fc05c0f1710e03fca8e9/src/ng/sniffer.js#L30
  if (window.chrome && !window.chrome.app) {
    window.chrome.app = {
      dummyAddedByHypothesisClient: true,
    };
  }

  const appEl = document.querySelector('hypothesis-app');
  angular.bootstrap(appEl, ['h'], { strictDi: true });
}

fetchConfig(appConfig)
  .then(config => {
    startAngularApp(config);
  })
  .catch(err => {
    // Report error. This will be the only notice that the user gets because the
    // sidebar does not currently appear at all if the Angular app fails to
    // start.
    console.error('Failed to start Hypothesis client: ', err);
  });
