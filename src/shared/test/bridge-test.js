'use strict';

const Bridge = require('../bridge');
const RPC = require('../frame-rpc');

describe('shared.bridge', function() {
  const sandbox = sinon.sandbox.create();
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

  describe('#createChannel', function() {
    it('creates a new channel with the provided options', function() {
      const channel = createChannel();
      assert.equal(channel.src, window);
      assert.equal(channel.dst, fakeWindow);
      assert.equal(channel.origin, 'http://example.com');
    });

    it('adds the channel to the .links property', function() {
      const channel = createChannel();
      assert.isTrue(
        bridge.links.some(
          link => link.channel === channel && link.window === fakeWindow
        )
      );
    });

    it('registers any existing listeners on the channel', function() {
      const message1 = sandbox.spy();
      const message2 = sandbox.spy();
      bridge.on('message1', message1);
      bridge.on('message2', message2);
      const channel = createChannel();
      assert.propertyVal(channel._methods, 'message1', message1);
      assert.propertyVal(channel._methods, 'message2', message2);
    });

    it('returns the newly created channel', function() {
      const channel = createChannel();
      assert.instanceOf(channel, RPC);
    });
  });

  describe('#call', function() {
    it('forwards the call to every created channel', function() {
      const channel = createChannel();
      sandbox.stub(channel, 'call');
      bridge.call('method1', 'params1');
      assert.called(channel.call);
      assert.calledWith(channel.call, 'method1', 'params1');
    });

    it('provides a timeout', function(done) {
      const channel = createChannel();
      sandbox.stub(channel, 'call');
      sandbox.stub(window, 'setTimeout').yields();
      bridge.call('method1', 'params1', done);
    });

    it('calls a callback when all channels return successfully', function(done) {
      const channel1 = createChannel();
      const channel2 = bridge.createChannel(
        fakeWindow,
        'http://example.com',
        'NEKOT'
      );
      sandbox.stub(channel1, 'call').yields(null, 'result1');
      sandbox.stub(channel2, 'call').yields(null, 'result2');

      const callback = function(err, results) {
        assert.isNull(err);
        assert.deepEqual(results, ['result1', 'result2']);
        done();
      };

      bridge.call('method1', 'params1', callback);
    });

    it('calls a callback with an error when a channels fails', function(done) {
      const error = new Error('Uh oh');
      const channel1 = createChannel();
      const channel2 = bridge.createChannel(
        fakeWindow,
        'http://example.com',
        'NEKOT'
      );
      sandbox.stub(channel1, 'call').throws(error);
      sandbox.stub(channel2, 'call').yields(null, 'result2');

      const callback = function(err) {
        assert.equal(err, error);
        done();
      };

      bridge.call('method1', 'params1', callback);
    });

    it('destroys the channel when a call fails', function(done) {
      const channel = createChannel();
      sandbox.stub(channel, 'call').throws(new Error(''));
      sandbox.stub(channel, 'destroy');

      const callback = function() {
        assert.called(channel.destroy);
        done();
      };

      bridge.call('method1', 'params1', callback);
    });

    it('no longer publishes to a channel that has had an error', function(done) {
      const channel = createChannel();
      sandbox.stub(channel, 'call').throws(new Error('oeunth'));
      bridge.call('method1', 'params1', function() {
        assert.calledOnce(channel.call);
        bridge.call('method1', 'params1', function() {
          assert.calledOnce(channel.call);
          done();
        });
      });
    });

    it('treats a timeout as a success with no result', function(done) {
      const channel = createChannel();
      sandbox.stub(channel, 'call');
      sandbox.stub(window, 'setTimeout').yields();
      bridge.call('method1', 'params1', function(err, res) {
        assert.isNull(err);
        assert.deepEqual(res, [null]);
        done();
      });
    });

    it('returns a promise object', function() {
      createChannel();
      const ret = bridge.call('method1', 'params1');
      assert.instanceOf(ret, Promise);
    });
  });

  describe('#on', function() {
    it('adds a method to the method registry', function() {
      createChannel();
      bridge.on('message1', sandbox.spy());
      assert.isFunction(bridge.channelListeners.message1);
    });

    it('only allows registering a method once', function() {
      bridge.on('message1', sandbox.spy());
      assert.throws(() => bridge.on('message1', sandbox.spy()));
    });
  });

  describe('#off', () =>
    it('removes the method from the method registry', function() {
      createChannel();
      bridge.on('message1', sandbox.spy());
      bridge.off('message1');
      assert.isUndefined(bridge.channelListeners.message1);
    }));

  describe('#onConnect', function() {
    it('adds a callback that is called when a channel is connected', function(done) {
      let channel;
      const callback = function(c, s) {
        assert.strictEqual(c, channel);
        assert.strictEqual(s, fakeWindow);
        done();
      };

      const data = {
        protocol: 'frame-rpc',
        method: 'connect',
        arguments: ['TOKEN'],
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

    it('allows multiple callbacks to be registered', function(done) {
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
        protocol: 'frame-rpc',
        method: 'connect',
        arguments: ['TOKEN'],
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
    it('destroys all opened channels', function() {
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
