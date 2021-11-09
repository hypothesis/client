import { ListenerCollection } from '../listener-collection';

describe('ListenerCollection', () => {
  let listeners;

  beforeEach(() => {
    listeners = new ListenerCollection();
  });

  afterEach(() => {
    listeners.removeAll();
  });

  describe('#add', () => {
    it('registers and triggers event listener', () => {
      const listener = sinon.stub();
      listeners.add(window, 'resize', listener);

      window.dispatchEvent(new Event('resize'));
      assert.calledOnce(listener);
    });
  });

  describe('#remove', () => {
    it('unregisters some event listeners', () => {
      const listener1 = sinon.stub();
      const listener2 = sinon.stub();
      listeners.add(window, 'resize', listener1);
      const listenerId = listeners.add(window, 'resize', listener2);
      listeners.remove(listenerId);

      window.dispatchEvent(new Event('resize'));
      assert.calledOnce(listener1);
      assert.notCalled(listener2);
    });
  });

  describe('#removeAll', () => {
    it('unregisters all event listeners', () => {
      const listener1 = sinon.stub();
      const listener2 = sinon.stub();
      listeners.add(window, 'resize', listener1);
      listeners.add(window, 'resize', listener2);
      listeners.removeAll();

      window.dispatchEvent(new Event('resize'));
      assert.notCalled(listener1);
      assert.notCalled(listener2);
    });
  });
});
