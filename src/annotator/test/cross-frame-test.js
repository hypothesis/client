import { CrossFrame, $imports } from '../cross-frame';

describe('CrossFrame', () => {
  let fakeBridge;
  let fakeAnnotationSync;

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
    fakeBridge = {
      destroy: sinon.stub(),
      createChannel: sinon.stub(),
      onConnect: sinon.stub(),
      call: sinon.stub(),
      on: sinon.stub(),
    };

    fakeAnnotationSync = { sync: sinon.stub() };

    proxyAnnotationSync = sinon.stub().returns(fakeAnnotationSync);
    proxyBridge = sinon.stub().returns(fakeBridge);

    $imports.$mock({
      './annotation-sync': proxyAnnotationSync,
      '../shared/bridge': proxyBridge,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('CrossFrame constructor', () => {
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
  });

  describe('#connectToSidebar', () => {
    it('sends a `hypothesisGuestReady` notification to the sidebar', async () => {
      const cf = createCrossFrame();
      const sidebarFrame = { postMessage: sinon.stub() };
      const sidebarOrigin = 'https://dummy.hypothes.is/';

      cf.connectToSidebar(sidebarFrame, sidebarOrigin);

      assert.calledWith(
        sidebarFrame.postMessage,
        {
          type: 'hypothesisGuestReady',
          port: sinon.match.instanceOf(MessagePort),
        },
        sidebarOrigin
      );
    });

    it('creates a channel for communication with the sidebar', () => {
      const cf = createCrossFrame();
      const sidebarFrame = { postMessage: sinon.stub() };

      cf.connectToSidebar(sidebarFrame);

      assert.calledWith(
        fakeBridge.createChannel,
        sinon.match.instanceOf(MessagePort)
      );
    });
  });

  describe('#destroy', () => {
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
