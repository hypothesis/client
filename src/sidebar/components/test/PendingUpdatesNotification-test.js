import { mount } from '@hypothesis/frontend-testing';
import sinon from 'sinon';

import { promiseWithResolvers } from '../../../shared/promise-with-resolvers';
import PendingUpdatesNotification, {
  $imports,
} from '../PendingUpdatesNotification';

describe('PendingUpdatesNotification', () => {
  let fakeSetTimeout;
  let fakeClearTimeout;
  let fakeStreamer;
  let fakeAnalytics;
  let fakeStore;

  beforeEach(() => {
    fakeSetTimeout = sinon.stub();
    fakeClearTimeout = sinon.stub();
    fakeStreamer = {
      applyPendingUpdates: sinon.stub(),
    };
    fakeAnalytics = {
      trackEvent: sinon.stub(),
    };
    fakeStore = {
      pendingUpdateCount: sinon.stub().returns(3),
      pendingMentionCount: sinon.stub().returns(0),
      hasPendingUpdatesOrDeletions: sinon.stub().returns(true),
      isFeatureEnabled: sinon.stub().returns(false),
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

  function createComponent() {
    return mount(
      <PendingUpdatesNotification
        streamer={fakeStreamer}
        analytics={fakeAnalytics}
        setTimeout_={fakeSetTimeout}
        clearTimeout_={fakeClearTimeout}
      />,
      { connected: true },
    );
  }

  function notificationIsCollapsed(wrapper) {
    return wrapper
      .find('Button[data-testid="notification"]')
      .prop('data-collapsed');
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
    assert.isFalse(notificationIsCollapsed(wrapper));
    assert.calledOnce(fakeSetTimeout);

    await promise; // Wait for timeout callback to be invoked
    wrapper.update();

    // Once the timeout callback has been invoked, it collapses the notification
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
    assert.notCalled(fakeAnalytics.trackEvent);
    wrapper.find('button').simulate('click');
    assert.called(fakeStreamer.applyPendingUpdates);
    assert.calledWith(
      fakeAnalytics.trackEvent,
      'client.realtime.apply_updates',
    );
  });

  [true, false].forEach(hasPendingUpdates => {
    it('applies updates when "l" is pressed', () => {
      fakeStore.hasPendingUpdatesOrDeletions.returns(hasPendingUpdates);

      createComponent();

      assert.notCalled(fakeStreamer.applyPendingUpdates);
      assert.notCalled(fakeAnalytics.trackEvent);
      document.documentElement.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'l' }),
      );
      assert.equal(fakeStreamer.applyPendingUpdates.called, hasPendingUpdates);
      assert.equal(fakeAnalytics.trackEvent.called, hasPendingUpdates);
    });
  });

  [
    { pendingMentionCount: 3, mentionsEnabled: true },
    { pendingMentionCount: 1, mentionsEnabled: true },
    { pendingMentionCount: 0, mentionsEnabled: true },
    { pendingMentionCount: 3, mentionsEnabled: false },
    { pendingMentionCount: 1, mentionsEnabled: false },
    { pendingMentionCount: 0, mentionsEnabled: false },
  ].forEach(({ pendingMentionCount, mentionsEnabled }) => {
    it('shows a segment for mentions when there are pending mentions', () => {
      fakeStore.isFeatureEnabled.returns(mentionsEnabled);
      fakeStore.pendingMentionCount.returns(pendingMentionCount);

      const wrapper = createComponent();
      const shouldShowPendingMentions =
        pendingMentionCount > 0 && mentionsEnabled;

      assert.equal(
        wrapper.exists('UpdateBlock[type="mentions"]'),
        shouldShowPendingMentions,
      );

      if (shouldShowPendingMentions) {
        assert.equal(
          wrapper.find('UpdateBlock[type="mentions"]').text(),
          `${pendingMentionCount}mention${pendingMentionCount === 1 ? '' : 's'}`,
        );
      }
    });
  });
});
