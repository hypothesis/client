import { EventEmitter } from '../event-emitter';

describe('EventEmitter', () => {
  describe('#on', () => {
    it('registers a subscriber', () => {
      const onFoo = sinon.stub();
      const onBar = sinon.stub();
      const emitter = new EventEmitter();

      emitter.on('foo', onFoo);
      emitter.on('bar', onBar);
      emitter.emit('foo', 1, 2);
      emitter.emit('bar', 3, 4);

      assert.calledOnce(onFoo);
      assert.calledWith(onFoo, 1, 2);
      assert.calledOnce(onBar);
      assert.calledWith(onBar, 3, 4);
    });
  });

  describe('#off', () => {
    it('removes a subscriber', () => {
      const onFoo = sinon.stub();
      const onFoo2 = sinon.stub();
      const emitter = new EventEmitter();

      emitter.on('foo', onFoo);
      emitter.on('foo', onFoo2);
      emitter.off('foo', onFoo);
      emitter.emit('foo', 1, 2);

      assert.notCalled(onFoo);
      assert.calledWith(onFoo2, 1, 2);
    });
  });

  describe('#destroy', () => {
    it('removes all subscribers', () => {
      const onFoo = sinon.stub();
      const onFoo2 = sinon.stub();
      const emitter = new EventEmitter();

      emitter.on('foo', onFoo);
      emitter.on('foo', onFoo2);
      emitter.destroy();
      emitter.emit('foo', 1, 2);

      assert.notCalled(onFoo);
      assert.notCalled(onFoo2);
    });
  });
});
