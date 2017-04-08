Annotator = require('annotator')
$ = Annotator.$

Guest = require('./guest')

module.exports = class Host extends Annotator
  SHOW_HIGHLIGHTS_CLASS = 'annotator-highlights-always-on'

  constructor: (element, options) ->
    # Make a copy of all options except `options.app`, the app base URL.
    configParam = 'config=' + encodeURIComponent(
      JSON.stringify(Object.assign({}, options, {app:undefined}))
    )
    if options.app and '?' in options.app
      options.app += '&' + configParam
    else
      options.app += '?' + configParam

    # Create the iframe
    app = $('<iframe></iframe>')
    .attr('name', 'hyp_sidebar_frame')
    # enable media in annotations to be shown fullscreen
    .attr('allowfullscreen', '')
    .attr('seamless', '')
    .attr('src', options.app)
    .addClass('h-sidebar-iframe')

    @frame = $('<div></div>')
    .css('display', 'none')
    .addClass('annotator-frame annotator-outer')
    .appendTo(element)

    super

    @guests = {}

    for own name, opts of @options
      if not @plugins[name] and Annotator.Plugin[name]
        @addPlugin(name, opts)

    guest = @addGuest(element, "default", options)
    @crossframe = guest.getCrossframe()
    @adderCtrl = guest.getAdder()
    @plugins.CrossFrame = @crossframe
    guest.setPlugins( @plugins )

    app.appendTo(@frame)

    this.on 'panelReady', =>
      # Initialize tool state.
      if options.showHighlights == undefined
        # Highlights are on by default.
        options.showHighlights = true
      @visibleHighlights = options.showHighlights
      guest.setVisibleHighlights(options.showHighlights)

      # Show the UI
      @frame.css('display', '')

    this.on 'beforeAnnotationCreated', (annotation) ->
      # When a new non-highlight annotation is created, focus
      # the sidebar so that the text editor can be focused as
      # soon as the annotation card appears
      if !annotation.$highlight
        app[0].contentWindow.focus()

  addGuest: (guestElement, guestId, guestOptions) ->
    options = guestOptions
    options.guestId = guestId
    if @crossframe then options.crossframe = @crossframe
    if @adderCtrl then options.adderCtrl = @adderCtrl
    guest = new Guest(guestElement, options)
    guest.setPlugins( @plugins )

    @guests[guestId] = guest
    return guest

  createAnnotation: ->
    foundSelected = false
    # Iterate through the guests, and check if any of them have a selection
    # If so, then create an annotation with said guest
    for guestId, guest of @guests
      if guest.hasSelection()
        guest.createAnnotation()
        foundSelected = true
        return

    # If none of the guests have a selection, then we want to make a page note
    if !foundSelected then @guests["default"].createAnnotation()

  destroy: ->
    @frame.remove()
    @destroyAllGuests()

  destroyAllGuests: ->
    for guestId, guest of @guests
      destroyGuest(guestId)

  destroyGuest: (guestId) ->
    @guests[guestId].destroy()
    delete @guests[guestId]

  setVisibleHighlights: (state) ->
    @visibleHighlights = state

    for guestId, guest of @guests
      guest.setVisibleHighlights(state)