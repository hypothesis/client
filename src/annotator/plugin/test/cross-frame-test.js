import CrossFrame from '../cross-frame';
import { $imports } from '../cross-frame';

describe('CrossFrame', () => {
  let fakeDiscovery;
  let fakeBridge;
  let fakeAnnotationSync;

  let proxyDiscovery;
  let proxyBridge;
  let proxyAnnotationSync;

  const createCrossFrame = options => {
    const defaults = {
      config: {},
      on: sinon.stub(),
      emit: sinon.stub(),
    };
    const element = document.createElement('div');
    return new CrossFrame(element, { ...defaults, ...options });
  };

  beforeEach(() => {
    fakeDiscovery = {
      startDiscovery: sinon.stub(),
      stopDiscovery: sinon.stub(),
    };

    fakeBridge = {
      destroy: sinon.stub(),
      createChannel: sinon.stub(),
      onConnect: sinon.stub(),
      call: sinon.stub(),
      on: sinon.stub(),
    };

    fakeAnnotationSync = { sync: sinon.stub() };

    proxyAnnotationSync = sinon.stub().returns(fakeAnnotationSync);
    proxyDiscovery = sinon.stub().returns(fakeDiscovery);
    proxyBridge = sinon.stub().returns(fakeBridge);

    $imports.$mock({
      '../annotation-sync': proxyAnnotationSync,
      '../../shared/bridge': proxyBridge,
      '../../shared/discovery': proxyDiscovery,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('CrossFrame constructor', () => {
    it('instantiates the Discovery component', () => {
      createCrossFrame();
      assert.calledWith(proxyDiscovery, window);
    });

    it('passes the options along to the bridge', () => {
      createCrossFrame({ server: true });
      assert.calledWith(proxyDiscovery, window, { server: true });
    });

    it('instantiates the CrossFrame component', () => {
      createCrossFrame();
      assert.calledWith(proxyDiscovery);
    });

    it('instantiates the AnnotationSync component', () => {
      createCrossFrame();
      assert.called(proxyAnnotationSync);
    });

    it('passes along options to AnnotationSync', () => {
      createCrossFrame();
      assert.calledWith(proxyAnnotationSync, fakeBridge, {
        on: sinon.match.func,
        emit: sinon.match.func,
      });
    });

    it('starts the discovery of new channels', () => {
      createCrossFrame();
      assert.called(fakeDiscovery.startDiscovery);
    });

    it('creates a channel when a new frame is discovered', () => {
      createCrossFrame();
      fakeDiscovery.startDiscovery.yield('SOURCE', 'ORIGIN', 'TOKEN');
      assert.called(fakeBridge.createChannel);
      assert.calledWith(fakeBridge.createChannel, 'SOURCE', 'ORIGIN', 'TOKEN');
    });
  });

  describe('#destroy', () => {
    it('stops the discovery of new frames', () => {
      const cf = createCrossFrame();
      cf.destroy();
      assert.called(fakeDiscovery.stopDiscovery);
    });

    it('destroys the bridge object', () => {
      const cf = createCrossFrame();
      cf.destroy();
      assert.called(fakeBridge.destroy);
    });
  });

  describe('#sync', () => {
    it('syncs the annotations with the other frame', () => {
      const bridge = createCrossFrame();
      bridge.sync();
      assert.called(fakeAnnotationSync.sync);
    });
  });

  describe('#on', () => {
    it('proxies the call to the bridge', () => {
      const bridge = createCrossFrame();
      bridge.on('event', 'arg');
      assert.calledWith(fakeBridge.on, 'event', 'arg');
    });
  });

  describe('#call', () => {
    it('proxies the call to the bridge', () => {
      const bridge = createCrossFrame();
      bridge.call('method', 'arg1', 'arg2');
      assert.calledWith(fakeBridge.call, 'method', 'arg1', 'arg2');
    });
  });

  describe('#onConnect', () => {
    it('proxies the call to the bridge', () => {
      const bridge = createCrossFrame();
      const fn = () => {};
      bridge.onConnect(fn);
      assert.calledWith(fakeBridge.onConnect, fn);
    });
  });
});
