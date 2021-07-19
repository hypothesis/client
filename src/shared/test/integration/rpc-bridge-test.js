import Bridge from '../../bridge';
import { RPC } from '../../frame-rpc';

describe('rpc-bridge integration', () => {
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

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    const channel = new MessageChannel();
    port1 = channel.port1;
    port2 = channel.port2;
  });

  afterEach(() => {
    bridges.forEach(bridge => bridge.destroy);
    sandbox.restore();
    clock.restore();
  });

  describe('#createChannel', () => {
    it('creates a new channel using a `MessageChannel` port', () => {
      const bridge = createBridge();
      const newChannel = bridge.createChannel(port1);
      assert.instanceOf(newChannel, RPC);
      assert.isTrue(bridge.links[0] === newChannel);
    });
  });

  describe('#onConnect', () => {
    it('triggers `onConnect` callbacks when ports are `connected`', done => {
      const bridge = createBridge();
      const reciprocalBridge = createBridge();

      let callbackCount = 0;
      const callback = () => {
        ++callbackCount;
      };

      bridge.onConnect(callback);
      reciprocalBridge.onConnect(callback);

      const channel = bridge.createChannel(port1);
      reciprocalBridge.createChannel(port2);

      channel.call('connect'); // Multiple callse to `connect` are ignored
      channel.call('connect', () => {
        assert.equal(callbackCount, 2);
        done();
      });
    });

    it('allows multiple callbacks to be registered', done => {
      const bridge = createBridge();
      const reciprocalBridge = createBridge();

      let channel;
      let callbackCount = 0;
      const callback = c => {
        ++callbackCount;
        assert.strictEqual(c, channel);
      };

      bridge.onConnect(callback);
      bridge.onConnect(callback);
      channel = bridge.createChannel(port1);
      reciprocalBridge.createChannel(port2);
      channel.call('connect', () => {
        assert.equal(callbackCount, 2);
        done();
      });
    });
  });

  describe('#on', () => {
    it('raise an error if trying to register a listener after a channel has been already created', () => {
      const bridge = createBridge();
      bridge.createChannel(port1);

      let error;
      try {
        bridge.on('message1', () => {});
      } catch (err) {
        error = err;
      }

      assert.equal(
        error.message,
        "Listener 'message1' can't be registered because a channel has already been created"
      );
    });

    it('raises an error when trying to register a listener twice', () => {
      const bridge = createBridge();
      bridge.on('message1', sandbox.spy());

      let error;
      try {
        bridge.on('message1', sandbox.spy());
      } catch (err) {
        error = err;
      }

      assert.equal(
        error.message,
        "Listener 'message1' already bound in Bridge"
      );
    });
  });

  describe('#call', () => {
    it('forwards the call to every created channel (with Promise)', async () => {
      const bridge = createBridge();
      const otherChannel = new MessageChannel();
      bridge.createChannel(port1);
      bridge.createChannel(otherChannel.port1);

      const reciprocalBridge1 = createBridge();
      const reciprocalBridge2 = createBridge();
      reciprocalBridge1.on('method1', (arg, cb) => cb(null, `${arg}foo`));
      reciprocalBridge2.on('method1', (arg, cb) => cb(null, `${arg}bar`));
      reciprocalBridge1.createChannel(port2);
      reciprocalBridge2.createChannel(otherChannel.port2);

      const results = await bridge.call('method1', 'params1');
      assert.deepEqual(results.sort(), ['params1foo', 'params1bar'].sort());
    });

    it('forwards the call to every created channel (with callback)', done => {
      const bridge = createBridge();
      const reciprocalBridge1 = createBridge();
      const reciprocalBridge2 = createBridge();
      const otherChannel = new MessageChannel();
      bridge.createChannel(port1);
      bridge.createChannel(otherChannel.port1);

      reciprocalBridge1.on('method1', (arg, cb) => cb(null, `${arg}foo`));
      reciprocalBridge2.on('method1', (arg, cb) => cb(null, `${arg}bar`));
      reciprocalBridge1.createChannel(port2);
      reciprocalBridge2.createChannel(otherChannel.port2);

      bridge.call('method1', 'params1', (err, results) => {
        assert.deepEqual(results.sort(), ['params1foo', 'params1bar'].sort());
        assert.isNull(err);
        done();
      });
    });

    it('returns an empty array if call method before a channel is created', async () => {
      const bridge = createBridge();
      const results = await bridge.call('method1', 'params1');
      assert.equal(results.length, 0);
    });

    it('timeouts if the channel is not connected', done => {
      const bridge = createBridge();
      bridge.createChannel(port1);

      bridge.call('method1', 'params1', (err, results) => {
        assert.deepEqual(results, [null]);
        assert.isNull(err);
        done();
      });
      clock.tick(1000);
    });

    it(`timeouts if the other channel doesn't answer`, done => {
      const bridge = createBridge();
      const reciprocalBridge = createBridge();
      bridge.createChannel(port1);
      reciprocalBridge.createChannel(port2);

      bridge.call('method1', 'params1', (err, results) => {
        assert.deepEqual(results, [null]);
        assert.isNull(err);
        done();
      });
      clock.tick(1000);
    });

    it(`raises an error when the listener's callback 'fails'`, async () => {
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

    it('destroys the channel when a call fails', async () => {
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
      assert.equal(reciprocalBridge.links.length, 0);
    });

    it('no longer publishes to a channel that has had an error', async () => {
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
        reciprocalBridge.call('method1', 'params1');
        assert.calledOnce(channel.call);
      }
    });
  });

  describe('#destroy', () =>
    it('destroys all opened channels', done => {
      const bridge = createBridge();
      const reciprocalBridge = createBridge();
      bridge.on('method1', (arg, cb) => cb(null, `${arg}foo`));
      reciprocalBridge.on('method2', (arg, cb) => cb(null, `${arg}bar`));
      bridge.createChannel(port1);
      reciprocalBridge.createChannel(port2);

      reciprocalBridge.destroy();

      // It timeouts using bridge
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
    }));
});
