import { mount } from 'enzyme';

import PendingUpdatesButton from '../PendingUpdatesButton';

describe('PendingUpdatesButton', () => {
  let fakeOnClick;

  beforeEach(() => {
    fakeOnClick = sinon.stub();
  });

  const createButton = count =>
    mount(
      <PendingUpdatesButton pendingUpdateCount={count} onClick={fakeOnClick} />
    );

  it('shows an empty wrapper when there are no pending updates', () => {
    const wrapper = createButton(0);
    assert.isTrue(wrapper.find('span[aria-live="polite"]').exists());
    assert.isFalse(wrapper.find('IconButton').exists());
  });

  it('shows the pending update count', () => {
    const wrapper = createButton(1);
    assert.isTrue(wrapper.find('span[aria-live="polite"]').exists());
    assert.isTrue(wrapper.find('IconButton').exists());
  });

  it('applies updates when clicked', () => {
    const wrapper = createButton(1);
    const applyBtn = wrapper.find('IconButton');

    applyBtn.props().onClick();

    assert.called(fakeOnClick);
  });
});
