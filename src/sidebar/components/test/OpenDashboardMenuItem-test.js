import { waitFor } from '@hypothesis/frontend-testing';
import { mount } from 'enzyme';
import sinon from 'sinon';

import OpenDashboardMenuItem from '../OpenDashboardMenuItem';

describe('OpenDashboardMenuItem', () => {
  let fakeDashboard;

  beforeEach(() => {
    fakeDashboard = {
      getAuthToken: sinon.stub().resolves('auth_token'),
      open: sinon.stub(),
    };
  });

  function createComponent({ isMenuOpen = false } = {}) {
    return mount(
      <OpenDashboardMenuItem
        isMenuOpen={isMenuOpen}
        dashboard={fakeDashboard}
      />,
    );
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
    });
  });

  context('when menu is open', () => {
    async function createOpenComponent() {
      const wrapper = createComponent({ isMenuOpen: true });

      // Wait for an enabled menu item, which means the auth token was loaded
      await waitFor(() => wrapper.find('MenuItem[isDisabled=false]'));
      wrapper.update();

      return wrapper;
    }

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
    });

    it('logs error if getting auth token fails', async () => {
      const error = new Error('Error loading auth token');
      fakeDashboard.getAuthToken.rejects(error);
      sinon.stub(console, 'warn');

      try {
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
      } finally {
        console.warn.restore();
      }
    });
  });
});
