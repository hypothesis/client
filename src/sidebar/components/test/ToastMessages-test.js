import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

import { mockImportedComponents } from '../../../test-util/mock-imported-components';

import ToastMessages, { $imports } from '../ToastMessages';
import { checkAccessibility } from '../../../test-util/accessibility';

describe('ToastMessages', () => {
  let fakeStore;
  let fakeToastMessenger;

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

  function createComponent(props) {
    return mount(
      <ToastMessages toastMessenger={fakeToastMessenger} {...props} />
    );
  }

  beforeEach(() => {
    fakeStore = {
      getToastMessages: sinon.stub(),
    };

    fakeToastMessenger = {
      dismiss: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store/use-store': { useStoreProxy: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('should render a `ToastMessage` for each message returned by the store', () => {
    fakeStore.getToastMessages.returns([
      fakeSuccessMessage(),
      fakeErrorMessage(),
      fakeNoticeMessage(),
    ]);

    const wrapper = createComponent();

    assert.lengthOf(wrapper.find('ToastMessage'), 3);
  });

  describe('`ToastMessage` sub-component', () => {
    it('should dismiss the message when clicked', () => {
      fakeStore.getToastMessages.returns([fakeSuccessMessage()]);

      const wrapper = createComponent();

      const messageContainer = wrapper.find('ToastMessage').getDOMNode();

      act(() => {
        messageContainer.dispatchEvent(new Event('click'));
      });

      assert.calledOnce(fakeToastMessenger.dismiss);
    });

    it('should not dismiss the message if a "More info" link is clicked', () => {
      fakeStore.getToastMessages.returns([fakeNoticeMessage()]);

      const wrapper = createComponent();

      const link = wrapper.find('Link');

      act(() => {
        link.getDOMNode().dispatchEvent(new Event('click', { bubbles: true }));
      });

      assert.notCalled(fakeToastMessenger.dismiss);
    });

    [
      { message: fakeSuccessMessage(), prefix: 'Success: ' },
      { message: fakeErrorMessage(), prefix: 'Error: ' },
      { message: fakeNoticeMessage(), prefix: '' },
    ].forEach(testCase => {
      it('should prefix the message with the message type', () => {
        fakeStore.getToastMessages.returns([testCase.message]);

        const wrapper = createComponent();

        assert.include(
          wrapper.text(),
          `${testCase.prefix}${testCase.message.message}`
        );
      });
    });

    [
      { messages: [fakeSuccessMessage()], icons: ['success'] },
      { messages: [fakeErrorMessage()], icons: ['error'] },
      { messages: [fakeNoticeMessage()], icons: ['cancel'] },
      {
        messages: [fakeSuccessMessage(), fakeErrorMessage()],
        icons: ['success', 'error'],
      },
    ].forEach(testCase => {
      it('should render an appropriate icon for the message type', () => {
        fakeStore.getToastMessages.returns(testCase.messages);

        const wrapper = createComponent();

        const iconProps = wrapper
          .find('Icon')
          .map(iconWrapper => iconWrapper.props().name);

        assert.deepEqual(iconProps, testCase.icons);
      });
    });
  });

  it('should render a "more info" link if URL is present in message object', () => {
    fakeStore.getToastMessages.returns([fakeNoticeMessage()]);

    const wrapper = createComponent();

    const link = wrapper.find('Link');
    assert.equal(link.props().href, 'http://www.example.com');
    assert.equal(link.text(), 'More info');
  });

  describe('a11y', () => {
    beforeEach(() => {
      fakeStore.getToastMessages.returns([
        fakeSuccessMessage(),
        fakeErrorMessage(),
        fakeNoticeMessage(),
      ]);
    });

    it(
      'should pass a11y checks',
      checkAccessibility([
        {
          content: () => createComponent(),
        },
      ])
    );
  });
});
