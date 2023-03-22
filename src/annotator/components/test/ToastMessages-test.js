import { mount } from 'enzyme';
import EventEmitter from 'tiny-emitter';

import ToastMessages from '../ToastMessages';

describe('ToastMessages', () => {
  let emitter;
  let fakeSidebarRPC;

  const fakeMessage = (id = 'someId') => ({
    id,
    type: 'notice',
    message: 'you should know...',
    isDismissed: false,
    moreInfoURL: 'http://www.example.com',
  });

  const createComponent = () =>
    mount(<ToastMessages sidebarRPC={fakeSidebarRPC} />);

  beforeEach(() => {
    emitter = new EventEmitter();
    fakeSidebarRPC = { on: (...args) => emitter.on(...args) };
  });

  it('pushes new toast messages on toastMessageAdded', () => {
    const wrapper = createComponent();

    // Initially messages is empty
    assert.lengthOf(wrapper.find('BaseToastMessages').prop('messages'), 0);

    emitter.emit('toastMessageAdded', fakeMessage('someId1'));
    emitter.emit('toastMessageAdded', fakeMessage('someId2'));
    emitter.emit('toastMessageAdded', fakeMessage('someId3'));
    wrapper.update();

    assert.lengthOf(wrapper.find('BaseToastMessages').prop('messages'), 3);
  });

  it('removes toast existing messages on toastMessageDismissed', () => {
    const wrapper = createComponent();

    // We push some messages first
    emitter.emit('toastMessageAdded', fakeMessage('someId1'));
    emitter.emit('toastMessageAdded', fakeMessage('someId2'));
    emitter.emit('toastMessageAdded', fakeMessage('someId3'));
    wrapper.update();

    emitter.emit('toastMessageDismissed', 'someId1');
    // We can also "dismiss" unknown messages. Those will be ignored
    emitter.emit('toastMessageDismissed', 'someId4');
    wrapper.update();

    assert.lengthOf(wrapper.find('BaseToastMessages').prop('messages'), 2);
  });
});
