import { default as Bridge, $imports } from '../bridge';

class FakeRPC {
  constructor(sourceFrame, destFrame, origin, methods) {
    this.destFrame = destFrame;
    this.sourceFrame = sourceFrame;
    this.origin = origin;
    this.methods = methods;

    this.call = sinon.stub();
    this.destroy = sinon.stub();
  }
}

describe('shared/bridge', () => {
  const sandbox = sinon.createSandbox();
  let bridge;
  let createChannel;
  let fakeWindow;

  beforeEach(() => {
    bridge = new Bridge();

    createChannel = source => {
      if (!source) {
        source = {
          source: fakeWindow,
          origin: 'http://example.com',
          token: 'TOKEN',
        };
      }
      return bridge.createChannel(source);
    };

    fakeWindow = {
      postMessage: sandbox.stub(),
    };

    $imports.$mock({
      './frame-rpc': { RPC: FakeRPC },
    });
  });

  afterEach(() => {
    $imports.$restore();
    sandbox.restore();
  });

  describe('#createChannel', () => {
    context('with a Window source', () => {
      it('creates a new channel', () => {
        const channel = createChannel();
        assert.equal(channel.sourceFrame, window);
        assert.equal(channel.destFrame, fakeWindow);
        assert.equal(channel.origin, 'http://example.com');
      });

      it('adds the channel to the `links` property', () => {
        const channel = createChannel();
        assert.isTrue(
          bridge.links.some(registeredChannel => registeredChannel === channel)
        );
      });
    });

    context('with a MessagePort source', () => {
      it('creates a new channel', () => {
        const messageChannel = new MessageChannel();

        const channel = createChannel(messageChannel.port1);

        assert.equal(channel.sourceFrame, window);
        assert.equal(channel.destFrame, messageChannel.port1);
        assert.equal(channel.origin, '*');
      });

      it('adds the channel to the `links` property', () => {
        const channel = createChannel();
        assert.isTrue(
          bridge.links.some(registeredChannel => registeredChannel === channel)
        );
      });
    });

    it('registers any existing listeners on the channel', () => {
      const message1 = sandbox.spy();
      const message2 = sandbox.spy();
      bridge.on('message1', message1);
      bridge.on('message2', message2);
      const channel = createChannel();
      assert.propertyVal(channel.methods, 'message1', message1);
      assert.propertyVal(channel.methods, 'message2', message2);
    });

    it('returns the newly created channel', () => {
      const channel = createChannel();
      assert.instanceOf(channel, FakeRPC);
    });
  });

  describe('#call', () => {
    it('returns an empty array calling a RPC method before a channel is created', async () => {
      const results = await bridge.call('method1', 'params1');
      assert.deepEqual(results, []);
    });

    it('forwards the call to every created channel', () => {
      const channel = createChannel();
      channel.call.resetHistory();
      bridge.call('method1', 'params1');
      assert.calledWith(channel.call, 'method1', 'params1');
    });

    it('provides a timeout', done => {
      createChannel();
      sandbox.stub(window, 'setTimeout').yields();
      bridge.call('method1', 'params1', done);
    });

    it('calls a callback when all channels return successfully', done => {
      const channel1 = createChannel();
      const channel2 = bridge.createChannel({
        source: fakeWindow,
        origin: 'http://example.com',
        token: 'NEKOT',
      });
      channel1.call.yields(null, 'result1');
      channel2.call.yields(null, 'result2');

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
      const channel2 = bridge.createChannel({
        source: fakeWindow,
        origin: 'http://example.com',
        token: 'NEKOT',
      });
      channel1.call.throws(error);
      channel2.call.yields(null, 'result2');

      const callback = function (err) {
        assert.equal(err, error);
        done();
      };

      bridge.call('method1', 'params1', callback);
    });

    it('destroys the channel when a call fails', done => {
      const channel = createChannel();
      channel.call.throws(new Error(''));

      const callback = () => {
        assert.called(channel.destroy);
        done();
      };

      bridge.call('method1', 'params1', callback);
    });

    it('no longer publishes to a channel that has had an error', done => {
      const channel = createChannel();
      const error = new Error('Error sending message');

      channel.call.resetHistory(); // Discard initial "connect" call.
      channel.call.throws(error);

      bridge.call('method1', 'params1', () => {
        assert.calledOnce(channel.call);
        bridge.call('method1', 'params1', () => {
          assert.calledOnce(channel.call);
          done();
        });
      });
    });

    it('treats a timeout as a success with no result', done => {
      createChannel();
      sandbox.stub(window, 'setTimeout').yields();
      bridge.call('method1', 'params1', (err, res) => {
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
      createChannel();
      assert.isFunction(bridge.channelListeners.message1);
    });

    it('raise an error if trying to register a listener after a channel has been already created', () => {
      createChannel();
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

    it('only allows registering a listener once', () => {
      bridge.on('message1', () => {});
      let error;
      try {
        bridge.on('message1', () => {});
      } catch (err) {
        error = err;
      }

      assert.equal(
        error.message,
        "Listener 'message1' already bound in Bridge"
      );
    });
  });

  describe('#onConnect', () => {
    // Simulate a Bridge attached to the other end of a channel receiving
    // the `connect` RPC request and handling it using the `connect` handler
    // registered by the Bridge.
    const runConnectHandler = channel => {
      const connectCall = channel.call
        .getCalls()
        .find(call => call.firstArg === 'connect');

      // Invoke the `connect` handler. Here we're invoking it on `channel` but
      // in the actual app this would be called on the counterpart channel in
      // the other frame. This distinction doesn't matter because all the
      // handler does is check a token (which is the same on both sides) and
      // call the result callback.
      channel.methods.connect(...connectCall.args.slice(1));
    };

    it('runs callbacks when a Window channel connects with correct token', () => {
      const onConnectCallback = sinon.stub();
      bridge.onConnect(onConnectCallback);

      const channel = createChannel();

      runConnectHandler(channel);

      assert.calledWith(onConnectCallback, channel);
    });

    it('does not run callback if a Window channel connects with wrong token', () => {
      const onConnectCallback = sinon.stub();
      bridge.onConnect(onConnectCallback);

      const channel = createChannel();

      // Simulate "connect" RPC call by Bridge instance in channel's destination frame.
      const connectCall = channel.call
        .getCalls()
        .find(call => call.firstArg === 'connect');
      channel.methods.connect('WRONG-TOKEN', connectCall.lastArg);

      assert.notCalled(onConnectCallback);
    });

    it('runs callbacks when a MessagePort channel connects', () => {
      const onConnectCallback = sinon.stub();
      bridge.onConnect(onConnectCallback);

      const messageChannel = new MessageChannel();
      const channel = createChannel(messageChannel.port1);

      runConnectHandler(channel);

      assert.calledWith(onConnectCallback, channel);
    });

    it('allows multiple callbacks to be registered', () => {
      const onConnectCallback1 = sinon.stub();
      const onConnectCallback2 = sinon.stub();
      bridge.onConnect(onConnectCallback1);
      bridge.onConnect(onConnectCallback2);

      const channel = createChannel();

      runConnectHandler(channel);

      assert.calledWith(onConnectCallback1, channel);
      assert.calledWith(onConnectCallback2, channel);
    });

    it('only invokes `onConnect` callback once', () => {
      const onConnectCallback = sinon.stub();
      bridge.onConnect(onConnectCallback);

      const channel = createChannel();

      runConnectHandler(channel);
      runConnectHandler(channel);

      assert.calledOnce(onConnectCallback);
    });
  });

  describe('#destroy', () =>
    it('destroys all opened channels', () => {
      const channel1 = bridge.createChannel({
        source: fakeWindow,
        origin: 'http://example.com',
        token: 'foo',
      });
      const channel2 = bridge.createChannel({
        source: fakeWindow,
        origin: 'http://example.com',
        token: 'bar',
      });

      bridge.destroy();

      assert.called(channel1.destroy);
      assert.called(channel2.destroy);
    }));
});
