import { mount } from 'enzyme';
import { createElement } from 'preact';

import bridgeEvents from '../../../shared/bridge-events';
import mockImportedComponents from '../../../test-util/mock-imported-components';

import HypothesisApp, { $imports } from '../hypothesis-app';

describe('HypothesisApp', () => {
  let fakeStore = null;
  let fakeAuth = null;
  let fakeBridge = null;
  let fakeServiceConfig = null;
  let fakeSession = null;
  let fakeShouldAutoDisplayTutorial = null;
  let fakeServiceUrl = null;
  let fakeSettings = null;
  let fakeToastMessenger = null;

  const createComponent = (props = {}) => {
    return mount(
      <HypothesisApp
        auth={fakeAuth}
        bridge={fakeBridge}
        serviceUrl={fakeServiceUrl}
        settings={fakeSettings}
        session={fakeSession}
        toastMessenger={fakeToastMessenger}
        {...props}
      />
    );
  };

  beforeEach(() => {
    fakeServiceConfig = sinon.stub();
    fakeShouldAutoDisplayTutorial = sinon.stub().returns(false);

    fakeStore = {
      clearSelectedAnnotations: sinon.spy(),
      clearGroups: sinon.stub(),
      closeSidebarPanel: sinon.stub(),
      openSidebarPanel: sinon.stub(),
      // draft store
      countDrafts: sinon.stub().returns(0),
      discardAllDrafts: sinon.stub(),
      unsavedAnnotations: sinon.stub().returns([]),
      removeAnnotations: sinon.stub(),

      hasFetchedProfile: sinon.stub().returns(true),
      profile: sinon.stub().returns({
        userid: null,
        preferences: {
          show_sidebar_tutorial: false,
        },
      }),
      route: sinon.stub().returns('sidebar'),
    };

    fakeAuth = {};

    fakeSession = {
      load: sinon.stub().returns(Promise.resolve({ userid: null })),
      logout: sinon.stub(),
      reload: sinon.stub().returns(Promise.resolve({ userid: null })),
    };

    fakeServiceUrl = sinon.stub();

    fakeSettings = {};

    fakeBridge = {
      call: sinon.stub(),
    };

    fakeToastMessenger = {
      error: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../service-config': fakeServiceConfig,
      '../store/use-store': callback => callback(fakeStore),
      '../util/session': {
        shouldAutoDisplayTutorial: fakeShouldAutoDisplayTutorial,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('does not render content if route is not yet determined', () => {
    fakeStore.route.returns(null);
    const wrapper = createComponent();
    [
      'main',
      'AnnotationViewerContent',
      'StreamContent',
      'SidebarContent',
    ].forEach(contentComponent => {
      assert.isFalse(wrapper.exists(contentComponent));
    });
  });

  [
    {
      route: 'annotation',
      contentComponent: 'AnnotationViewerContent',
    },
    {
      route: 'sidebar',
      contentComponent: 'SidebarContent',
    },
    {
      route: 'stream',
      contentComponent: 'StreamContent',
    },
  ].forEach(({ route, contentComponent }) => {
    it('renders app content for route', () => {
      fakeStore.route.returns(route);
      const wrapper = createComponent();
      assert.isTrue(wrapper.find(contentComponent).exists());
    });
  });

  describe('auto-opening tutorial', () => {
    it('should open tutorial on profile load when criteria are met', () => {
      fakeShouldAutoDisplayTutorial.returns(true);
      createComponent();
      assert.calledOnce(fakeStore.openSidebarPanel);
    });

    it('should not open tutorial on profile load when criteria are not met', () => {
      fakeShouldAutoDisplayTutorial.returns(false);
      createComponent();
      assert.notCalled(fakeStore.openSidebarPanel);
    });
  });

  const getAuthState = wrapper => wrapper.find('TopBar').prop('auth');

  it('auth state is "unknown" if profile has not yet been fetched', () => {
    fakeStore.hasFetchedProfile.returns(false);
    const wrapper = createComponent();
    assert.equal(getAuthState(wrapper).status, 'unknown');
  });

  it('auth state is "logged-out" if userid is null', () => {
    fakeStore.profile.returns({ userid: null });
    const wrapper = createComponent();
    assert.equal(getAuthState(wrapper).status, 'logged-out');
  });

  it('auth state is "logged-in" if userid is non-null', () => {
    fakeStore.profile.returns({ userid: 'acct:jimsmith@hypothes.is' });
    const wrapper = createComponent();
    assert.equal(getAuthState(wrapper).status, 'logged-in');
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
    it('sets auth state depending on profile', () => {
      fakeStore.profile.returns(profile);
      const wrapper = createComponent();
      assert.deepEqual(getAuthState(wrapper), expectedAuth);
    });
  });

  describe('"Sign up" action', () => {
    const clickSignUp = wrapper => wrapper.find('TopBar').props().onSignUp();

    beforeEach(() => {
      sinon.stub(window, 'open');
    });

    afterEach(() => {
      window.open.restore();
    });

    context('when using a third-party service', () => {
      beforeEach(() => {
        fakeServiceConfig.returns({});
      });

      it('sends SIGNUP_REQUESTED event', () => {
        const wrapper = createComponent();
        clickSignUp(wrapper);
        assert.calledWith(fakeBridge.call, bridgeEvents.SIGNUP_REQUESTED);
      });

      it('does not open a URL directly', () => {
        const wrapper = createComponent();
        clickSignUp(wrapper);
        assert.notCalled(window.open);
      });
    });

    context('when not using a third-party service', () => {
      it('opens the signup URL in a new tab', () => {
        fakeServiceUrl.withArgs('signup').returns('https://ann.service/signup');
        const wrapper = createComponent();
        clickSignUp(wrapper);
        assert.calledWith(window.open, 'https://ann.service/signup');
      });
    });
  });

  describe('"Log in" action', () => {
    const clickLogIn = wrapper => wrapper.find('TopBar').props().onLogin();

    beforeEach(() => {
      fakeAuth.login = sinon.stub().returns(Promise.resolve());
    });

    it('clears groups', async () => {
      const wrapper = createComponent();
      await clickLogIn(wrapper);
      assert.called(fakeStore.clearGroups);
    });

    it('initiates the OAuth login flow', async () => {
      const wrapper = createComponent();
      await clickLogIn(wrapper);
      assert.called(fakeAuth.login);
    });

    it('reloads the session when login completes', async () => {
      const wrapper = createComponent();
      await clickLogIn(wrapper);
      assert.called(fakeSession.reload);
    });

    it('closes the login prompt panel', async () => {
      const wrapper = createComponent();
      await clickLogIn(wrapper);
      assert.called(fakeStore.closeSidebarPanel);
    });

    it('reports an error if login fails', async () => {
      fakeAuth.login.returns(Promise.reject(new Error('Login failed')));

      const wrapper = createComponent();
      await clickLogIn(wrapper);
      assert.called(fakeToastMessenger.error);
    });

    it('sends LOGIN_REQUESTED if a third-party service is in use', async () => {
      // If the client is using a third-party annotation service then clicking
      // on a login button should send the LOGIN_REQUESTED event over the bridge
      // (so that the partner site we're embedded in can do its own login
      // thing).
      fakeServiceConfig.returns({});

      const wrapper = createComponent();
      await clickLogIn(wrapper);

      assert.equal(fakeBridge.call.callCount, 1);
      assert.isTrue(
        fakeBridge.call.calledWithExactly(bridgeEvents.LOGIN_REQUESTED)
      );
    });
  });

  describe('"Log out" action', () => {
    const clickLogOut = wrapper => wrapper.find('TopBar').props().onLogout();

    beforeEach(() => {
      sinon.stub(window, 'confirm');
    });

    afterEach(() => {
      window.confirm.restore();
    });

    // Tests used by both the first and third-party account scenarios.
    function addCommonLogoutTests() {
      // nb. Slightly different messages are shown depending on the draft count.
      [1, 2].forEach(draftCount => {
        it('prompts the user if there are drafts', () => {
          fakeStore.countDrafts.returns(draftCount);

          const wrapper = createComponent();
          clickLogOut(wrapper);

          assert.equal(window.confirm.callCount, 1);
        });
      });

      it('clears groups', () => {
        const wrapper = createComponent();
        clickLogOut(wrapper);

        assert.called(fakeStore.clearGroups);
      });

      it('removes unsaved annotations', () => {
        fakeStore.unsavedAnnotations = sinon
          .stub()
          .returns(['draftOne', 'draftTwo', 'draftThree']);
        const wrapper = createComponent();
        clickLogOut(wrapper);

        assert.calledWith(fakeStore.removeAnnotations, [
          'draftOne',
          'draftTwo',
          'draftThree',
        ]);
      });

      it('discards drafts', () => {
        const wrapper = createComponent();
        clickLogOut(wrapper);

        assert(fakeStore.discardAllDrafts.calledOnce);
      });

      it('does not remove unsaved annotations if the user cancels the prompt', () => {
        const wrapper = createComponent();
        fakeStore.countDrafts.returns(1);
        window.confirm.returns(false);

        clickLogOut(wrapper);

        assert.notCalled(fakeStore.removeAnnotations);
      });

      it('does not discard drafts if the user cancels the prompt', () => {
        const wrapper = createComponent();
        fakeStore.countDrafts.returns(1);
        window.confirm.returns(false);

        clickLogOut(wrapper);

        assert(fakeStore.discardAllDrafts.notCalled);
      });

      it('does not prompt if there are no drafts', () => {
        const wrapper = createComponent();
        fakeStore.countDrafts.returns(0);

        clickLogOut(wrapper);

        assert.notCalled(window.confirm);
      });
    }

    context('when no third-party service is in use', () => {
      addCommonLogoutTests();

      it('calls session.logout()', () => {
        const wrapper = createComponent();
        clickLogOut(wrapper);
        assert.called(fakeSession.logout);
      });
    });

    context('when a third-party service is in use', () => {
      beforeEach('configure a third-party service to be in use', () => {
        fakeServiceConfig.returns({});
      });

      addCommonLogoutTests();

      it('sends LOGOUT_REQUESTED', () => {
        const wrapper = createComponent();
        clickLogOut(wrapper);

        assert.calledOnce(fakeBridge.call);
        assert.calledWithExactly(
          fakeBridge.call,
          bridgeEvents.LOGOUT_REQUESTED
        );
      });

      it('does not send LOGOUT_REQUESTED if the user cancels the prompt', () => {
        fakeStore.countDrafts.returns(1);
        window.confirm.returns(false);

        const wrapper = createComponent();
        clickLogOut(wrapper);

        assert.notCalled(fakeBridge.call);
      });

      it('does not call session.logout()', () => {
        const wrapper = createComponent();
        clickLogOut(wrapper);
        assert.notCalled(fakeSession.logout);
      });
    });
  });
});
