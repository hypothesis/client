Annotator = require('annotator')

# Extracts individual keys from an object and returns a new one.
extract = extract = (obj, keys...) ->
  ret = {}
  ret[key] = obj[key] for key in keys when obj.hasOwnProperty(key)
  ret

# Class for establishing a messaging connection to the parent sidebar as well
# as keeping the annotation state in sync with the sidebar application, this
# frame acts as the bridge client, the sidebar is the server. This plugin
# can also be used to send messages through to the sidebar using the
# call method.
module.exports = class CrossFrame extends Annotator.Plugin
  constructor: (elem, options) ->
    super

    opts = extract(options, 'server')
    discovery = new CrossFrame.Discovery(window, opts)

    bridge = new CrossFrame.Bridge()

    # THESIS TODO: Don't forget to remove this. Debugging only.
    window.bridge = bridge

    opts = extract(options, 'on', 'emit')
    @annotationSync = new CrossFrame.AnnotationSync(bridge, opts)

    this.pluginInit = ->
      onDiscoveryCallback = (source, origin, token) ->
        bridge.createChannel(source, origin, token)
      discovery.startDiscovery(onDiscoveryCallback)

    this.destroy = ->
      # super doesnt work here :(
      Annotator.Plugin::destroy.apply(this, arguments)
      bridge.destroy()
      discovery.stopDiscovery()

    this.registerMethods = (options, guestId) ->
      @annotationSync.registerMethods(options, guestId)

    this.removeMethods = (guestId) ->
      @annotationSync.removeMethods(guestId)

    this.sync = (annotations, cb) ->
      @annotationSync.sync(annotations, cb)

    this.on = (event, fn, guestId) ->
      bridge.on(event, fn, guestId)

    this.call = (message, args...) ->
      bridge.call(message, args...)

    # THESIS TODO: Temporary name for function. Will need a more suitable name.
    this.reloadAnnotations = () ->
      bridge.call("reloadAnnotations");

    this.onConnect = (fn) ->
      bridge.onConnect(fn)

    this.removeGuestListener = (guestId) ->
      bridge.removeGuestListener(guestId)
