import Bridge from '../bridge';
import { RPC } from '../frame-rpc';

describe('shared/bridge', () => {
  const sandbox = sinon.createSandbox();
  let bridge;
  let createChannel;
  let fakeWindow;

  beforeEach(() => {
    bridge = new Bridge();

    fakeWindow = {
      postMessage: sandbox.stub(),
    };

    createChannel = (
      source = fakeWindow,
      origin = 'http://example.com',
      token = 'TOKEN'
    ) => bridge.createChannel(source, origin, token);

    sandbox.stub(window, 'addEventListener');
    sandbox.stub(window, 'removeEventListener');
  });

  afterEach(() => {
    sandbox.restore();
    bridge.destroy();
  });

  context('using Window', () => {
    describe('#createChannel', () => {
      it('creates a new channel with the provided options', () => {
        const channel = createChannel();
        assert.equal(channel.sourceFrame, window);
        assert.equal(channel.destFrame, fakeWindow);
        assert.equal(channel.origin, 'http://example.com');
      });

      it('adds the channel to the .links property', () => {
        const newChannel = createChannel();
        assert.isTrue(bridge.links.some(channel => channel === newChannel));
      });

      it('registers any existing listeners on the channel', () => {
        const message1 = sandbox.spy();
        const message2 = sandbox.spy();
        bridge.on('message1', message1);
        bridge.on('message2', message2);
        const channel = createChannel();
        assert.propertyVal(channel._methods, 'message1', message1);
        assert.propertyVal(channel._methods, 'message2', message2);
      });

      it('returns the newly created channel', () => {
        const channel = createChannel();
        assert.instanceOf(channel, RPC);
      });
    });

    describe('#call', () => {
      it('forwards the call to every created channel', () => {
        const channel = createChannel();
        sandbox.stub(channel, 'call');
        bridge.call('method1', 'params1');
        assert.called(channel.call);
        assert.calledWith(channel.call, 'method1', 'params1');
      });

      it('provides a timeout', done => {
        const channel = createChannel();
        sandbox.stub(channel, 'call');
        sandbox.stub(window, 'setTimeout').yields();
        bridge.call('method1', 'params1', done);
      });

      it('calls a callback when all channels return successfully', done => {
        const channel1 = createChannel();
        const channel2 = bridge.createChannel(
          fakeWindow,
          'http://example.com',
          'NEKOT'
        );
        sandbox.stub(channel1, 'call').yields(null, 'result1');
        sandbox.stub(channel2, 'call').yields(null, 'result2');

        const callback = function (err, results) {
          assert.isNull(err);
          assert.deepEqual(results, ['result1', 'result2']);
          done();
        };

        bridge.call('method1', 'params1', callback);
      });

      it('calls a callback with an error when a channels fails', done => {
        const error = new Error('Uh oh');
        const channel1 = createChannel();
        const channel2 = bridge.createChannel(
          fakeWindow,
          'http://example.com',
          'NEKOT'
        );
        sandbox.stub(channel1, 'call').throws(error);
        sandbox.stub(channel2, 'call').yields(null, 'result2');

        const callback = function (err) {
          assert.equal(err, error);
          done();
        };

        bridge.call('method1', 'params1', callback);
      });

      it('destroys the channel when a call fails', done => {
        const channel = createChannel();
        sandbox.stub(channel, 'call').throws(new Error(''));
        sandbox.stub(channel, 'destroy');

        const callback = () => {
          assert.called(channel.destroy);
          done();
        };

        bridge.call('method1', 'params1', callback);
      });

      it('no longer publishes to a channel that has had an error', done => {
        const channel = createChannel();
        sandbox.stub(channel, 'call').throws(new Error('oeunth'));
        bridge.call('method1', 'params1', () => {
          assert.calledOnce(channel.call);
          bridge.call('method1', 'params1', () => {
            assert.calledOnce(channel.call);
            done();
          });
        });
      });

      it('treats a timeout as a success with no result', done => {
        const channel = createChannel();
        sandbox.stub(channel, 'call');
        sandbox.stub(window, 'setTimeout').yields();
        bridge.call('method1', 'params1', function (err, res) {
          assert.isNull(err);
          assert.deepEqual(res, [null]);
          done();
        });
      });

      it('returns a promise object', () => {
        createChannel();
        const ret = bridge.call('method1', 'params1');
        assert.instanceOf(ret, Promise);
      });
    });

    describe('#on', () => {
      it('adds a method to the method registry', () => {
        bridge.on('message1', sandbox.spy());
        assert.isFunction(bridge.channelListeners.message1);
      });

      it('only allows registering a method once', () => {
        bridge.on('message1', sandbox.spy());
        assert.throws(() => bridge.on('message1', sandbox.spy()));
      });
    });

    describe('#off', () =>
      it('removes the method from the method registry', () => {
        bridge.on('message1', sandbox.spy());
        bridge.off('message1');
        assert.isUndefined(bridge.channelListeners.message1);
      }));

    describe('#onConnect', () => {
      it('adds a callback that is called when a channel is connected', done => {
        let channel;
        const callback = function (c, s) {
          assert.strictEqual(c, channel);
          assert.strictEqual(s, fakeWindow);
          done();
        };

        const data = {
          arguments: ['TOKEN'],
          method: 'connect',
          protocol: 'frame-rpc',
          version: '1.0.0',
        };

        const event = {
          source: fakeWindow,
          origin: 'http://example.com',
          data,
        };

        addEventListener.yieldsAsync(event);
        bridge.onConnect(callback);
        channel = createChannel();
      });

      it('allows multiple callbacks to be registered', done => {
        let channel;
        let callbackCount = 0;
        const callback = (c, s) => {
          assert.strictEqual(c, channel);
          assert.strictEqual(s, fakeWindow);
          if (++callbackCount === 2) {
            done();
          }
        };

        const data = {
          arguments: ['TOKEN'],
          method: 'connect',
          protocol: 'frame-rpc',
          version: '1.0.0',
        };

        const event = {
          source: fakeWindow,
          origin: 'http://example.com',
          data,
        };

        addEventListener.callsArgWithAsync(1, event);
        bridge.onConnect(callback);
        bridge.onConnect(callback);
        channel = createChannel();
      });
    });

    describe('#destroy', () =>
      it('destroys all opened channels', () => {
        const channel1 = bridge.createChannel(
          fakeWindow,
          'http://example.com',
          'foo'
        );
        const channel2 = bridge.createChannel(
          fakeWindow,
          'http://example.com',
          'bar'
        );
        sinon.spy(channel1, 'destroy');
        sinon.spy(channel2, 'destroy');

        bridge.destroy();

        assert.called(channel1.destroy);
        assert.called(channel2.destroy);
      }));
  });

  context('using MessagePort', () => {
    let port1;
    let port2;
    let bridges = [];

    const createBridge = () => {
      const newBridge = new Bridge();
      bridges.push(newBridge);
      return newBridge;
    };

    const createChannelFromBridge = (bridge, port, destination = 'dummy') =>
      bridge.createChannelFromPort(port, destination);

    beforeEach(() => {
      const channel = new MessageChannel();
      port1 = channel.port1;
      port2 = channel.port2;
    });

    afterEach(() => {
      bridges.forEach(bridge => bridge.destroy);
    });

    describe('#createChannelFromPort', () => {
      it('creates a new channel using a `MessageChannel` port', () => {
        const newChannel = createChannel(port1);
        assert.instanceOf(newChannel, RPC);
        assert.isTrue(bridge.links.some(channel => channel === newChannel));
      });
    });

    describe('#onConnect', () => {
      it('triggers `onConnect` callbacks when ports are `connected`', done => {
        let callbackCount = 0;
        const callback = () => {
          ++callbackCount;
          assert.isAtMost(
            callbackCount,
            2,
            'the callback should not be called more than 2 times'
          );
          if (callbackCount === 2) {
            done();
          }
        };

        const reciprocalBridge = createBridge();

        bridge.onConnect(callback);
        reciprocalBridge.onConnect(callback);

        createChannel(port1);
        createChannelFromBridge(reciprocalBridge, port2);
      });

      it('allows multiple callbacks to be registered', done => {
        let channel;
        let callbackCount = 0;
        const callback = (c, p) => {
          ++callbackCount;
          assert.strictEqual(c, channel);
          assert.strictEqual(p, port1);
          if (callbackCount === 2) {
            done();
          }
        };

        bridge.onConnect(callback);
        bridge.onConnect(callback);
        channel = createChannel(port1);
        createChannelFromBridge(createBridge(), port2);
      });
    });

    describe('#on', () => {
      it('adds a method to the method registry', () => {
        const myFunction = () => 'hello world';
        bridge.on('message1', myFunction);
        assert.equal(bridge.channelListeners.message1, myFunction);
      });

      it('only allows registering a method once', () => {
        bridge.on('message1', sandbox.spy());
        assert.throws(() => bridge.on('message1', sandbox.spy()));
      });
    });

    describe('#off', () =>
      it('removes the method from the method registry', () => {
        bridge.on('message1', sandbox.spy());
        bridge.off('message1');
        assert.isUndefined(bridge.channelListeners.message1);
      }));

    describe('#call', () => {
      it('forwards the call to every created channel (with Promise)', async () => {
        const messageChannel = new MessageChannel();
        createChannel(port1);
        createChannel(messageChannel.port1);

        const reciprocalBridge1 = createBridge();
        const reciprocalBridge2 = createBridge();

        reciprocalBridge1.on('method1', (arg, cb) => cb(null, `${arg}foo`));
        reciprocalBridge2.on('method1', (arg, cb) => cb(null, `${arg}bar`));

        createChannelFromBridge(reciprocalBridge1, port2);
        createChannelFromBridge(reciprocalBridge2, messageChannel.port2);

        const results = await bridge.call('method1', 'params1');
        assert.deepEqual(results.sort(), ['params1foo', 'params1bar'].sort());
      });

      it('forwards the call to every created channel (with callback)', done => {
        const messageChannel = new MessageChannel();
        createChannel(port1);
        createChannel(messageChannel.port1);

        const reciprocalBridge1 = createBridge();
        const reciprocalBridge2 = createBridge();

        reciprocalBridge1.on('method1', (arg, cb) => cb(null, `${arg}foo`));
        reciprocalBridge2.on('method1', (arg, cb) => cb(null, `${arg}bar`));

        createChannelFromBridge(reciprocalBridge1, port2);
        createChannelFromBridge(reciprocalBridge2, messageChannel.port2);

        bridge.call('method1', 'params1', (err, results) => {
          assert.deepEqual(results.sort(), ['params1foo', 'params1bar'].sort());
          assert.isNull(err);
          done();
        });
      });

      it('provides a timeout', done => {
        createChannel(port1);
        const clock = sinon.useFakeTimers();

        try {
          bridge.call('method1', 'params1', (err, results) => {
            assert.deepEqual(results, [null]);
            assert.isNull(err);
            done();
          });
          clock.tick(1000);
        } finally {
          clock.restore();
        }
      });

      it('calls a callback with an error when a channels fails', async () => {
        const error = 'My error';
        bridge.on('method1', (arg, cb) => cb(error));
        createChannel(port1);

        const reciprocalBridge = createBridge();
        createChannelFromBridge(reciprocalBridge, port2);

        try {
          await reciprocalBridge.call('method1', 'params1');
        } catch (err) {
          assert.equal(err, error);
        }
      });

      it('destroys the channel when a call fails', done => {
        const channel = createChannel(port1);
        sandbox.stub(channel, 'call').throws(new Error(''));
        sandbox.stub(channel, 'destroy').callThrough();

        const callback = () => {
          assert.called(channel.destroy);
          assert.equal(bridge.links.length, 0);
          done();
        };

        bridge.call('method1', 'params1', callback);
      });

      it('no longer publishes to a channel that has had an error', done => {
        const channel = createChannel(port1);
        sandbox.stub(channel, 'call').throws(new Error(''));
        bridge.call('method1', 'params1', () => {
          assert.calledOnce(channel.call);
          bridge.call('method1', 'params1', () => {
            assert.calledOnce(channel.call);
            done();
          });
        });
      });
    });

    describe('#destroy', () =>
      it('destroys all opened channels', done => {
        const clock = sinon.useFakeTimers();
        bridge.on('method1', (arg, cb) => cb(null, `${arg}foo`));
        createChannel(port1);

        const reciprocalBridge = createBridge();
        reciprocalBridge.on('method2', (arg, cb) => cb(null, `${arg}bar`));

        createChannelFromBridge(reciprocalBridge, port2);

        try {
          reciprocalBridge.destroy();

          // It timeouts using bridge
          bridge.call('method2', 'params1', (err, results) => {
            assert.deepEqual(results, [null]);
            assert.isNull(err);
            done();
          });
          clock.tick(1000);

          // It timeouts using reciprocalBridge
          reciprocalBridge.call('method1', 'params1', (err, results) => {
            assert.deepEqual(results, [null]);
            assert.isNull(err);
            done();
          });
          clock.tick(1000);
        } finally {
          clock.restore();
        }
      }));
  });
});
