'use strict';

const angular = require('angular');

const events = require('../../events');
const bridgeEvents = require('../../../shared/bridge-events');

const hypothesisApp = require('../hypothesis-app');

describe('sidebar.components.hypothesis-app', function() {
  let $componentController = null;
  let $scope = null;
  let $rootScope = null;
  let fakeStore = null;
  let fakeAnalytics = null;
  let fakeAuth = null;
  let fakeBridge = null;
  let fakeFeatures = null;
  let fakeFlash = null;
  let fakeFrameSync = null;
  let fakeParams = null;
  let fakeServiceConfig = null;
  let fakeSession = null;
  let fakeGroups = null;
  let fakeRoute = null;
  let fakeServiceUrl = null;
  let fakeSettings = null;
  let fakeWindow = null;

  let sandbox = null;

  const createController = function(locals) {
    locals = locals || {};
    locals.$scope = $scope;
    return $componentController('hypothesisApp', locals);
  };

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(function() {
    fakeServiceConfig = sandbox.stub();

    hypothesisApp.$imports.$mock({
      '../service-config': fakeServiceConfig,
    });

    angular.module('h', []).component('hypothesisApp', hypothesisApp);
  });

  afterEach(() => {
    hypothesisApp.$imports.$restore();
  });

  beforeEach(angular.mock.module('h'));

  beforeEach(
    angular.mock.module(function($provide) {
      fakeStore = {
        tool: 'comment',
        clearSelectedAnnotations: sandbox.spy(),
        getState: sinon.stub(),
        clearGroups: sinon.stub(),
        // draft store
        countDrafts: sandbox.stub().returns(0),
        discardAllDrafts: sandbox.stub(),
        unsavedAnnotations: sandbox.stub().returns([]),
      };

      fakeAnalytics = {
        track: sandbox.stub(),
        events: require('../../services/analytics').events,
      };

      fakeAuth = {};

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

      fakeParams = { id: 'test' };

      fakeSession = {
        load: sandbox.stub().returns(Promise.resolve({ userid: null })),
        logout: sandbox.stub(),
        reload: sandbox.stub().returns(Promise.resolve({ userid: null })),
      };

      fakeGroups = {
        focus: sandbox.spy(),
      };

      fakeRoute = { reload: sandbox.spy() };

      fakeWindow = {
        top: {},
        confirm: sandbox.stub(),
        open: sandbox.stub(),
      };

      fakeServiceUrl = sinon.stub();
      fakeSettings = {};
      fakeBridge = {
        call: sandbox.stub(),
      };

      $provide.value('store', fakeStore);
      $provide.value('auth', fakeAuth);
      $provide.value('analytics', fakeAnalytics);
      $provide.value('features', fakeFeatures);
      $provide.value('flash', fakeFlash);
      $provide.value('frameSync', fakeFrameSync);
      $provide.value('serviceUrl', fakeServiceUrl);
      $provide.value('session', fakeSession);
      $provide.value('settings', fakeSettings);
      $provide.value('bridge', fakeBridge);
      $provide.value('groups', fakeGroups);
      $provide.value('$route', fakeRoute);
      $provide.value('$routeParams', fakeParams);
      $provide.value('$window', fakeWindow);
    })
  );

  beforeEach(
    angular.mock.inject(function(_$componentController_, _$rootScope_) {
      $componentController = _$componentController_;
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
    })
  );

  afterEach(function() {
    sandbox.restore();
  });

  describe('#isSidebar', function() {
    it('is false if the window is the top window', function() {
      fakeWindow.top = fakeWindow;
      const ctrl = createController();
      assert.isFalse(ctrl.isSidebar);
    });

    it('is true if the window is not the top window', function() {
      fakeWindow.top = {};
      const ctrl = createController();
      assert.isTrue(ctrl.isSidebar);
    });
  });

  it('connects to host frame in the sidebar app', function() {
    fakeWindow.top = {};
    createController();
    assert.called(fakeFrameSync.connect);
  });

  it('does not connect to the host frame in the stream', function() {
    fakeWindow.top = fakeWindow;
    createController();
    assert.notCalled(fakeFrameSync.connect);
  });

  it('auth.status is "unknown" on startup', function() {
    const ctrl = createController();
    assert.equal(ctrl.auth.status, 'unknown');
  });

  it('sets auth.status to "logged-out" if userid is null', function() {
    const ctrl = createController();
    return fakeSession.load().then(function() {
      assert.equal(ctrl.auth.status, 'logged-out');
    });
  });

  it('sets auth.status to "logged-in" if userid is non-null', function() {
    fakeSession.load = function() {
      return Promise.resolve({ userid: 'acct:jim@hypothes.is' });
    };
    const ctrl = createController();
    return fakeSession.load().then(function() {
      assert.equal(ctrl.auth.status, 'logged-in');
    });
  });

  [
    {
      // User who has set a display name
      profile: {
        userid: 'acct:jim@hypothes.is',
        user_info: {
          display_name: 'Jim Smith',
        },
      },
      expectedAuth: {
        status: 'logged-in',
        userid: 'acct:jim@hypothes.is',
        username: 'jim',
        provider: 'hypothes.is',
        displayName: 'Jim Smith',
      },
    },
    {
      // User who has not set a display name
      profile: {
        userid: 'acct:jim@hypothes.is',
        user_info: {
          display_name: null,
        },
      },
      expectedAuth: {
        status: 'logged-in',
        userid: 'acct:jim@hypothes.is',
        username: 'jim',
        provider: 'hypothes.is',
        displayName: 'jim',
      },
    },
  ].forEach(({ profile, expectedAuth }) => {
    it('sets `auth` properties when profile has loaded', () => {
      fakeSession.load = () => Promise.resolve(profile);
      const ctrl = createController();
      return fakeSession.load().then(() => {
        assert.deepEqual(ctrl.auth, expectedAuth);
      });
    });
  });

  it('updates auth when the logged-in user changes', function() {
    const ctrl = createController();
    return fakeSession.load().then(function() {
      $scope.$broadcast(events.USER_CHANGED, {
        profile: {
          userid: 'acct:john@hypothes.is',
        },
      });
      assert.deepEqual(ctrl.auth, {
        status: 'logged-in',
        displayName: 'john',
        userid: 'acct:john@hypothes.is',
        username: 'john',
        provider: 'hypothes.is',
      });
    });
  });

  it('does not show the share dialog at start', function() {
    const ctrl = createController();
    assert.isFalse(ctrl.shareDialog.visible);
  });

  describe('#signUp', function() {
    it('tracks sign up requests in analytics', function() {
      const ctrl = createController();
      ctrl.signUp();
      assert.calledWith(
        fakeAnalytics.track,
        fakeAnalytics.events.SIGN_UP_REQUESTED
      );
    });

    context('when using a third-party service', function() {
      beforeEach(function() {
        fakeServiceConfig.returns({});
      });

      it('sends SIGNUP_REQUESTED event', function() {
        const ctrl = createController();
        ctrl.signUp();
        assert.calledWith(fakeBridge.call, bridgeEvents.SIGNUP_REQUESTED);
      });

      it('does not open a URL directly', function() {
        const ctrl = createController();
        ctrl.signUp();
        assert.notCalled(fakeWindow.open);
      });
    });

    context('when not using a third-party service', function() {
      it('opens the signup URL in a new tab', function() {
        fakeServiceUrl.withArgs('signup').returns('https://ann.service/signup');
        const ctrl = createController();
        ctrl.signUp();
        assert.calledWith(fakeWindow.open, 'https://ann.service/signup');
      });
    });
  });

  describe('#showHelpPanel', function() {
    context('when using a third-party service', function() {
      context("when there's no onHelpRequest callback function", function() {
        beforeEach('configure a service with no onHelpRequest', function() {
          fakeServiceConfig.returns({});
        });

        it('does not send an event', function() {
          createController().showHelpPanel();

          assert.notCalled(fakeBridge.call);
        });

        it('shows the help panel', function() {
          const ctrl = createController();

          ctrl.showHelpPanel();

          assert.isTrue(ctrl.helpPanel.visible);
        });
      });

      context("when there's an onHelpRequest callback function", function() {
        beforeEach('provide an onHelpRequest callback', function() {
          fakeServiceConfig.returns({ onHelpRequestProvided: true });
        });

        it('sends the HELP_REQUESTED event', function() {
          createController().showHelpPanel();

          assert.calledWith(fakeBridge.call, bridgeEvents.HELP_REQUESTED);
        });

        it('does not show the help panel', function() {
          const ctrl = createController();

          ctrl.showHelpPanel();

          assert.isFalse(ctrl.helpPanel.visible);
        });
      });
    });

    context('when not using a third-party service', function() {
      it('does not send an event', function() {
        createController().showHelpPanel();

        assert.notCalled(fakeBridge.call);
      });

      it('shows the help panel', function() {
        const ctrl = createController();

        ctrl.showHelpPanel();

        assert.isTrue(ctrl.helpPanel.visible);
      });
    });
  });

  describe('#login()', function() {
    beforeEach(() => {
      fakeAuth.login = sinon.stub().returns(Promise.resolve());
      fakeStore.getState.returns({ directLinkedGroupFetchFailed: false });
    });

    it('clears groups', () => {
      const ctrl = createController();

      return ctrl.login().then(() => {
        assert.called(fakeStore.clearGroups);
      });
    });

    it('initiates the OAuth login flow', () => {
      const ctrl = createController();
      ctrl.login();
      assert.called(fakeAuth.login);
    });

    it('reloads the session when login completes', () => {
      const ctrl = createController();
      return ctrl.login().then(() => {
        assert.called(fakeSession.reload);
      });
    });

    it('reports an error if login fails', () => {
      fakeAuth.login.returns(Promise.reject(new Error('Login failed')));

      const ctrl = createController();

      return ctrl.login().then(null, () => {
        assert.called(fakeFlash.error);
      });
    });

    it('sends LOGIN_REQUESTED if a third-party service is in use', function() {
      // If the client is using a third-party annotation service then clicking
      // on a login button should send the LOGIN_REQUESTED event over the bridge
      // (so that the partner site we're embedded in can do its own login
      // thing).
      fakeServiceConfig.returns({});
      const ctrl = createController();

      ctrl.login();

      assert.equal(fakeBridge.call.callCount, 1);
      assert.isTrue(
        fakeBridge.call.calledWithExactly(bridgeEvents.LOGIN_REQUESTED)
      );
    });
  });

  describe('#share()', function() {
    it('shows the share dialog', function() {
      const ctrl = createController();
      ctrl.share();
      assert.equal(ctrl.shareDialog.visible, true);
    });
  });

  describe('#logout()', function() {
    // Tests shared by both of the contexts below.
    function doSharedTests() {
      it('prompts the user if there are drafts', function() {
        fakeStore.countDrafts.returns(1);
        const ctrl = createController();

        ctrl.logout();

        assert.equal(fakeWindow.confirm.callCount, 1);
      });

      it('clears groups', () => {
        const ctrl = createController();

        ctrl.logout();

        assert.called(fakeStore.clearGroups);
      });

      it('emits "annotationDeleted" for each unsaved draft annotation', function() {
        fakeStore.unsavedAnnotations = sandbox
          .stub()
          .returns(['draftOne', 'draftTwo', 'draftThree']);
        const ctrl = createController();
        $rootScope.$emit = sandbox.stub();

        ctrl.logout();

        assert($rootScope.$emit.calledThrice);
        assert.deepEqual($rootScope.$emit.firstCall.args, [
          'annotationDeleted',
          'draftOne',
        ]);
        assert.deepEqual($rootScope.$emit.secondCall.args, [
          'annotationDeleted',
          'draftTwo',
        ]);
        assert.deepEqual($rootScope.$emit.thirdCall.args, [
          'annotationDeleted',
          'draftThree',
        ]);
      });

      it('discards draft annotations', function() {
        const ctrl = createController();

        ctrl.logout();

        assert(fakeStore.discardAllDrafts.calledOnce);
      });

      it('does not emit "annotationDeleted" if the user cancels the prompt', function() {
        const ctrl = createController();
        fakeStore.countDrafts.returns(1);
        $rootScope.$emit = sandbox.stub();
        fakeWindow.confirm.returns(false);

        ctrl.logout();

        assert($rootScope.$emit.notCalled);
      });

      it('does not discard drafts if the user cancels the prompt', function() {
        const ctrl = createController();
        fakeStore.countDrafts.returns(1);
        fakeWindow.confirm.returns(false);

        ctrl.logout();

        assert(fakeStore.discardAllDrafts.notCalled);
      });

      it('does not prompt if there are no drafts', function() {
        const ctrl = createController();
        fakeStore.countDrafts.returns(0);

        ctrl.logout();

        assert.equal(fakeWindow.confirm.callCount, 0);
      });
    }

    context('when no third-party service is in use', function() {
      doSharedTests();

      it('calls session.logout()', function() {
        const ctrl = createController();
        ctrl.logout();
        assert.called(fakeSession.logout);
      });
    });

    context('when a third-party service is in use', function() {
      beforeEach('configure a third-party service to be in use', function() {
        fakeServiceConfig.returns({});
      });

      doSharedTests();

      it('sends LOGOUT_REQUESTED', function() {
        createController().logout();

        assert.calledOnce(fakeBridge.call);
        assert.calledWithExactly(
          fakeBridge.call,
          bridgeEvents.LOGOUT_REQUESTED
        );
      });

      it('does not send LOGOUT_REQUESTED if the user cancels the prompt', function() {
        fakeStore.countDrafts.returns(1);
        fakeWindow.confirm.returns(false);

        createController().logout();

        assert.notCalled(fakeBridge.call);
      });

      it('does not call session.logout()', function() {
        createController().logout();

        assert.notCalled(fakeSession.logout);
      });
    });
  });
});
