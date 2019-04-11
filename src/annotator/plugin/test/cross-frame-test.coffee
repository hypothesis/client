Plugin = require('../../plugin')
CrossFrame = require('../cross-frame')

describe 'CrossFrame', ->
  fakeDiscovery = null
  fakeBridge = null
  fakeAnnotationSync = null

  proxyDiscovery = null
  proxyBridge = null
  proxyAnnotationSync = null

  sandbox = sinon.sandbox.create()

  createCrossFrame = (options) ->
    defaults =
      config: {}
      on: sandbox.stub()
      emit: sandbox.stub()
    element = document.createElement('div')
    return new CrossFrame(element, $.extend({}, defaults, options))

  beforeEach ->
    fakeDiscovery =
      startDiscovery: sandbox.stub()
      stopDiscovery: sandbox.stub()

    fakeBridge =
      destroy: sandbox.stub()
      createChannel: sandbox.stub()
      onConnect: sandbox.stub()
      call: sandbox.stub()
      on: sandbox.stub()

    fakeAnnotationSync =
      sync: sandbox.stub()

    proxyAnnotationSync = sandbox.stub().returns(fakeAnnotationSync)
    proxyDiscovery = sandbox.stub().returns(fakeDiscovery)
    proxyBridge = sandbox.stub().returns(fakeBridge)

    CrossFrame.$imports.$mock({
      '../plugin': Plugin,
      '../annotation-sync': proxyAnnotationSync,
      '../../shared/bridge': proxyBridge,
      '../../shared/discovery': proxyDiscovery
    })

  afterEach ->
    sandbox.restore()
    CrossFrame.$imports.$restore()

  describe 'CrossFrame constructor', ->
    it 'instantiates the Discovery component', ->
      createCrossFrame()
      assert.calledWith(proxyDiscovery, window)

    it 'passes the options along to the bridge', ->
      createCrossFrame(server: true)
      assert.calledWith(proxyDiscovery, window, server: true)

    it 'instantiates the CrossFrame component', ->
      createCrossFrame()
      assert.calledWith(proxyDiscovery)

    it 'instantiates the AnnotationSync component', ->
      createCrossFrame()
      assert.called(proxyAnnotationSync)

    it 'passes along options to AnnotationSync', ->
      createCrossFrame()
      assert.calledWith(proxyAnnotationSync, fakeBridge, {
        on: sinon.match.func
        emit: sinon.match.func
      })

  describe '.pluginInit', ->
    it 'starts the discovery of new channels', ->
      bridge = createCrossFrame()
      bridge.pluginInit()
      assert.called(fakeDiscovery.startDiscovery)

    it 'creates a channel when a new frame is discovered', ->
      bridge = createCrossFrame()
      bridge.pluginInit()
      fakeDiscovery.startDiscovery.yield('SOURCE', 'ORIGIN', 'TOKEN')
      assert.called(fakeBridge.createChannel)
      assert.calledWith(fakeBridge.createChannel, 'SOURCE', 'ORIGIN', 'TOKEN')

  describe '.destroy', ->
    it 'stops the discovery of new frames', ->
      cf = createCrossFrame()
      cf.destroy()
      assert.called(fakeDiscovery.stopDiscovery)

    it 'destroys the bridge object', ->
      cf = createCrossFrame()
      cf.destroy()
      assert.called(fakeBridge.destroy)

  describe '.sync', ->
    it 'syncs the annotations with the other frame', ->
      bridge = createCrossFrame()
      bridge.sync()
      assert.called(fakeAnnotationSync.sync)

  describe '.on', ->
    it 'proxies the call to the bridge', ->
      bridge = createCrossFrame()
      bridge.on('event', 'arg')
      assert.calledWith(fakeBridge.on, 'event', 'arg')

  describe '.call', ->
    it 'proxies the call to the bridge', ->
      bridge = createCrossFrame()
      bridge.call('method', 'arg1', 'arg2')
      assert.calledWith(fakeBridge.call, 'method', 'arg1', 'arg2')

  describe '.onConnect', ->
    it 'proxies the call to the bridge', ->
      bridge = createCrossFrame()
      fn = ->
      bridge.onConnect(fn)
      assert.calledWith(fakeBridge.onConnect, fn)
