import Bridge from '../bridge';
import { RPC } from '../frame-rpc';

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

    sandbox.stub(window, 'addEventListener');
    sandbox.stub(window, 'removeEventListener');
  });

  afterEach(() => sandbox.restore());

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
        bridge.links.some(
          link => link.channel === channel && link.window === fakeWindow
        )
      );
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

  describe('#off', () =>
    it('removes the method from the method registry', () => {
      createChannel();
      bridge.on('message1', sandbox.spy());
      bridge.off('message1');
      assert.isUndefined(bridge.channelListeners.message1);
    }));

  describe('#onConnect', () => {
    it('adds a callback that is called when a channel is connected', done => {
      let channel;
      const callback = (c, s) => {
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

    it("doesn't trigger `onConnect` callbacks when a channel is connected from a different origin", done => {
      const callback = sinon.stub();

      const data = {
        arguments: ['TOKEN'],
        method: 'connect',
        protocol: 'frame-rpc',
        version: '1.0.0',
      };

      addEventListener.yieldsAsync({
        data,
        origin: 'http://other.dummy',
        source: fakeWindow,
      });

      bridge.onConnect(callback);
      createChannel();

      setTimeout(() => {
        assert.notCalled(callback);
        done();
      }, 0);
    });

    it("doesn't trigger `onConnect` callbacks when a channel is connected from a different source", done => {
      const callback = sinon.stub();

      const data = {
        arguments: ['TOKEN'],
        method: 'connect',
        protocol: 'frame-rpc',
        version: '1.0.0',
      };

      addEventListener.yieldsAsync({
        data,
        origin: 'http://example.com',
        source: 'other',
      });

      bridge.onConnect(callback);
      createChannel();

      setTimeout(() => {
        assert.notCalled(callback);
        done();
      }, 0);
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
