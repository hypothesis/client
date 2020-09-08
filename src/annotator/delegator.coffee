$ = require('jquery')

###
** Adapted from:
** https://github.com/openannotation/annotator/blob/v1.2.x/src/class.coffee
**
** Annotator v1.2.10
** https://github.com/openannotation/annotator
**
** Copyright 2015, the Annotator project contributors.
** Dual licensed under the MIT and GPLv3 licenses.
** https://github.com/openannotation/annotator/blob/master/LICENSE
###

# Public: Delegator is the base class that all of Annotators objects inherit
# from. It provides basic functionality such as instance options, event
# delegation and pub/sub methods.
module.exports = class Delegator
# Public: Options object. Extended on initialisation.
  options: {}

# A jQuery object wrapping the DOM Element provided on initialisation.
  element: null

# Public: Constructor function that sets up the instance. Binds the @events
# hash and extends the @options object.
#
# element - The DOM element that this instance represents.
# config - An Object literal of config settings.
#
# Examples
#
#   element  = document.getElementById('my-element')
#   instance = new Delegator(element, {
#     option: 'my-option'
#   })
#
# Returns a new instance of Delegator.
  constructor: (element, config) ->
    @options = $.extend(true, {}, @options, config)
    @element = $(element)

    this.on = this.subscribe

# Public: Destroy the instance, unbinding all events.
#
# Returns nothing.
  destroy: ->
    # FIXME - This should unbind any event handlers registered via `subscribe`.

# Public: Fires an event and calls all subscribed callbacks with any parameters
# provided. This is essentially an alias of @element.triggerHandler() but
# should be used to fire custom events.
#
# NOTE: Events fired using .publish() will not bubble up the DOM.
#
# event  - A String event name.
# params - An Array of parameters to provide to callbacks.
#
# Examples
#
#   instance.subscribe('annotation:save', (msg) -> console.log(msg))
#   instance.publish('annotation:save', ['Hello World'])
#   # => Outputs "Hello World"
#
# Returns itself.
  publish: () ->
    @element.triggerHandler.apply @element, arguments
    this

# Public: Listens for custom event which when published will call the provided
# callback. This is essentially a wrapper around @element.bind() but removes
# the event parameter that jQuery event callbacks always recieve. These
# parameters are unnessecary for custom events.
#
# event    - A String event name.
# callback - A callback function called when the event is published.
#
# Examples
#
#   instance.subscribe('annotation:save', (msg) -> console.log(msg))
#   instance.publish('annotation:save', ['Hello World'])
#   # => Outputs "Hello World"
#
# Returns itself.
  subscribe: (event, callback) ->
    closure = -> callback.apply(this, [].slice.call(arguments, 1))

    # Ensure both functions have the same unique id so that jQuery will accept
    # callback when unbinding closure.
    closure.guid = callback.guid = ($.guid += 1)

    @element.bind event, closure
    this

# Public: Unsubscribes a callback from an event. The callback will no longer
# be called when the event is published.
#
# event    - A String event name.
# callback - A callback function to be removed.
#
# Examples
#
#   callback = (msg) -> console.log(msg)
#   instance.subscribe('annotation:save', callback)
#   instance.publish('annotation:save', ['Hello World'])
#   # => Outputs "Hello World"
#
#   instance.unsubscribe('annotation:save', callback)
#   instance.publish('annotation:save', ['Hello Again'])
#   # => No output.
#
# Returns itself.
  unsubscribe: ->
    @element.unbind.apply @element, arguments
    this
