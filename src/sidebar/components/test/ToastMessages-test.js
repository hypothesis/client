import { mount } from 'enzyme';

import { mockImportedComponents } from '../../../test-util/mock-imported-components';
import ToastMessages, { $imports } from '../ToastMessages';

describe('ToastMessages', () => {
  let fakeStore;
  let fakeToastMessenger;

  const fakeMessage = () => ({
    type: 'notice',
    message: 'you should know...',
    id: 'someId',
    isDismissed: false,
    moreInfoURL: 'http://www.example.com',
  });

  function createComponent(props) {
    return mount(
      <ToastMessages toastMessenger={fakeToastMessenger} {...props} />,
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
      '../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('should render all messages returned by the store', () => {
    fakeStore.getToastMessages.returns([
      fakeMessage(),
      fakeMessage(),
      fakeMessage(),
    ]);

    const wrapper = createComponent();

    assert.lengthOf(wrapper.find('BaseToastMessages').prop('messages'), 3);
  });

  it('should dismiss the message when clicked', () => {
    fakeStore.getToastMessages.returns([fakeMessage()]);

    const wrapper = createComponent();
    const messageContainer = wrapper.find('BaseToastMessages');

    messageContainer.prop('onMessageDismiss')();

    assert.calledOnce(fakeToastMessenger.dismiss);
  });
});
