import { mockImportedComponents } from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';

import HypothesisApp, { $imports } from '../HypothesisApp';

describe('HypothesisApp', () => {
  let fakeApplyTheme;
  let fakeStore = null;
  let fakeAuth = null;
  let fakeFrameSync;
  let fakeConfirm;
  let fakeServiceConfig = null;
  let fakeSession = null;
  let fakeShouldAutoDisplayTutorial = null;
  let fakeSettings = null;
  let fakeToastMessenger = null;
  let fakeIsThirdPartyService;

  const createComponent = (props = {}) => {
    return mount(
      <HypothesisApp
        auth={fakeAuth}
        frameSync={fakeFrameSync}
        settings={fakeSettings}
        session={fakeSession}
        toastMessenger={fakeToastMessenger}
        {...props}
      />,
    );
  };

  beforeEach(() => {
    fakeApplyTheme = sinon.stub().returns({});
    fakeServiceConfig = sinon.stub();
    fakeShouldAutoDisplayTutorial = sinon.stub().returns(false);

    fakeStore = {
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

      getLink: sinon.stub(),
    };

    fakeAuth = {};

    fakeSession = {
      load: sinon.stub().returns(Promise.resolve({ userid: null })),
      logout: sinon.stub(),
      reload: sinon.stub().returns(Promise.resolve({ userid: null })),
    };

    fakeSettings = {};

    fakeFrameSync = {
      notifyHost: sinon.stub(),
    };

    fakeToastMessenger = {
      error: sinon.stub(),
      notice: sinon.stub(),
    };

    fakeConfirm = sinon.stub().resolves(false);

    fakeIsThirdPartyService = sinon.stub().returns(false);

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '@hypothesis/frontend-shared': { confirm: fakeConfirm },
      '../config/service-config': { serviceConfig: fakeServiceConfig },
      '../store': { useSidebarStore: () => fakeStore },
      '../helpers/session': {
        shouldAutoDisplayTutorial: fakeShouldAutoDisplayTutorial,
      },
      '../helpers/theme': { applyTheme: fakeApplyTheme },
      '../helpers/is-third-party-service': {
        isThirdPartyService: fakeIsThirdPartyService,
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
      'AnnotationView',
      'NotebookView',
      'StreamView',
      'SidebarView',
    ].forEach(contentComponent => {
      assert.isFalse(wrapper.exists(contentComponent));
    });
  });

  [
    {
      route: 'annotation',
      contentComponent: 'AnnotationView',
    },
    {
      route: 'sidebar',
      contentComponent: 'SidebarView',
    },
    {
      route: 'notebook',
      contentComponent: 'NotebookView',
    },
    {
      route: 'profile',
      contentComponent: 'ProfileView',
    },
    {
      route: 'stream',
      contentComponent: 'StreamView',
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

      it('sends "signupRequested" event', () => {
        const wrapper = createComponent();
        clickSignUp(wrapper);
        assert.calledWith(fakeFrameSync.notifyHost, 'signupRequested');
      });

      it('does not open a URL directly', () => {
        const wrapper = createComponent();
        clickSignUp(wrapper);
        assert.notCalled(window.open);
      });
    });

    context('when not using a third-party service', () => {
      it('opens the signup URL in a new tab', () => {
        fakeStore.getLink
          .withArgs('signup')
          .returns('https://ann.service/signup');
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

    it('sends "loginRequested" event to host page if using a third-party service', async () => {
      // If the client is using a third-party annotation service then clicking
      // on a login button should notify the host frame (so that the partner
      // site we're embedded in can do its own login thing).
      fakeServiceConfig.returns({});

      const wrapper = createComponent();
      await clickLogIn(wrapper);

      assert.equal(fakeFrameSync.notifyHost.callCount, 1);
      assert.isTrue(
        fakeFrameSync.notifyHost.calledWithExactly('loginRequested'),
      );
    });
  });

  describe('"Log out" action', () => {
    beforeEach(() => {
      fakeConfirm.resolves(true);
    });

    const clickLogOut = async wrapper => {
      await wrapper.find('TopBar').props().onLogout();
    };

    // Tests used by both the first and third-party account scenarios.
    function addCommonLogoutTests() {
      // nb. Slightly different messages are shown depending on the draft count.
      [1, 2].forEach(draftCount => {
        it('prompts the user if there are drafts', async () => {
          fakeStore.countDrafts.returns(draftCount);

          const wrapper = createComponent();
          await clickLogOut(wrapper);

          assert.equal(fakeConfirm.callCount, 1);
        });
      });

      it('clears groups', async () => {
        const wrapper = createComponent();
        await clickLogOut(wrapper);

        assert.called(fakeStore.clearGroups);
      });

      it('removes unsaved annotations', async () => {
        fakeStore.unsavedAnnotations = sinon
          .stub()
          .returns(['draftOne', 'draftTwo', 'draftThree']);
        const wrapper = createComponent();
        await clickLogOut(wrapper);

        assert.calledWith(fakeStore.removeAnnotations, [
          'draftOne',
          'draftTwo',
          'draftThree',
        ]);
      });

      it('discards drafts', async () => {
        const wrapper = createComponent();
        await clickLogOut(wrapper);

        assert(fakeStore.discardAllDrafts.calledOnce);
      });

      it('does not remove unsaved annotations if the user cancels the prompt', async () => {
        const wrapper = createComponent();
        fakeStore.countDrafts.returns(1);
        fakeConfirm.resolves(false);

        await clickLogOut(wrapper);

        assert.notCalled(fakeStore.removeAnnotations);
      });

      it('does not discard drafts if the user cancels the prompt', async () => {
        const wrapper = createComponent();
        fakeStore.countDrafts.returns(1);
        fakeConfirm.resolves(false);

        await clickLogOut(wrapper);

        assert(fakeStore.discardAllDrafts.notCalled);
      });

      it('does not prompt if there are no drafts', async () => {
        const wrapper = createComponent();
        fakeStore.countDrafts.returns(0);

        await clickLogOut(wrapper);

        assert.notCalled(fakeConfirm);
      });
    }

    context('when no third-party service is in use', () => {
      addCommonLogoutTests();

      it('calls session.logout()', async () => {
        const wrapper = createComponent();
        await clickLogOut(wrapper);
        assert.called(fakeSession.logout);
      });
    });

    context('when a third-party service is in use', () => {
      beforeEach(() => {
        fakeServiceConfig.returns({});
      });

      addCommonLogoutTests();

      it('sends "logoutRequested"', async () => {
        const wrapper = createComponent();
        await clickLogOut(wrapper);

        assert.calledOnce(fakeFrameSync.notifyHost);
        assert.calledWithExactly(fakeFrameSync.notifyHost, 'logoutRequested');
      });

      it('does not send "logoutRequested" if the user cancels the prompt', async () => {
        fakeStore.countDrafts.returns(1);
        fakeConfirm.returns(false);

        const wrapper = createComponent();
        await clickLogOut(wrapper);

        assert.notCalled(fakeFrameSync.notifyHost);
      });

      it('does not call session.logout()', async () => {
        const wrapper = createComponent();
        await clickLogOut(wrapper);
        assert.notCalled(fakeSession.logout);
      });
    });
  });

  describe('theming', () => {
    const appSelector = '[data-testid="hypothesis-app"]';
    it('applies theme config', () => {
      const style = { backgroundColor: 'red' };
      fakeApplyTheme.returns({ backgroundColor: 'red' });

      const wrapper = createComponent();
      const background = wrapper.find(appSelector);

      assert.calledWith(fakeApplyTheme, ['appBackgroundColor'], fakeSettings);
      assert.deepEqual(background.prop('style'), style);
    });

    it('applies a clean-theme style when config sets theme to "clean"', () => {
      fakeSettings.theme = 'clean';

      const wrapper = createComponent();
      const container = wrapper.find(appSelector);

      assert.isTrue(container.hasClass('theme-clean'));
    });

    it('does not apply clean-theme style when config does not assert `clean` theme', () => {
      fakeSettings.theme = '';

      const wrapper = createComponent();
      const container = wrapper.find(appSelector);

      assert.isFalse(container.hasClass('theme-clean'));
    });
  });
});
