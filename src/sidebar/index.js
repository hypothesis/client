const addAnalytics = require('./ga');
const disableOpenerForExternalLinks = require('./util/disable-opener-for-external-links');
const { fetchConfig } = require('./util/fetch-config');
const serviceConfig = require('./service-config');
const { jsonConfigsFrom } = require('../shared/settings');
const crossOriginRPC = require('./cross-origin-rpc.js');
const sentry = require('./util/sentry');

// Read settings rendered into sidebar app HTML by service/extension.
const appConfig = jsonConfigsFrom(document);

if (appConfig.sentry) {
  // Initialize Sentry. This is required at the top of this file
  // so that it happens early in the app's startup flow
  sentry.init(appConfig.sentry);
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

// Preact UI components that are wrapped for use within Angular templates.
const AnnotationActionBar = require('./components/annotation-action-bar');
const AnnotationBody = require('./components/annotation-body');
const AnnotationHeader = require('./components/annotation-header');
const AnnotationLicense = require('./components/annotation-license');
const AnnotationOmega = require('./components/annotation-omega');
const AnnotationPublishControl = require('./components/annotation-publish-control');
const AnnotationQuote = require('./components/annotation-quote');
const FocusedModeHeader = require('./components/focused-mode-header');
const HelpPanel = require('./components/help-panel');
const LoggedOutMessage = require('./components/logged-out-message');
const ModerationBanner = require('./components/moderation-banner');
const SearchStatusBar = require('./components/search-status-bar');
const SelectionTabs = require('./components/selection-tabs');
const ShareAnnotationsPanel = require('./components/share-annotations-panel');
const SidebarContentError = require('./components/sidebar-content-error');
const SvgIcon = require('./components/svg-icon');
const TagEditor = require('./components/tag-editor');
const TagList = require('./components/tag-list');
const TopBar = require('./components/top-bar');

// Remaining UI components that are still built with Angular.
const annotation = require('./components/annotation');
const annotationThread = require('./components/annotation-thread');
const annotationViewerContent = require('./components/annotation-viewer-content');
const hypothesisApp = require('./components/hypothesis-app');
const sidebarContent = require('./components/sidebar-content');
const streamContent = require('./components/stream-content');
const threadList = require('./components/thread-list');

// Angular directives.
const hAutofocusDirective = require('./directive/h-autofocus');
const hBrandingDirective = require('./directive/h-branding');
const hOnTouchDirective = require('./directive/h-on-touch');
const hTooltipDirective = require('./directive/h-tooltip');
const windowScrollDirective = require('./directive/window-scroll');

// Services.
const analyticsService = require('./services/analytics');
const annotationMapperService = require('./services/annotation-mapper');
const annotationsService = require('./services/annotations');
const apiService = require('./services/api');
const apiRoutesService = require('./services/api-routes');
const authService = require('./services/oauth-auth');
const bridgeService = require('../shared/bridge');
const featuresService = require('./services/features');
const flashService = require('./services/flash');
const { default: frameSyncService } = require('./services/frame-sync');
const groupsService = require('./services/groups');
const localStorageService = require('./services/local-storage');
const permissionsService = require('./services/permissions');
const rootThreadService = require('./services/root-thread');
const searchFilterService = require('./services/search-filter');
const serviceUrlService = require('./services/service-url');
const sessionService = require('./services/session');
const streamerService = require('./services/streamer');
const streamFilterService = require('./services/stream-filter');
const tagsService = require('./services/tags');
const unicodeService = require('./services/unicode');
const viewFilterService = require('./services/view-filter');

const store = require('./store');

// Utilities.
const Discovery = require('../shared/discovery');
const OAuthClient = require('./util/oauth-client');
const VirtualThreadList = require('./virtual-thread-list');
const random = require('./util/random');
const time = require('./util/time');
const { encode: urlEncodeFilter } = require('./filter/url');

function startAngularApp(config) {
  angular
    .module('h', [
      // Angular addons which export the Angular module name
      // via module.exports
      require('angular-route'),
      require('angular-toastr'),
    ])

    // The root component for the application
    .component('hypothesisApp', hypothesisApp)

    // UI components
    .component('annotation', annotation)
    .component('annotationBody', wrapReactComponent(AnnotationBody))
    .component('annotationHeader', wrapReactComponent(AnnotationHeader))
    .component('annotationActionBar', wrapReactComponent(AnnotationActionBar))
    .component('annotationLicense', wrapReactComponent(AnnotationLicense))
    .component('annotationOmega', wrapReactComponent(AnnotationOmega))
    .component(
      'annotationPublishControl',
      wrapReactComponent(AnnotationPublishControl)
    )
    .component('annotationQuote', wrapReactComponent(AnnotationQuote))
    .component('annotationThread', annotationThread)
    .component('annotationViewerContent', annotationViewerContent)
    .component('helpPanel', wrapReactComponent(HelpPanel))
    .component('loggedOutMessage', wrapReactComponent(LoggedOutMessage))
    .component('moderationBanner', wrapReactComponent(ModerationBanner))
    .component('searchStatusBar', wrapReactComponent(SearchStatusBar))
    .component('focusedModeHeader', wrapReactComponent(FocusedModeHeader))
    .component('selectionTabs', wrapReactComponent(SelectionTabs))
    .component('sidebarContent', sidebarContent)
    .component('sidebarContentError', wrapReactComponent(SidebarContentError))
    .component(
      'shareAnnotationsPanel',
      wrapReactComponent(ShareAnnotationsPanel)
    )
    .component('streamContent', streamContent)
    .component('svgIcon', wrapReactComponent(SvgIcon))
    .component('tagEditor', wrapReactComponent(TagEditor))
    .component('tagList', wrapReactComponent(TagList))
    .component('threadList', threadList)
    .component('topBar', wrapReactComponent(TopBar))
    .directive('hAutofocus', hAutofocusDirective)
    .directive('hBranding', hBrandingDirective)
    .directive('hOnTouch', hOnTouchDirective)
    .directive('hTooltip', hTooltipDirective)
    .directive('windowScroll', windowScrollDirective)

    .service('analytics', analyticsService)
    .service('annotationMapper', annotationMapperService)
    .service('annotations', annotationsService)
    .service('api', apiService)
    .service('apiRoutes', apiRoutesService)
    .service('auth', authService)
    .service('bridge', bridgeService)
    .service('features', featuresService)
    .service('flash', flashService)
    .service('frameSync', frameSyncService)
    .service('groups', groupsService)
    .service('localStorage', localStorageService)
    .service('permissions', permissionsService)
    .service('rootThread', rootThreadService)
    .service('searchFilter', searchFilterService)
    .service('serviceUrl', serviceUrlService)
    .service('session', sessionService)
    .service('streamer', streamerService)
    .service('streamFilter', streamFilterService)
    .service('tags', tagsService)
    .service('unicode', unicodeService)
    .service('viewFilter', viewFilterService)

    // Redux store
    .service('store', store)

    // Utilities
    .value('Discovery', Discovery)
    .value('OAuthClient', OAuthClient)
    .value('VirtualThreadList', VirtualThreadList)
    .value('isSidebar', isSidebar)
    .value('random', random)
    .value('serviceConfig', serviceConfig)
    .value('settings', config)
    .value('time', time)
    .value('urlEncodeFilter', urlEncodeFilter)

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
