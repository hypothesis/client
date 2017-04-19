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

    for own name, opts of @options
      if not @plugins[name] and Annotator.Plugin[name]
        @addPlugin(name, opts)

    @guest = @addGuest(element, options)
    @crossframe = @guest.getCrossframe()
    @plugins.CrossFrame = @crossframe

    app.appendTo(@frame)

    this.on 'panelReady', =>
      # Initialize tool state.
      if options.showHighlights == undefined
        # Highlights are on by default.
        options.showHighlights = true
      this.setVisibleHighlights(options.showHighlights)

      # Show the UI
      @frame.css('display', '')

    this.on 'beforeAnnotationCreated', (annotation) ->
      # When a new non-highlight annotation is created, focus
      # the sidebar so that the text editor can be focused as
      # soon as the annotation card appears
      if !annotation.$highlight
        app[0].contentWindow.focus()

  addGuest: (guestElement, guestOptions) ->
    options = guestOptions
    guest = new Guest(guestElement, options)
    guest.setPlugins( @plugins )
    guest.listenTo('anchorsSynced', @updateAnchors.bind(this))
    guest.listenTo('highlightsRemoved', @updateAnchors.bind(this))

    return guest

  createAnnotation: ->
    @guest.createAnnotation()

  destroy: ->
    @frame.remove()

    for name, plugin of @plugins
      @plugins[name].destroy()

  getAnchors: ->
    anchors = @guest.getAnchors()

    return anchors

  selectAnnotations: (annotations) ->
    @guest.selectAnnotations(annotations)

  setVisibleHighlights: (state) ->
    @visibleHighlights = state

    @guest.setVisibleHighlights(state)

  updateAnchors: ->
    @anchors = @getAnchors()

    return @anchors

