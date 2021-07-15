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

    createChannel = () =>
      bridge.createChannel(fakeWindow, 'http://example.com', 'TOKEN');

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
    it('creates a new channel with the provided options', () => {
      const channel = createChannel();
      assert.equal(channel.sourceFrame, window);
      assert.equal(channel.destFrame, fakeWindow);
      assert.equal(channel.origin, 'http://example.com');
    });

    it('adds the channel to the .links property', () => {
      const channel = createChannel();
      assert.isTrue(
        bridge.links.some(registeredChannel => registeredChannel === channel)
      );
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
      const channel2 = bridge.createChannel(
        fakeWindow,
        'http://example.com',
        'NEKOT'
      );
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
      const channel2 = bridge.createChannel(
        fakeWindow,
        'http://example.com',
        'NEKOT'
      );
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
      createChannel();
      bridge.on('message1', sandbox.spy());
      assert.isFunction(bridge.channelListeners.message1);
    });

    it('only allows registering a method once', () => {
      bridge.on('message1', sandbox.spy());
      assert.throws(() => bridge.on('message1', sandbox.spy()));
    });
  });

  describe('#onConnect', () => {
    it('adds a callback that is called when a channel is connected', () => {
      const onConnectCallback = sinon.stub();
      bridge.onConnect(onConnectCallback);

      const channel = createChannel();

      // Simulate "connect" RPC call by Bridge instance in channel's destination frame.
      channel.methods.connect('TOKEN', sinon.stub());

      assert.calledWith(onConnectCallback, channel, fakeWindow);
    });

    it('does not run `onConnect` callbacks if the token is wrong', () => {
      const onConnectCallback = sinon.stub();
      bridge.onConnect(onConnectCallback);

      const channel = createChannel();

      // Simulate "connect" RPC call by Bridge instance in channel's destination frame.
      channel.methods.connect('WRONG-TOKEN', sinon.stub());

      assert.notCalled(onConnectCallback);
    });

    it('allows multiple callbacks to be registered', () => {
      const onConnectCallback1 = sinon.stub();
      const onConnectCallback2 = sinon.stub();
      bridge.onConnect(onConnectCallback1);
      bridge.onConnect(onConnectCallback2);

      const channel = createChannel();

      // Simulate "connect" RPC call by Bridge instance in channel's destination frame.
      channel.methods.connect('TOKEN', sinon.stub());

      assert.calledWith(onConnectCallback1, channel, fakeWindow);
      assert.calledWith(onConnectCallback2, channel, fakeWindow);
    });

    it('only invokes `onConnect` callback once', () => {
      const onConnectCallback = sinon.stub();
      bridge.onConnect(onConnectCallback);

      const channel = createChannel();

      // Simulate "connect" RPC call by Bridge instance in channel's destination frame.
      channel.methods.connect('TOKEN', sinon.stub());
      channel.methods.connect('TOKEN', sinon.stub());

      assert.calledOnce(onConnectCallback);
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

      bridge.destroy();

      assert.called(channel1.destroy);
      assert.called(channel2.destroy);
    }));
});
