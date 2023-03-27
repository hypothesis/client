import { mount } from 'enzyme';
import EventEmitter from 'tiny-emitter';

import { Emitter } from '../../util/emitter';
import ToastMessages from '../ToastMessages';

describe('ToastMessages', () => {
  let emitter;

  const fakeMessage = (id = 'someId') => ({
    id,
    type: 'notice',
    message: 'you should know...',
    isDismissed: false,
    moreInfoURL: 'http://www.example.com',
  });

  const createComponent = () => mount(<ToastMessages emitter={emitter} />);

  beforeEach(() => {
    emitter = new Emitter(new EventEmitter());
  });

  it('adds new toast messages on toastMessageAdded', () => {
    const wrapper = createComponent();

    // Initially messages is empty
    assert.lengthOf(wrapper.find('BaseToastMessages').prop('messages'), 0);

    emitter.publish('toastMessageAdded', fakeMessage('someId1'));
    emitter.publish('toastMessageAdded', fakeMessage('someId2'));
    emitter.publish('toastMessageAdded', fakeMessage('someId3'));
    wrapper.update();

    assert.lengthOf(wrapper.find('BaseToastMessages').prop('messages'), 3);
  });

  it('removes toast existing messages on toastMessageDismissed', () => {
    const wrapper = createComponent();

    // We push some messages first
    emitter.publish('toastMessageAdded', fakeMessage('someId1'));
    emitter.publish('toastMessageAdded', fakeMessage('someId2'));
    emitter.publish('toastMessageAdded', fakeMessage('someId3'));
    wrapper.update();

    emitter.publish('toastMessageDismissed', 'someId1');
    // We can also "dismiss" unknown messages. Those will be ignored
    emitter.publish('toastMessageDismissed', 'someId4');
    wrapper.update();

    assert.lengthOf(wrapper.find('BaseToastMessages').prop('messages'), 2);
  });
});
