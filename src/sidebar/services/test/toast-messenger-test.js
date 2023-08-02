import { ToastMessengerService } from '../toast-messenger';

describe('ToastMessengerService', () => {
  let fakeStore;
  let fakeWindow;
  let service;

  beforeEach(() => {
    fakeStore = {
      addToastMessage: sinon.stub(),
      getToastMessage: sinon.stub(),
      hasToastMessage: sinon.stub(),
      removeToastMessage: sinon.stub(),
    };
    fakeWindow = new EventTarget();
    fakeWindow.document = {
      hasFocus: sinon.stub().returns(true),
    };

    service = new ToastMessengerService(fakeStore, fakeWindow);
  });

  describe('#success', () => {
    it('does not add a new success message if a matching one already exists in the store', () => {
      fakeStore.hasToastMessage.returns(true);

      service.success('This is my message');

      assert.calledWith(
        fakeStore.hasToastMessage,
        'success',
        'This is my message',
      );
      assert.notCalled(fakeStore.addToastMessage);
    });

    it('adds a new success toast message to the store', () => {
      fakeStore.hasToastMessage.returns(false);

      service.success('hooray', { visuallyHidden: true });

      assert.calledWith(
        fakeStore.addToastMessage,
        sinon.match({
          type: 'success',
          message: 'hooray',
          visuallyHidden: true,
        }),
      );
    });

    it('emits "toastMessageAdded" event', () => {
      fakeStore.hasToastMessage.returns(false);

      const fakeHandler = sinon.stub();
      service.on('toastMessageAdded', fakeHandler);

      service.success('hooray', {});

      assert.calledWith(
        fakeHandler,
        sinon.match({ message: 'hooray', type: 'success' }),
      );
    });
  });

  describe('#notice', () => {
    it('adds a new notice toast message to the store', () => {
      fakeStore.hasToastMessage.returns(false);

      service.notice('boo');

      assert.calledWith(
        fakeStore.addToastMessage,
        sinon.match({ type: 'notice', message: 'boo' }),
      );
    });
  });

  describe('#error', () => {
    it('does not add a new error message if one with the same message text already exists', () => {
      fakeStore.hasToastMessage.returns(true);

      service.error('This is my message');

      assert.calledWith(
        fakeStore.hasToastMessage,
        'error',
        'This is my message',
      );
      assert.notCalled(fakeStore.addToastMessage);
    });

    it('adds a new error toast message to the store', () => {
      fakeStore.hasToastMessage.returns(false);

      service.error('boo');

      assert.calledWith(
        fakeStore.addToastMessage,
        sinon.match({ type: 'error', message: 'boo' }),
      );
    });

    it('does not dismiss the message if `autoDismiss` is false', () => {
      fakeStore.hasToastMessage.returns(false);
      fakeStore.getToastMessage.returns(undefined);

      service.error('boo', { autoDismiss: false });

      assert.notCalled(fakeStore.getToastMessage);
      assert.notCalled(fakeStore.removeToastMessage);
    });
  });

  describe('#dismiss', () => {
    it('does not dismiss the message if it does not exist', () => {
      fakeStore.getToastMessage.returns(undefined);

      service.dismiss('someid');

      assert.notCalled(fakeStore.removeToastMessage);
    });

    it('removes the message from the store', () => {
      fakeStore.getToastMessage.returns({
        type: 'success',
        message: 'yay',
        isDismissed: false,
      });

      service.dismiss('someid');

      assert.calledOnce(fakeStore.removeToastMessage);
      assert.calledWith(fakeStore.removeToastMessage, 'someid');
    });

    it('emits "toastMessageDismissed" event', () => {
      fakeStore.getToastMessage.returns({
        id: 'someid',
        type: 'success',
        message: 'yay',
        isDismissed: false,
      });

      const fakeHandler = sinon.stub();
      service.on('toastMessageDismissed', fakeHandler);

      service.dismiss('someid');
      assert.calledWith(fakeHandler, 'someid');
    });
  });

  context('when the message is delayed', () => {
    it('behaves same as non-delayed message if document is focused', () => {
      fakeWindow.document.hasFocus.returns(true);
      service.notice('foo', { delayed: true });

      assert.calledWith(
        fakeStore.addToastMessage,
        sinon.match({ type: 'notice', message: 'foo' }),
      );
    });

    it('defers adding message if the document is not focused', () => {
      fakeWindow.document.hasFocus.returns(false);
      service.notice('foo', { delayed: true });

      assert.notCalled(fakeStore.addToastMessage);
    });

    it('dispatches all deferred messages when the document is focused', () => {
      fakeWindow.document.hasFocus.returns(false);
      service.notice('foo', { delayed: true });
      service.notice('bar', { delayed: true });

      assert.notCalled(fakeStore.addToastMessage);
      fakeWindow.dispatchEvent(new Event('focus'));
      assert.calledTwice(fakeStore.addToastMessage);
    });
  });
});
