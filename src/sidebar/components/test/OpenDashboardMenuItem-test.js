import { waitFor } from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';
import sinon from 'sinon';

import OpenDashboardMenuItem from '../OpenDashboardMenuItem';

describe('OpenDashboardMenuItem', () => {
  let fakeDashboard;
  let fakeToastMessenger;

  beforeEach(() => {
    fakeDashboard = {
      getAuthToken: sinon.stub().resolves('auth_token'),
      open: sinon.stub(),
    };
    fakeToastMessenger = {
      error: sinon.stub(),
    };
  });

  function createComponent({ isMenuOpen = false } = {}) {
    return mount(
      <OpenDashboardMenuItem
        isMenuOpen={isMenuOpen}
        dashboard={fakeDashboard}
        toastMessenger={fakeToastMessenger}
      />,
    );
  }

  async function createOpenComponent() {
    const wrapper = createComponent({ isMenuOpen: true });

    // Wait for an enabled menu item, which means loading the auth token finished
    await waitFor(() => {
      wrapper.update();
      return wrapper.exists('MenuItem[isDisabled=false]');
    });

    return wrapper;
  }

  context('when menu is closed', () => {
    it('does not try to load auth token', () => {
      createComponent();
      assert.notCalled(fakeDashboard.getAuthToken);
    });

    it('has disabled menu item', () => {
      const wrapper = createComponent();
      assert.isTrue(wrapper.find('MenuItem').prop('isDisabled'));
    });

    it('does not open dashboard when item is clicked', () => {
      const wrapper = createComponent();

      wrapper.find('MenuItem').props().onClick();
      assert.notCalled(fakeDashboard.open);
      assert.notCalled(fakeToastMessenger.error);
    });
  });

  context('when menu is open', () => {
    it('loads auth token', async () => {
      await createOpenComponent();
      assert.called(fakeDashboard.getAuthToken);
    });

    it('has enabled menu item', async () => {
      const wrapper = await createOpenComponent();
      assert.isFalse(wrapper.find('MenuItem').prop('isDisabled'));
    });

    it('opens dashboard when item is clicked', async () => {
      const wrapper = await createOpenComponent();

      wrapper.find('MenuItem').props().onClick();
      assert.calledWith(fakeDashboard.open, 'auth_token');
      assert.notCalled(fakeToastMessenger.error);
    });
  });

  context('when menu opening changes', () => {
    it('goes back to loading state', async () => {
      const wrapper = await createOpenComponent();

      assert.isFalse(wrapper.find('MenuItem').prop('isDisabled'));
      wrapper.setProps({ isMenuOpen: false });
      assert.isTrue(wrapper.find('MenuItem').prop('isDisabled'));
    });
  });

  context('when loading auth token fails', () => {
    const error = new Error('Error loading auth token');

    beforeEach(() => {
      fakeDashboard.getAuthToken.rejects(error);
      sinon.stub(console, 'warn');
    });

    afterEach(() => console.warn.restore());

    it('logs error if getting auth token fails', async () => {
      createOpenComponent();

      assert.called(fakeDashboard.getAuthToken);

      await waitFor(() => {
        const { lastCall } = console.warn;
        if (!lastCall) {
          return false;
        }

        const { args } = lastCall;
        return (
          args[0] === 'An error occurred while getting auth token' &&
          args[1] === error
        );
      });
    });

    it('shows toast message when trying to open dashboard', async () => {
      const wrapper = await createOpenComponent();
      const menuItem = wrapper.find('MenuItem');

      menuItem.props().onClick();

      assert.notCalled(fakeDashboard.open);
      assert.calledWith(
        fakeToastMessenger.error,
        "Can't open dashboard: You must reload the page.",
        { autoDismiss: false },
      );
    });
  });
});
