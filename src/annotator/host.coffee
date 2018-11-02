$ = require('jquery')

Guest = require('./guest')

module.exports = class Host extends Guest
  constructor: (element, config) ->

    # Some config settings are not JSON-stringifiable (e.g. JavaScript
    # functions) and will be omitted when the config is JSON-stringified.
    # Add a JSON-stringifiable option for each of these so that the sidebar can
    # at least know whether the callback functions were provided or not.
    if config.services?[0]
      service = config.services[0]
      if service.onLoginRequest
        service.onLoginRequestProvided = true
      if service.onLogoutRequest
        service.onLogoutRequestProvided = true
      if service.onSignupRequest
        service.onSignupRequestProvided = true
      if service.onProfileRequest
        service.onProfileRequestProvided = true
      if service.onHelpRequest
        service.onHelpRequestProvided = true

    # Make a copy of all config settings except `config.sidebarAppUrl`, the app base URL,
    # and `config.pluginClasses`
    configParam = 'config=' + encodeURIComponent(
      JSON.stringify(Object.assign({}, config, {sidebarAppUrl: undefined, pluginClasses: undefined }))
    )
    if config.sidebarAppUrl and '?' in config.sidebarAppUrl
      sidebarAppSrc = config.sidebarAppUrl + '&' + configParam
    else
      sidebarAppSrc = config.sidebarAppUrl + '?' + configParam

    # Create the iframe
    app = $('<iframe></iframe>')
    .attr('name', 'hyp_sidebar_frame')
    # enable media in annotations to be shown fullscreen
    .attr('allowfullscreen', '')
    .attr('seamless', '')
    .attr('src', sidebarAppSrc)
    .attr('title', 'Hypothesis annotation viewer')
    .addClass('h-sidebar-iframe')

    externalContainer = null

    if config.externalContainerSelector
      # Use the native method to also validate the input
      externalContainer = document.querySelector(config.externalContainerSelector)

    if externalContainer
      @externalFrame = $(externalContainer)
    else
      @frame = $('<div></div>')
      .css('display', 'none')
      .addClass('annotator-frame annotator-outer')

      if config.theme == 'clean'
        @frame.addClass('annotator-frame--drop-shadow-enabled')

      @frame.appendTo(element)

    super

    app.appendTo(@frame || @externalFrame)

    this.on 'panelReady', =>
      # Show the UI
      @frame?.css('display', '')

    this.on 'beforeAnnotationCreated', (annotation) ->
      # When a new non-highlight annotation is created, focus
      # the sidebar so that the text editor can be focused as
      # soon as the annotation card appears
      if !annotation.$highlight
        app[0].contentWindow.focus()

  destroy: ->
    @frame?.remove()
    super
