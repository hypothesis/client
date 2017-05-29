Plugin = require('../plugin')

AnnotationSync = require('../annotation-sync')
Bridge = require('../../shared/bridge')
Discovery = require('../../shared/discovery')
FrameUtil = require('../util/frame-util')
FrameObserver = require('../frame-observer')

# Extracts individual keys from an object and returns a new one.
extract = extract = (obj, keys...) ->
  ret = {}
  ret[key] = obj[key] for key in keys when obj.hasOwnProperty(key)
  ret

# Class for establishing a messaging connection to the parent sidebar as well
# as keeping the annotation state in sync with the sidebar application, this
# frame acts as the bridge client, the sidebar is the server. This plugin
# can also be used to send messages through to the sidebar using the
# call method. This plugin also enables the discovery and management of
# not yet known frames in a multiple frame scenario.
module.exports = class CrossFrame extends Plugin
  constructor: (elem, options) ->
    super

    opts = extract(options, 'server')
    discovery = new Discovery(window, opts)

    bridge = new Bridge()

    opts = extract(options, 'on', 'emit')
    annotationSync = new AnnotationSync(bridge, opts)
    frameObserver = new FrameObserver(elem)

    this.pluginInit = ->
      onDiscoveryCallback = (source, origin, token) ->
        bridge.createChannel(source, origin, token)
      discovery.startDiscovery(onDiscoveryCallback)

      if options.enableMultiFrameSupport
        frameObserver.observe(_injectToFrame, _iframeUnloaded);

    this.destroy = ->
      # super doesnt work here :(
      Plugin::destroy.apply(this, arguments)
      bridge.destroy()
      discovery.stopDiscovery()
      frameObserver.disconnect()

    this.sync = (annotations, cb) ->
      annotationSync.sync(annotations, cb)

    this.on = (event, fn) ->
      bridge.on(event, fn)

    this.call = (message, args...) ->
      bridge.call(message, args...)

    this.onConnect = (fn) ->
      bridge.onConnect(fn)

    _injectToFrame = (frame) ->
      if !FrameUtil.hasHypothesis(frame)
        FrameUtil.isLoaded frame, () ->
          FrameUtil.injectHypothesis(frame, options.embedScriptUrl)

    _iframeUnloaded = (frame) ->
      bridge.call('destroyFrame', frame.src);
