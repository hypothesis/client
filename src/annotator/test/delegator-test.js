import Delegator from '../delegator';

describe('Delegator', () => {
  it('constructor sets `element` and `options` properties', () => {
    const el = document.createElement('div');
    const config = { foo: 'bar' };

    const delegator = new Delegator(el, config);

    assert.equal(delegator.element, el);
    assert.deepEqual(delegator.options, config);
  });

  it('supports publishing and subscribing to events', () => {
    const element = document.createElement('div');

    const delegatorA = new Delegator(element);
    const delegatorB = new Delegator(element);

    const callback = sinon.stub();
    delegatorB.subscribe('someEvent', callback);
    delegatorA.publish('someEvent', ['foo', 'bar']);

    assert.calledOnce(callback);
    assert.calledWith(callback, 'foo', 'bar');

    delegatorB.unsubscribe('someEvent', callback);
    delegatorA.publish('someEvent', ['foo', 'bar']);

    assert.calledOnce(callback);
  });

  describe('#destroy', () => {
    it('removes all event subscriptions created by current instance', () => {
      const element = document.createElement('div');
      const delegator = new Delegator(element);
      const callback = sinon.stub();

      delegator.subscribe('someEvent', callback);
      delegator.publish('someEvent');
      assert.calledOnce(callback);

      delegator.destroy();
      delegator.publish('someEvent');
      assert.calledOnce(callback);
    });
  });
});
