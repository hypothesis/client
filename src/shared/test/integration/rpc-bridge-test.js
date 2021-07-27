import Bridge from '../../bridge';

describe('RPC-Bridge integration', () => {
  const sandbox = sinon.createSandbox();
  let clock;
  let port1;
  let port2;
  let bridges = [];

  function createBridge() {
    const bridge = new Bridge();
    bridges.push(bridge);
    return bridge;
  }

  function waitForMessageDelivery() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    const channel = new MessageChannel();
    port1 = channel.port1;
    port2 = channel.port2;
  });

  afterEach(() => {
    bridges.forEach(bridge => bridge.destroy());
    sandbox.restore();
    clock.restore();
  });

  context('establishing a connection', () => {
    it('should invoke Bridge `onConnect` callbacks after connecting', async () => {
      clock.restore();
      const bridge = createBridge();
      const reciprocalBridge = createBridge();

      let callbackCount = 0;
      const callback = () => {
        ++callbackCount;
      };

      bridge.onConnect(callback);
      bridge.onConnect(callback); // allows multiple callbacks to be registered
      reciprocalBridge.onConnect(callback);

      const channel = bridge.createChannel(port1);
      reciprocalBridge.createChannel(port2);

      await waitForMessageDelivery();
      assert.equal(callbackCount, 3);

      // Additional calls to the RPC `connect` method are ignored
      channel.call('connect');
      reciprocalBridge.call('connect');

      await waitForMessageDelivery();
      assert.equal(callbackCount, 3);
    });
  });

  context('sending and receiving RPC messages', () => {
    let bridge;

    beforeEach(() => {
      bridge = createBridge();
      const otherChannel = new MessageChannel();
      bridge.createChannel(port1);
      bridge.createChannel(otherChannel.port1);
      const reciprocalBridge1 = createBridge();
      const reciprocalBridge2 = createBridge();
      reciprocalBridge1.on('method1', (arg, cb) => cb(null, `${arg}foo`));
      reciprocalBridge2.on('method1', (arg, cb) => cb(null, `${arg}bar`));
      reciprocalBridge1.createChannel(port2);
      reciprocalBridge2.createChannel(otherChannel.port2);
    });

    it('should invoke Bridge method handler on every channel when calling a RPC method (with Promise)', async () => {
      const results = await bridge.call('method1', 'params1');
      assert.deepEqual(results.sort(), ['params1foo', 'params1bar'].sort());
    });

    it('should invoke Bridge method handler on every channel when calling a RPC method (with callback)', done => {
      bridge.call('method1', 'params1', (err, results) => {
        assert.deepEqual(results.sort(), ['params1foo', 'params1bar'].sort());
        assert.isNull(err);
        done();
      });
    });
  });

  context('errors and timeouts', () => {
    it(`raises an error when the listener's callback fails`, async () => {
      const bridge = createBridge();
      const reciprocalBridge = createBridge();
      const errorMessage = 'My error';
      bridge.on('method1', (_arg, cb) => cb(errorMessage));
      bridge.createChannel(port1);
      reciprocalBridge.createChannel(port2);

      let error;
      try {
        await reciprocalBridge.call('method1', 'params1');
      } catch (err) {
        error = err;
      }
      assert.equal(error, errorMessage);
    });

    it('destroys the Bridge channel when a RPC message fails', async () => {
      const bridge = createBridge();
      const reciprocalBridge = createBridge();
      const errorMessage = 'My error';
      bridge.on('method1', (_arg, cb) => cb(errorMessage));
      bridge.createChannel(port1);
      const channel = reciprocalBridge.createChannel(port2);
      sandbox.stub(channel, 'destroy').callThrough();

      let error;
      try {
        await reciprocalBridge.call('method1', 'params1');
      } catch (err) {
        error = err;
      }

      assert.called(channel.destroy);
      assert.equal(error, errorMessage);
      assert.deepEqual(reciprocalBridge.links, []);
    });

    it('no longer send RPC messages to a Bridge channel that has received an error', async () => {
      const bridge = createBridge();
      const reciprocalBridge = createBridge();
      const errorMessage = 'My error';
      bridge.on('method1', (_arg, cb) => cb(new Error(errorMessage)));
      bridge.createChannel(port1);
      const channel = reciprocalBridge.createChannel(port2);
      sandbox.stub(channel, 'call').callThrough();

      let error;
      try {
        await reciprocalBridge.call('method1', 'params1');
      } catch (err) {
        error = err;
      }
      assert.equal(error.message, errorMessage);

      for (let i = 0; i < 5; ++i) {
        const results = await reciprocalBridge.call('method1', 'params1');
        assert.deepEqual(results, []);
        assert.calledOnce(channel.call);
      }
    });

    it('timeouts if the Bridge channel is not connected', done => {
      const bridge = createBridge();
      bridge.createChannel(port1);

      bridge.call('method1', 'params1', (err, results) => {
        assert.deepEqual(results, [null]); // returns null for each channel that timeouts
        assert.isNull(err); // no error
        done();
      });
      clock.tick(1000);
    });

    it(`timeouts if the Bridge channel is connected but reciprocal Bridge channel doesn't answer`, done => {
      const bridge = createBridge();
      const reciprocalBridge = createBridge();
      bridge.createChannel(port1);
      reciprocalBridge.createChannel(port2); // the reciprocal port hasn't registered a RPC method called 'method1'

      bridge.call('method1', 'params1', (err, results) => {
        assert.deepEqual(results, [null]);
        assert.isNull(err);
        done();
      });
      clock.tick(1000);
    });

    it('timeouts if the reciprocal Bridge channel has been destroyed', done => {
      const bridge = createBridge();
      const reciprocalBridge = createBridge();
      bridge.on('method1', (arg, cb) => cb(null, `${arg}foo`));
      reciprocalBridge.on('method2', (arg, cb) => cb(null, `${arg}bar`));
      bridge.createChannel(port1);
      reciprocalBridge.createChannel(port2);

      reciprocalBridge.destroy();

      bridge.call('method2', 'params1', (err, results) => {
        assert.deepEqual(results, [null]);
        assert.isNull(err);
        done();
      });
      clock.tick(1000);

      reciprocalBridge.call('method1', 'params1', (err, results) => {
        assert.deepEqual(results, []);
        assert.isNull(err);
        done();
      });
    });
  });
});
