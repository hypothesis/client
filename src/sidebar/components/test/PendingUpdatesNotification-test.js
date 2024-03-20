import { mount } from 'enzyme';
import sinon from 'sinon';

import { promiseWithResolvers } from '../../../shared/promise-with-resolvers';
import PendingUpdatesNotification, {
  $imports,
} from '../PendingUpdatesNotification';

describe('PendingUpdatesNotification', () => {
  let fakeSetTimeout;
  let fakeClearTimeout;
  let fakeStreamer;
  let fakeStore;

  beforeEach(() => {
    fakeSetTimeout = sinon.stub();
    fakeClearTimeout = sinon.stub();
    fakeStreamer = {
      applyPendingUpdates: sinon.stub(),
    };
    fakeStore = {
      pendingUpdateCount: sinon.stub().returns(3),
      hasPendingUpdatesOrDeletions: sinon.stub().returns(true),
    };

    $imports.$mock({
      '../store': {
        useSidebarStore: () => fakeStore,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function createComponent(container) {
    return mount(
      <PendingUpdatesNotification
        streamer={fakeStreamer}
        setTimeout_={fakeSetTimeout}
        clearTimeout_={fakeClearTimeout}
      />,
      { attachTo: container },
    );
  }

  function notificationIsCollapsed(wrapper) {
    return wrapper.exists('[data-testid="collapsed-notification"]');
  }

  /**
   * To avoid delaying tests too much, this stubs fakeSetTimeout behavior so
   * that it schedules a real 1ms timeout, and resolves a promise when finished.
   * That keeps the async nature of the timeout without affecting test execution
   * times.
   */
  function timeoutAsPromise() {
    const { resolve, promise } = promiseWithResolvers();
    fakeSetTimeout.callsFake(callback =>
      setTimeout(() => {
        callback();
        resolve();
      }, 1),
    );

    return promise;
  }

  it('does not render anything while there are no pending updates', () => {
    fakeStore.hasPendingUpdatesOrDeletions.returns(false);
    const wrapper = createComponent();

    assert.isEmpty(wrapper);
  });

  it('loads full notification first, and collapses it after a timeout', async () => {
    const promise = timeoutAsPromise();
    const wrapper = createComponent();

    // Initially, it shows full notification
    assert.isTrue(wrapper.exists('[data-testid="full-notification"]'));
    assert.isFalse(notificationIsCollapsed(wrapper));
    assert.calledOnce(fakeSetTimeout);

    await promise; // Wait for timeout callback to be invoked
    wrapper.update();

    // Once the timeout callback has been invoked, it collapses the notification
    assert.isFalse(wrapper.exists('[data-testid="full-notification"]'));
    assert.isTrue(notificationIsCollapsed(wrapper));
  });

  it('clears any in-progress timeout when unmounted', () => {
    const timeoutId = 1;
    fakeSetTimeout.returns(timeoutId);

    const wrapper = createComponent();

    assert.notCalled(fakeClearTimeout);
    wrapper.unmount();
    assert.calledWith(fakeClearTimeout, timeoutId);
  });

  it('applies updates when notification is clicked', () => {
    const wrapper = createComponent();

    assert.notCalled(fakeStreamer.applyPendingUpdates);
    wrapper.find('button').simulate('click');
    assert.called(fakeStreamer.applyPendingUpdates);
  });

  [true, false].forEach(hasPendingUpdates => {
    it('applies updates when "l" is pressed', () => {
      fakeStore.hasPendingUpdatesOrDeletions.returns(hasPendingUpdates);
      let wrapper;
      const container = document.createElement('div');
      document.body.append(container);

      try {
        wrapper = createComponent(container);

        assert.notCalled(fakeStreamer.applyPendingUpdates);
        document.documentElement.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'l' }),
        );
        assert.equal(
          fakeStreamer.applyPendingUpdates.called,
          hasPendingUpdates,
        );
      } finally {
        wrapper?.unmount();
        container.remove();
      }
    });
  });

  ['onMouseLeave', 'onBlur'].forEach(handler => {
    it('collapses notification when mouse or focus leaves button', () => {
      const wrapper = createComponent();

      assert.isFalse(notificationIsCollapsed(wrapper));
      wrapper.find('Button').prop(handler)();
      wrapper.update();
      assert.isTrue(notificationIsCollapsed(wrapper));
    });

    it('does not collapse notification when mouse or focus leaves button if timeout is in progress', () => {
      fakeSetTimeout.returns(1);

      const wrapper = createComponent();

      assert.isFalse(notificationIsCollapsed(wrapper));
      wrapper.find('Button').prop(handler)();
      wrapper.update();
      assert.isFalse(notificationIsCollapsed(wrapper));
    });
  });

  ['onMouseEnter', 'onFocus'].forEach(handler => {
    it('expands notification when button is hovered or focused', async () => {
      const promise = timeoutAsPromise();
      const wrapper = createComponent();
      await promise; // Wait for timeout callback to be invoked
      wrapper.update();

      assert.isTrue(notificationIsCollapsed(wrapper));
      wrapper.find('Button').prop(handler)();
      wrapper.update();
      assert.isFalse(notificationIsCollapsed(wrapper));
    });
  });
});
