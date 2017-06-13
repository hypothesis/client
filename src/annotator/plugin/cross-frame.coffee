Plugin = require('../plugin')

AnnotationSync = require('../annotation-sync')
Bridge = require('../../shared/bridge')
Discovery = require('../../shared/discovery')
FrameUtil = require('../util/frame-util')

debounce = require('lodash.debounce')

# Extracts individual keys from an object and returns a new one.
extract = extract = (obj, keys...) ->
  ret = {}
  ret[key] = obj[key] for key in keys when obj.hasOwnProperty(key)
  ret


# Find difference of two arrays
difference = (arrayA, arrayB) ->
  arrayA.filter (x) -> !arrayB.includes(x)

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

    handledFrames = []

    this.pluginInit = ->
      onDiscoveryCallback = (source, origin, token) ->
        bridge.createChannel(source, origin, token)
      discovery.startDiscovery(onDiscoveryCallback)

      if options.enableMultiFrameSupport
        _setupFrameDetection()

    this.destroy = ->
      # super doesnt work here :(
      Plugin::destroy.apply(this, arguments)
      bridge.destroy()
      discovery.stopDiscovery()

    this.sync = (annotations, cb) ->
      annotationSync.sync(annotations, cb)

    this.on = (event, fn) ->
      bridge.on(event, fn)

    this.call = (message, args...) ->
      bridge.call(message, args...)

    this.onConnect = (fn) ->
      bridge.onConnect(fn)

    _setupFrameDetection = ->
      _discoverOwnFrames()

      # Listen for DOM mutations, to know when frames are added / removed
      observer = new MutationObserver(debounce(_discoverOwnFrames, 300, leading: true))
      observer.observe(elem, {childList: true, subtree: true});

    _discoverOwnFrames = ->
      frames = FrameUtil.findFrames(elem)
      for frame in frames
        if frame not in handledFrames
          _handleFrame(frame)
          handledFrames.push(frame)

      for frame, i in difference(handledFrames, frames)
        _iframeUnloaded(frame)
        delete handledFrames[i]

    _injectToFrame = (frame) ->
      if !FrameUtil.hasHypothesis(frame)
        FrameUtil.injectHypothesis(frame, options.embedScriptUrl)
        frame.contentWindow.addEventListener 'unload', ->
          _iframeUnloaded(frame)

    _handleFrame = (frame) ->
      if !FrameUtil.isAccessible(frame) then return
      FrameUtil.isLoaded frame, () ->
        _injectToFrame(frame)

    _iframeUnloaded = (frame) ->
      # TODO: Bridge call here not yet implemented, placeholder for now
      bridge.call('destroyFrame', frame.src);
