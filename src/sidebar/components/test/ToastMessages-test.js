import { mockImportedComponents } from '@hypothesis/frontend-testing';
import { mount } from 'enzyme';

import ToastMessages, { $imports } from '../ToastMessages';

describe('ToastMessages', () => {
  let fakeStore;
  let fakeToastMessenger;

  const fakeMessage = (id = 'someId') => ({
    id,
    type: 'notice',
    message: 'you should know...',
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
      fakeMessage('someId1'),
      fakeMessage('someId2'),
      fakeMessage('someId3'),
    ]);

    const wrapper = createComponent();

    assert.lengthOf(wrapper.find('[messages]').prop('messages'), 3);
  });

  it('should dismiss the message when clicked', () => {
    fakeStore.getToastMessages.returns([fakeMessage()]);

    const wrapper = createComponent();
    const messageContainer = wrapper.find('[onMessageDismiss]');

    messageContainer.prop('onMessageDismiss')();

    assert.calledOnce(fakeToastMessenger.dismiss);
  });
});
