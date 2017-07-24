$ = require('jquery')

# Public: Wraps the DOM Nodes within the provided range with a highlight
# element of the specified class and returns the highlight Elements.
#
# normedRange - A NormalizedRange to be highlighted.
#
# Returns an array of highlight Elements.
exports.highlightRange = (normedRange) ->
  white = /^\s*$/
  cssClass = 'annotator-hl'

  # A custom element name is used here rather than `<span>` to reduce the
  # likelihood of highlights being hidden by page styling.
  hl = $("<hypothesis-highlight class='#{cssClass}'></hypothesis-highlight>")

  # Ignore text nodes that contain only whitespace characters. This prevents
  # spans being injected between elements that can only contain a restricted
  # subset of nodes such as table rows and lists. This does mean that there
  # may be the odd abandoned whitespace node in a paragraph that is skipped
  # but better than breaking table layouts.
  nodes = $(normedRange.textNodes()).filter((i) -> not white.test @nodeValue)

  return nodes.wrap(hl).parent().toArray()


# Given the events we care about, attach proper listeners and
# invoke the provided event handler callback.
#
# @param Object eventHandlers is a key-value object where the key represents
#  the event we are binding to (like 'click' or 'mouseover') and the value is
#  the callback function to be invoked when the respective event occurs
# @param Element scopeTo defines where our event delegation should be scoped to
exports.registerEventHandlers = (eventHandlers, scopeTo) ->
  $elementScope = $ scopeTo
  Object.keys(eventHandlers).forEach (eventName) ->
    $elementScope.delegate('.annotator-hl', eventName, eventHandlers[eventName])
