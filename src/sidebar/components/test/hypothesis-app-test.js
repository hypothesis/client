'use strict';

var angular = require('angular');
var proxyquire = require('proxyquire');

var events = require('../../events');
var bridgeEvents = require('../../../shared/bridge-events');
var util = require('../../../shared/test/util');

describe('hypothesisApp', function () {
  var $componentController = null;
  var $scope = null;
  var $rootScope = null;
  var fakeAnnotationMetadata = null;
  var fakeAnnotationUI = null;
  var fakeAnalytics = null;
  var fakeAuth = null;
  var fakeBridge = null;
  var fakeDrafts = null;
  var fakeFeatures = null;
  var fakeFlash = null;
  var fakeFrameSync = null;
  var fakeLocation = null;
  var fakeParams = null;
  var fakeServiceConfig = null;
  var fakeSession = null;
  var fakeGroups = null;
  var fakeRoute = null;
  var fakeServiceUrl = null;
  var fakeSettings = null;
  var fakeStreamer = null;
  var fakeWindow = null;

  var sandbox = null;

  var createController = function (locals) {
    locals = locals || {};
    locals.$scope = $scope;
    return $componentController('hypothesisApp', locals);
  };

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(function () {
    fakeAnnotationMetadata = {
      location: function () { return 0; },
    };

    fakeServiceConfig = sandbox.stub();

    var component = proxyquire('../hypothesis-app', util.noCallThru({
      'angular': angular,
      '../annotation-metadata': fakeAnnotationMetadata,
      '../service-config': fakeServiceConfig,
    }));

    angular.module('h', [])
      .component('hypothesisApp', component);
  });

  beforeEach(angular.mock.module('h'));

  beforeEach(angular.mock.module(function ($provide) {
    fakeAnnotationUI = {
      tool: 'comment',
      clearSelectedAnnotations: sandbox.spy(),
    };

    fakeAnalytics = {
      track: sandbox.stub(),
      events: require('../../analytics')().events,
    };

    fakeAuth = {};

    fakeDrafts = {
      contains: sandbox.stub(),
      remove: sandbox.spy(),
      all: sandbox.stub().returns([]),
      discard: sandbox.spy(),
      count: sandbox.stub().returns(0),
      unsaved: sandbox.stub().returns([]),
    };

    fakeFeatures = {
      fetch: sandbox.spy(),
      flagEnabled: sandbox.stub().returns(false),
    };

    fakeFlash = {
      error: sandbox.stub(),
    };

    fakeFrameSync = {
      connect: sandbox.spy(),
    };

    fakeLocation = {
      search: sandbox.stub().returns({}),
    };

    fakeParams = {id: 'test'};

    fakeSession = {
      load: sandbox.stub().returns(Promise.resolve({userid: null})),
      logout: sandbox.stub(),
      reload: sandbox.stub().returns(Promise.resolve({userid: null})),
    };

    fakeGroups = {focus: sandbox.spy()};

    fakeRoute = {reload: sandbox.spy()};

    fakeWindow = {
      top: {},
      confirm: sandbox.stub(),
      open: sandbox.stub(),
    };

    fakeServiceUrl = sinon.stub();
    fakeSettings = {};
    fakeStreamer = {
      countPendingUpdates: sinon.stub(),
      applyPendingUpdates: sinon.stub(),
    };
    fakeBridge = {
      call: sandbox.stub(),
    };

    $provide.value('annotationUI', fakeAnnotationUI);
    $provide.value('auth', fakeAuth);
    $provide.value('analytics', fakeAnalytics);
    $provide.value('drafts', fakeDrafts);
    $provide.value('features', fakeFeatures);
    $provide.value('flash', fakeFlash);
    $provide.value('frameSync', fakeFrameSync);
    $provide.value('serviceUrl', fakeServiceUrl);
    $provide.value('session', fakeSession);
    $provide.value('settings', fakeSettings);
    $provide.value('bridge', fakeBridge);
    $provide.value('streamer', fakeStreamer);
    $provide.value('groups', fakeGroups);
    $provide.value('$route', fakeRoute);
    $provide.value('$location', fakeLocation);
    $provide.value('$routeParams', fakeParams);
    $provide.value('$window', fakeWindow);
  }));

  beforeEach(angular.mock.inject(function (_$componentController_, _$rootScope_) {
    $componentController = _$componentController_;
    $rootScope = _$rootScope_;
    $scope = $rootScope.$new();
  }));

  afterEach(function () {
    sandbox.restore();
  });

  describe('isSidebar property', function () {

    it('is false if the window is the top window', function () {
      fakeWindow.top = fakeWindow;
      var ctrl = createController();
      assert.isFalse(ctrl.isSidebar);
    });

    it('is true if the window is not the top window', function () {
      fakeWindow.top = {};
      var ctrl = createController();
      assert.isTrue(ctrl.isSidebar);
    });
  });

  it('connects to host frame in the sidebar app', function () {
    fakeWindow.top = {};
    createController();
    assert.called(fakeFrameSync.connect);
  });

  it('does not connect to the host frame in the stream', function () {
    fakeWindow.top = fakeWindow;
    createController();
    assert.notCalled(fakeFrameSync.connect);
  });

  it('auth.status is "unknown" on startup', function () {
    var ctrl = createController();
    assert.equal(ctrl.auth.status, 'unknown');
  });

  it('sets auth.status to "logged-out" if userid is null', function () {
    var ctrl = createController();
    return fakeSession.load().then(function () {
      assert.equal(ctrl.auth.status, 'logged-out');
    });
  });

  it('sets auth.status to "logged-in" if userid is non-null', function () {
    fakeSession.load = function () {
      return Promise.resolve({userid: 'acct:jim@hypothes.is'});
    };
    var ctrl = createController();
    return fakeSession.load().then(function () {
      assert.equal(ctrl.auth.status, 'logged-in');
    });
  });

  it('sets userid, username, and provider properties at login', function () {
    fakeSession.load = function () {
      return Promise.resolve({userid: 'acct:jim@hypothes.is'});
    };
    var ctrl = createController();
    return fakeSession.load().then(function () {
      assert.equal(ctrl.auth.userid, 'acct:jim@hypothes.is');
      assert.equal(ctrl.auth.username, 'jim');
      assert.equal(ctrl.auth.provider, 'hypothes.is');
    });
  });

  it('updates auth when the logged-in user changes', function () {
    var ctrl = createController();
    return fakeSession.load().then(function () {
      $scope.$broadcast(events.USER_CHANGED, {
        initialLoad: false,
        userid: 'acct:john@hypothes.is',
      });
      assert.deepEqual(ctrl.auth, {
        status: 'logged-in',
        userid: 'acct:john@hypothes.is',
        username: 'john',
        provider: 'hypothes.is',
      });
    });
  });

  it('exposes the serviceUrl on the controller', function () {
    var ctrl = createController();
    assert.equal(ctrl.serviceUrl, fakeServiceUrl);
  });

  it('does not show login form for logged in users', function () {
    var ctrl = createController();
    assert.isFalse(ctrl.accountDialog.visible);
  });

  it('does not show the share dialog at start', function () {
    var ctrl = createController();
    assert.isFalse(ctrl.shareDialog.visible);
  });

  it('does not reload the view when the logged-in user changes on first load', function () {
    createController();
    fakeRoute.reload = sinon.spy();
    $scope.$broadcast(events.USER_CHANGED, {initialLoad: true});
    assert.notCalled(fakeRoute.reload);
  });

  it('reloads the view when the logged-in user changes after first load', function () {
    createController();
    fakeRoute.reload = sinon.spy();
    $scope.$broadcast(events.USER_CHANGED, {initialLoad: false});
    assert.calledOnce(fakeRoute.reload);
  });

  describe('#signUp', function () {
    it('tracks sign up requests in analytics', function () {
      var ctrl = createController();
      ctrl.signUp();
      assert.calledWith(fakeAnalytics.track, fakeAnalytics.events.SIGN_UP_REQUESTED);
    });

    context('when using a third-party service', function () {
      beforeEach(function () {
        fakeServiceConfig.returns({});
      });

      it('sends SIGNUP_REQUESTED event', function () {
        var ctrl = createController();
        ctrl.signUp();
        assert.calledWith(fakeBridge.call, bridgeEvents.SIGNUP_REQUESTED);
      });

      it('does not open a URL directly', function () {
        var ctrl = createController();
        ctrl.signUp();
        assert.notCalled(fakeWindow.open);
      });
    });

    context('when not using a third-party service', function () {
      it('opens the signup URL in a new tab', function () {
        fakeServiceUrl.withArgs('signup').returns('https://ann.service/signup');
        var ctrl = createController();
        ctrl.signUp();
        assert.calledWith(fakeWindow.open, 'https://ann.service/signup');
      });
    });
  });

  describe('#showHelpPanel', function () {
    context('when using a third-party service', function () {
      context("when there's no onHelpRequest callback function", function () {
        beforeEach('configure a service with no onHelpRequest', function () {
          fakeServiceConfig.returns({});
        });

        it('does not send an event', function () {
          createController().showHelpPanel();

          assert.notCalled(fakeBridge.call);
        });

        it('shows the help panel', function () {
          var ctrl = createController();

          ctrl.showHelpPanel();

          assert.isTrue(ctrl.helpPanel.visible);
        });
      });

      context("when there's an onHelpRequest callback function", function () {
        beforeEach('provide an onHelpRequest callback', function () {
          fakeServiceConfig.returns({onHelpRequestProvided: true});
        });

        it('sends the HELP_REQUESTED event', function () {
          createController().showHelpPanel();

          assert.calledWith(fakeBridge.call, bridgeEvents.HELP_REQUESTED);
        });

        it('does not show the help panel', function () {
          var ctrl = createController();

          ctrl.showHelpPanel();

          assert.isFalse(ctrl.helpPanel.visible);
        });
      });

    });

    context('when not using a third-party service', function () {
      it('does not send an event', function () {
        createController().showHelpPanel();

        assert.notCalled(fakeBridge.call);
      });

      it('shows the help panel', function () {
        var ctrl = createController();

        ctrl.showHelpPanel();

        assert.isTrue(ctrl.helpPanel.visible);
      });
    });
  });

  describe('#login()', function () {
    context('when using cookie auth', () => {
      it('shows the login dialog if not using a third-party service', function () {
        // If no third-party annotation service is in use then it should show the
        // built-in login dialog.
        var ctrl = createController();
        ctrl.login();
        assert.equal(ctrl.accountDialog.visible, true);
      });
    });

    context('when using OAuth', () => {
      beforeEach(() => {
        fakeAuth.login = sinon.stub().returns(Promise.resolve());
      });

      it('does not show the login dialog', () => {
        var ctrl = createController();
        ctrl.login();
        assert.equal(ctrl.accountDialog.visible, false);
      });

      it('initiates the OAuth login flow', () => {
        var ctrl = createController();
        ctrl.login();
        assert.called(fakeAuth.login);
      });

      it('reloads the session when login completes', () => {
        var ctrl = createController();
        return ctrl.login().then(() => {
          assert.called(fakeSession.reload);
        });
      });

      it('reports an error if login fails', () => {
        fakeAuth.login.returns(Promise.reject(new Error('Login failed')));

        var ctrl = createController();

        return ctrl.login().then(null, () => {
          assert.called(fakeFlash.error);
        });
      });
    });

    it('sends LOGIN_REQUESTED if a third-party service is in use', function () {
      // If the client is using a third-party annotation service then clicking
      // on a login button should send the LOGIN_REQUESTED event over the bridge
      // (so that the partner site we're embedded in can do its own login
      // thing).
      fakeServiceConfig.returns({});
      var ctrl = createController();

      ctrl.login();

      assert.equal(fakeBridge.call.callCount, 1);
      assert.isTrue(fakeBridge.call.calledWithExactly(bridgeEvents.LOGIN_REQUESTED));
    });
  });

  describe('#share()', function () {
    it('shows the share dialog', function () {
      var ctrl = createController();
      ctrl.share();
      assert.equal(ctrl.shareDialog.visible, true);
    });
  });

  describe('#logout()', function () {

    // Tests shared by both of the contexts below.
    function doSharedTests() {
      it('prompts the user if there are drafts', function () {
        fakeDrafts.count.returns(1);
        var ctrl = createController();

        ctrl.logout();

        assert.equal(fakeWindow.confirm.callCount, 1);
      });

      it('emits "annotationDeleted" for each unsaved draft annotation', function () {
        fakeDrafts.unsaved = sandbox.stub().returns(
          ['draftOne', 'draftTwo', 'draftThree']
        );
        var ctrl = createController();
        $rootScope.$emit = sandbox.stub();

        ctrl.logout();

        assert($rootScope.$emit.calledThrice);
        assert.deepEqual(
          $rootScope.$emit.firstCall.args, ['annotationDeleted', 'draftOne']);
        assert.deepEqual(
          $rootScope.$emit.secondCall.args, ['annotationDeleted', 'draftTwo']);
        assert.deepEqual(
          $rootScope.$emit.thirdCall.args, ['annotationDeleted', 'draftThree']);
      });

      it('discards draft annotations', function () {
        var ctrl = createController();

        ctrl.logout();

        assert(fakeDrafts.discard.calledOnce);
      });

      it('does not emit "annotationDeleted" if the user cancels the prompt', function () {
        var ctrl = createController();
        fakeDrafts.count.returns(1);
        $rootScope.$emit = sandbox.stub();
        fakeWindow.confirm.returns(false);

        ctrl.logout();

        assert($rootScope.$emit.notCalled);
      });

      it('does not discard drafts if the user cancels the prompt', function () {
        var ctrl = createController();
        fakeDrafts.count.returns(1);
        fakeWindow.confirm.returns(false);

        ctrl.logout();

        assert(fakeDrafts.discard.notCalled);
      });

      it('does not prompt if there are no drafts', function () {
        var ctrl = createController();
        fakeDrafts.count.returns(0);

        ctrl.logout();

        assert.equal(fakeWindow.confirm.callCount, 0);
      });
    }

    context('when no third-party service is in use', function () {
      doSharedTests();

      it('calls session.logout()', function () {
        var ctrl = createController();
        ctrl.logout();
        assert.called(fakeSession.logout);
      });
    });

    context('when a third-party service is in use', function () {
      beforeEach('configure a third-party service to be in use', function() {
        fakeServiceConfig.returns({});
      });

      doSharedTests();

      it('sends LOGOUT_REQUESTED', function () {
        createController().logout();

        assert.calledOnce(fakeBridge.call);
        assert.calledWithExactly(fakeBridge.call, bridgeEvents.LOGOUT_REQUESTED);
      });

      it('does not send LOGOUT_REQUESTED if the user cancels the prompt', function () {
        fakeDrafts.count.returns(1);
        fakeWindow.confirm.returns(false);

        createController().logout();

        assert.notCalled(fakeBridge.call);
      });

      it('does not call session.logout()', function () {
        createController().logout();

        assert.notCalled(fakeSession.logout);
      });
    });
  });
});
