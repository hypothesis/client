import { mount } from 'enzyme';

import ToastMessages from '../ToastMessages';

describe('ToastMessages', () => {
  const toastMessages = [
    {
      id: '1',
      type: 'success',
      message: 'Hello world',
    },
    {
      id: '2',
      type: 'success',
      message: 'Foobar',
    },
    {
      id: '3',
      type: 'error',
      message: 'Something failed',
    },
  ];
  let fakeOnMessageDismiss;

  beforeEach(() => {
    fakeOnMessageDismiss = sinon.stub();
  });

  function createToastMessages(toastMessages, setTimeout) {
    const container = document.createElement('div');
    document.body.appendChild(container);

    return mount(
      <ToastMessages
        messages={toastMessages}
        onMessageDismiss={fakeOnMessageDismiss}
        setTimeout_={setTimeout}
      />,
      { attachTo: container },
    );
  }

  function triggerAnimationEnd(wrapper, index, direction = 'out') {
    wrapper
      .find('BaseToastMessageTransition')
      .at(index)
      .props()
      .onTransitionEnd(direction);
    wrapper.update();
  }

  it('renders a list of toast messages', () => {
    const wrapper = createToastMessages(toastMessages);
    assert.equal(wrapper.find('ToastMessageItem').length, toastMessages.length);
  });

  toastMessages.forEach((message, index) => {
    it('dismisses messages when clicked', () => {
      const wrapper = createToastMessages(toastMessages);

      wrapper.find('Callout').at(index).props().onClick();
      // onMessageDismiss is not immediately called. Transition has to finish
      assert.notCalled(fakeOnMessageDismiss);

      // Once dismiss animation has finished, onMessageDismiss is called
      triggerAnimationEnd(wrapper, index);
      assert.calledWith(fakeOnMessageDismiss, message.id);
    });
  });

  it('dismisses messages automatically unless instructed otherwise', () => {
    const messages = [
      ...toastMessages,
      {
        id: 'foo',
        type: 'success',
        message: 'Not to be dismissed',
        autoDismiss: false,
      },
    ];
    const wrapper = createToastMessages(
      messages,
      // Fake internal setTimeout, to immediately call its callback
      callback => callback(),
    );

    // Trigger "in" animation for all messages, which will schedule dismiss for
    // appropriate messages
    messages.forEach((_, index) => {
      triggerAnimationEnd(wrapper, index, 'in');
    });

    // Trigger "out" animation on components which "direction" prop is currently
    // "out". That means they were scheduled for dismiss
    wrapper
      .find('BaseToastMessageTransition')
      .forEach((transitionComponent, index) => {
        if (transitionComponent.prop('direction') === 'out') {
          triggerAnimationEnd(wrapper, index);
        }
      });

    // Only one toast message will remain, as it was marked as `autoDismiss: false`
    assert.equal(fakeOnMessageDismiss.callCount, 3);
  });

  it('schedules dismiss only once per message', async () => {
    const wrapper = createToastMessages(
      toastMessages,
      // Fake an immediate setTimeout which does not slow down the test, but
      // keeps the async behavior
      callback => setTimeout(callback, 0),
    );
    const scheduleFirstMessageDismiss = () =>
      triggerAnimationEnd(wrapper, 0, 'in');

    scheduleFirstMessageDismiss();
    scheduleFirstMessageDismiss();
    scheduleFirstMessageDismiss();

    // Once dismiss animation has finished, onMessageDismiss is called
    triggerAnimationEnd(wrapper, 0);
    assert.equal(fakeOnMessageDismiss.callCount, 1);
  });

  it('invokes onTransitionEnd when animation happens on container', () => {
    const wrapper = createToastMessages(toastMessages, callback => callback());
    const animationContainer = wrapper
      .find('[data-testid="animation-container"]')
      .first();

    // Trigger "in" animation for all messages, which will schedule dismiss
    toastMessages.forEach((_, index) => {
      triggerAnimationEnd(wrapper, index, 'in');
    });

    animationContainer
      .getDOMNode()
      .dispatchEvent(new AnimationEvent('animationend'));

    assert.called(fakeOnMessageDismiss);
  });

  it('does not invoke onTransitionEnd for animation events bubbling from children', () => {
    const wrapper = createToastMessages(toastMessages, callback => callback());
    const invalidAnimationContainer = wrapper.find('Callout').first();

    // Trigger "in" animation for all messages, which will schedule dismiss
    toastMessages.forEach((_, index) => {
      triggerAnimationEnd(wrapper, index, 'in');
    });

    invalidAnimationContainer
      .getDOMNode()
      .dispatchEvent(new AnimationEvent('animationend', { bubbles: true }));

    assert.notCalled(fakeOnMessageDismiss);
  });
});
