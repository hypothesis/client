import { CrossFrame, $imports } from '../cross-frame';

describe('CrossFrame', () => {
  let fakeAnnotationSync;
  let fakeBridge;
  let fakeEventBus;

  let FakeAnnotationSync;
  let FakeBridge;

  const createCrossFrame = (options = {}) => {
    fakeEventBus = {};
    const element = document.createElement('div');
    return new CrossFrame(element, fakeEventBus, options);
  };

  beforeEach(() => {
    fakeBridge = {
      destroy: sinon.stub(),
      createChannel: sinon.stub(),
      onConnect: sinon.stub(),
      call: sinon.stub(),
      on: sinon.stub(),
    };

    fakeAnnotationSync = { sync: sinon.stub(), destroy: sinon.stub() };

    FakeAnnotationSync = sinon.stub().returns(fakeAnnotationSync);
    FakeBridge = sinon.stub().returns(fakeBridge);

    $imports.$mock({
      './annotation-sync': { AnnotationSync: FakeAnnotationSync },
      '../shared/bridge': { Bridge: FakeBridge },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('CrossFrame constructor', () => {
    it('instantiates the AnnotationSync component', () => {
      createCrossFrame();
      assert.called(FakeAnnotationSync);
    });

    it('passes along options to AnnotationSync', () => {
      createCrossFrame();
      assert.calledWith(FakeAnnotationSync, fakeEventBus, fakeBridge);
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
        },
        sidebarOrigin,
        [sinon.match.instanceOf(MessagePort)]
      );
    });

    it('creates a channel for communication with the sidebar', () => {
      const cf = createCrossFrame();
      const sidebarFrame = { postMessage: sinon.stub() };

      cf.connectToSidebar(sidebarFrame, 'https://dummy.hypothes.is');

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

    it('destroys the AnnotationSync object', () => {
      const cf = createCrossFrame();
      cf.destroy();
      assert.called(fakeAnnotationSync.destroy);
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
