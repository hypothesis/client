'use strict';

var addAnalytics = require('./ga');
require('../shared/polyfills');

var raven;

// Read settings rendered into sidebar app HTML by service/extension.
var settings = require('../shared/settings')(document);

if (settings.raven) {
  // Initialize Raven. This is required at the top of this file
  // so that it happens early in the app's startup flow
  raven = require('./raven');
  raven.init(settings.raven);
}

var hostPageConfig = require('./host-config');
Object.assign(settings, hostPageConfig(window));

// Disable Angular features that are not compatible with CSP.
//
// See https://docs.angularjs.org/api/ng/directive/ngCsp
//
// The `ng-csp` attribute must be set on some HTML element in the document
// _before_ Angular is require'd for the first time.
document.body.setAttribute('ng-csp', '');

var angular = require('angular');

// autofill-event relies on the existence of window.angular so
// it must be require'd after angular is first require'd
require('autofill-event');

// Setup Angular integration for Raven
if (settings.raven) {
  raven.angularModule(angular);
} else {
  angular.module('ngRaven', []);
}

if(settings.googleAnalytics){
  addAnalytics(settings.googleAnalytics);
}

// Fetch external state that the app needs before it can run. This includes the
// authenticated user state, the API endpoint URLs and WebSocket connection.
var resolve = {
  // @ngInject
  sessionState: function (session) {
    return session.load();
  },
};

// @ngInject
function configureLocation($locationProvider) {
  // Use HTML5 history
  return $locationProvider.html5Mode(true);
}

// @ngInject
var VIEWER_TEMPLATE = require('./templates/viewer.html');

function configureRoutes($routeProvider) {
  $routeProvider.when('/a/:id',
    {
      controller: 'AnnotationViewerController',
      template: VIEWER_TEMPLATE,
      reloadOnSearch: false,
      resolve: resolve,
    });
  $routeProvider.when('/stream',
    {
      controller: 'StreamController',
      template: VIEWER_TEMPLATE,
      reloadOnSearch: false,
      resolve: resolve,
    });
  $routeProvider.otherwise({
    controller: 'WidgetController',
    template: VIEWER_TEMPLATE,
    reloadOnSearch: false,
    resolve: resolve,
  });
}

// @ngInject
function configureHttp($httpProvider) {
  // Use the Pyramid XSRF header name
  $httpProvider.defaults.xsrfHeaderName = 'X-CSRF-Token';
}

// @ngInject
function setupHttp($http, streamer) {
  $http.defaults.headers.common['X-Client-Id'] = streamer.clientId;
}

function processAppOpts() {
  if (settings.liveReloadServer) {
    require('./live-reload-client').connect(settings.liveReloadServer);
  }
}

var authService;
if (Array.isArray(settings.services)) {
  authService = require('./oauth-auth');
} else {
  authService = require('./auth');
}

module.exports = angular.module('h', [
  // Angular addons which export the Angular module name
  // via module.exports
  require('angular-jwt'),
  require('angular-resource'),
  require('angular-route'),
  require('angular-sanitize'),
  require('angular-toastr'),

  // Angular addons which do not export the Angular module
  // name via module.exports
  ['angulartics', require('angulartics')][0],
  ['angulartics.google.analytics', require('angulartics/src/angulartics-ga')][0],
  ['ngTagsInput', require('ng-tags-input')][0],
  ['ui.bootstrap', require('./vendor/ui-bootstrap-custom-tpls-0.13.4')][0],

  // Local addons
  'ngRaven',
])

  .controller('AnnotationViewerController', require('./annotation-viewer-controller'))
  .controller('StreamController', require('./stream-controller'))
  .controller('WidgetController', require('./widget-controller'))

  // The root component for the application
  .directive('hypothesisApp', require('./directive/app'))

  // UI components and helpers
  .directive('annotation', require('./directive/annotation').directive)
  .directive('annotationShareDialog', require('./directive/annotation-share-dialog'))
  .directive('annotationThread', require('./directive/annotation-thread'))
  .directive('dropdownMenuBtn', require('./directive/dropdown-menu-btn'))
  .directive('excerpt', require('./directive/excerpt').directive)
  .directive('formInput', require('./directive/form-input'))
  .directive('formValidate', require('./directive/form-validate'))
  .directive('groupList', require('./directive/group-list').directive)
  .directive('helpLink', require('./directive/help-link'))
  .directive('helpPanel', require('./directive/help-panel'))
  .directive('hAutofocus', require('./directive/h-autofocus'))
  .directive('hOnTouch', require('./directive/h-on-touch'))
  .directive('hTooltip', require('./directive/h-tooltip'))
  .directive('loggedoutMessage', require('./directive/loggedout-message'))
  .directive('loginControl', require('./directive/login-control'))
  .directive('loginForm', require('./directive/login-form').directive)
  .directive('markdown', require('./directive/markdown'))
  .directive('publishAnnotationBtn', require('./directive/publish-annotation-btn'))
  .directive('searchStatusBar', require('./directive/search-status-bar'))
  .directive('shareDialog', require('./directive/share-dialog'))
  .directive('sidebarTutorial', require('./directive/sidebar-tutorial').directive)
  .directive('searchInput', require('./directive/search-input'))
  .directive('selectionTabs', require('./directive/selection-tabs'))
  .directive('sortDropdown', require('./directive/sort-dropdown'))
  .directive('spinner', require('./directive/spinner'))
  .directive('statusButton', require('./directive/status-button'))
  .directive('svgIcon', require('./directive/svg-icon'))
  .directive('tagEditor', require('./directive/tag-editor'))
  .directive('threadList', require('./directive/thread-list'))
  .directive('timestamp', require('./directive/timestamp'))
  .directive('topBar', require('./directive/top-bar'))
  .directive('windowScroll', require('./directive/window-scroll'))

  .service('analytics', require('./analytics'))
  .service('annotationMapper', require('./annotation-mapper'))
  .service('annotationUI', require('./annotation-ui'))
  .service('auth', authService)
  .service('bridge', require('../shared/bridge'))
  .service('drafts', require('./drafts'))
  .service('features', require('./features'))
  .service('flash', require('./flash'))
  .service('formRespond', require('./form-respond'))
  .service('frameSync', require('./frame-sync').default)
  .service('groups', require('./groups'))
  .service('host', require('./host'))
  .service('localStorage', require('./local-storage'))
  .service('permissions', require('./permissions'))
  .service('queryParser', require('./query-parser'))
  .service('rootThread', require('./root-thread'))
  .service('searchFilter', require('./search-filter'))
  .service('serviceUrl', require('./service-url'))
  .service('session', require('./session'))
  .service('streamer', require('./streamer'))
  .service('streamFilter', require('./stream-filter'))
  .service('tags', require('./tags'))
  .service('unicode', require('./unicode'))
  .service('viewFilter', require('./view-filter'))

  .factory('store', require('./store'))

  .value('Discovery', require('../shared/discovery'))
  .value('ExcerptOverflowMonitor', require('./directive/excerpt-overflow-monitor'))
  .value('VirtualThreadList', require('./virtual-thread-list'))
  .value('raven', require('./raven'))
  .value('settings', settings)
  .value('time', require('./time'))
  .value('urlEncodeFilter', require('./filter/url').encode)

  .config(configureHttp)
  .config(configureLocation)
  .config(configureRoutes)

  .run(setupHttp);

processAppOpts();

var appEl = document.querySelector('hypothesis-app');
angular.bootstrap(appEl, ['h'], {strictDi: true});
