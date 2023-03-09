import { mount } from 'enzyme';

import PendingUpdatesButton, { $imports } from '../PendingUpdatesButton';

describe('PendingUpdatesButton', () => {
  let fakeToastMessenger;
  let fakeStore;
  let fakeStreamer;

  beforeEach(() => {
    fakeToastMessenger = {
      notice: sinon.stub(),
    };
    fakeStore = {
      pendingUpdateCount: sinon.stub().returns(0),
      hasPendingUpdates: sinon.stub().returns(true),
    };
    fakeStreamer = {
      applyPendingUpdates: sinon.stub(),
    };

    $imports.$mock({
      '../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  const createButton = count => {
    fakeStore.pendingUpdateCount.returns(count);
    fakeStore.hasPendingUpdates.returns(count > 0);

    return mount(
      <PendingUpdatesButton
        streamer={fakeStreamer}
        toastMessenger={fakeToastMessenger}
      />
    );
  };

  it('shows an empty wrapper when there are no pending updates', () => {
    const wrapper = createButton(0);

    assert.isFalse(wrapper.find('IconButton').exists());
    assert.notCalled(fakeToastMessenger.notice);
  });

  [1, 10, 50].forEach(pendingUpdateCount => {
    it('shows the pending update count', () => {
      const wrapper = createButton(pendingUpdateCount);

      assert.isTrue(wrapper.find('IconButton').exists());
      assert.calledWith(
        fakeToastMessenger.notice,
        `New annotations are available.`,
        {
          visuallyHidden: true,
        }
      );
    });
  });

  it('shows the pending update count', () => {
    const wrapper = createButton(1);
    assert.isTrue(wrapper.find('IconButton').exists());
  });

  it('applies updates when clicked', () => {
    const wrapper = createButton(1);
    const applyBtn = wrapper.find('IconButton');

    applyBtn.props().onClick();

    assert.called(fakeStreamer.applyPendingUpdates);
  });

  it('applies updates when `.` is pressed', () => {
    createButton(1);
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '.',
        bubbles: true,
      })
    );

    assert.called(fakeStreamer.applyPendingUpdates);
  });
});
