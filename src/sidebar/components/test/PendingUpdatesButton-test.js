import { mount } from 'enzyme';

import PendingUpdatesButton from '../PendingUpdatesButton';

describe('PendingUpdatesButton', () => {
  let fakeOnClick;
  let fakeToastMessenger;

  beforeEach(() => {
    fakeOnClick = sinon.stub();
    fakeToastMessenger = {
      success: sinon.stub(),
    };
  });

  const createButton = count =>
    mount(
      <PendingUpdatesButton
        pendingUpdateCount={count}
        onClick={fakeOnClick}
        toastMessenger={fakeToastMessenger}
      />
    );

  it('shows an empty wrapper when there are no pending updates', () => {
    const wrapper = createButton(0);

    assert.isFalse(wrapper.find('IconButton').exists());
    assert.notCalled(fakeToastMessenger.success);
  });

  [1, 10, 50].forEach(pendingUpdateCount => {
    it('shows the pending update count', () => {
      const wrapper = createButton(pendingUpdateCount);

      assert.isTrue(wrapper.find('IconButton').exists());
      assert.calledWith(
        fakeToastMessenger.success,
        `There are ${pendingUpdateCount} new annotations.`,
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

    assert.called(fakeOnClick);
  });
});
