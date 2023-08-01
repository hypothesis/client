import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

import { checkAccessibility } from '../../../test-util/accessibility';
import BaseToastMessages from '../BaseToastMessages';

describe('BaseToastMessages', () => {
  let fakeOnMessageDismiss;

  let fakeErrorMessage = () => {
    return {
      type: 'error',
      message: 'boo',
      id: 'someid2',
      isDismissed: false,
    };
  };

  let fakeSuccessMessage = () => {
    return {
      type: 'success',
      message: 'yay',
      id: 'someid',
      isDismissed: false,
    };
  };

  let fakeNoticeMessage = () => {
    return {
      type: 'notice',
      message: 'you should know...',
      id: 'someid3',
      isDismissed: false,
      moreInfoURL: 'http://www.example.com',
    };
  };

  function createComponent(messages = []) {
    return mount(
      <BaseToastMessages
        messages={messages}
        onMessageDismiss={fakeOnMessageDismiss}
      />,
    );
  }

  beforeEach(() => {
    fakeOnMessageDismiss = sinon.stub();
  });

  it('should render a `ToastMessageItem` for each provided message', () => {
    const wrapper = createComponent([
      fakeSuccessMessage(),
      fakeErrorMessage(),
      fakeNoticeMessage(),
    ]);

    assert.lengthOf(wrapper.find('ToastMessageItem'), 3);
  });

  describe('`ToastMessageItem` sub-component', () => {
    it('should dismiss the message when clicked', () => {
      const wrapper = createComponent([fakeSuccessMessage()]);

      const messageContainer = wrapper.find('ToastMessageItem').getDOMNode();

      act(() => {
        messageContainer.dispatchEvent(new Event('click'));
      });

      assert.calledOnce(fakeOnMessageDismiss);
    });

    it('should set a screen-reader-only class on `visuallyHidden` messages', () => {
      const message = fakeSuccessMessage();
      message.visuallyHidden = true;

      const wrapper = createComponent([message]);

      const messageContainer = wrapper.find('ToastMessageItem').getDOMNode();
      assert.include(messageContainer.className, 'sr-only');
    });

    it('should not dismiss the message if a "More info" link is clicked', () => {
      const wrapper = createComponent([fakeNoticeMessage()]);

      const link = wrapper.find('Link');

      act(() => {
        link.getDOMNode().dispatchEvent(new Event('click', { bubbles: true }));
      });

      assert.notCalled(fakeOnMessageDismiss);
    });

    [
      { message: fakeSuccessMessage(), prefix: 'Success: ' },
      { message: fakeErrorMessage(), prefix: 'Error: ' },
      { message: fakeNoticeMessage(), prefix: '' },
    ].forEach(testCase => {
      it('should prefix the message with the message type', () => {
        const wrapper = createComponent([testCase.message]);

        assert.include(
          wrapper.text(),
          `${testCase.prefix}${testCase.message.message}`,
        );
      });
    });

    [
      { messages: [fakeSuccessMessage()], icons: ['CheckIcon'] },
      { messages: [fakeErrorMessage()], icons: ['CancelIcon'] },
      { messages: [fakeNoticeMessage()], icons: ['CautionIcon'] },
      {
        messages: [fakeSuccessMessage(), fakeErrorMessage()],
        icons: ['CheckIcon', 'CancelIcon'],
      },
    ].forEach(testCase => {
      it('should render an appropriate icon for the message type', () => {
        const wrapper = createComponent(testCase.messages);

        testCase.icons.forEach(iconName => {
          assert.isTrue(wrapper.find(iconName).exists());
        });
      });
    });
  });

  it('should render a "more info" link if URL is present in message object', () => {
    const wrapper = createComponent([fakeNoticeMessage()]);

    const link = wrapper.find('Link');
    assert.equal(link.props().href, 'http://www.example.com');
    assert.equal(link.text(), 'More info');
  });

  describe('a11y', () => {
    it(
      'should pass a11y checks',
      checkAccessibility([
        {
          content: () =>
            createComponent([
              fakeSuccessMessage(),
              fakeErrorMessage(),
              fakeNoticeMessage(),
            ]),
        },
      ]),
    );
  });
});
