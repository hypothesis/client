Plugin = require('../plugin')
$ = require('jquery')


makeButton = (item) ->
  anchor = $('<button></button>')
  .attr('href', '')
  .attr('title', item.title)
  .attr('name', item.name)
  .attr('aria-pressed', item.ariaPressed)
  .on(item.on)
  .addClass('annotator-frame-button')
  .addClass(item.class)
  button = $('<li></li>').append(anchor)
  return button[0]

module.exports = class Toolbar extends Plugin
  HIDE_CLASS = 'annotator-hide'

  events:
    'setVisibleHighlights': 'onSetVisibleHighlights'

  html: '<div class="annotator-toolbar"></div>'

  pluginInit: ->
    @annotator.toolbar = @toolbar = $(@html)
    if @options.container?
      $(@options.container).append @toolbar
    else
      $(@element).append @toolbar

    # Get the parsed configuration to determine the initial state of the buttons.
    # nb. This duplicates state that lives elsewhere. To avoid it getting out
    # of sync, it would be better if that initial state were passed in.
    config = @annotator.options
    highlightsAreVisible = config.showHighlights == 'always'
    isSidebarOpen = config.openSidebar

    items = [
      "title": "Close Sidebar"
      "class": "annotator-frame-button--sidebar_close h-icon-close"
      "name": "sidebar-close"
      "on":
        "click": (event) =>
          event.preventDefault()
          event.stopPropagation()
          @annotator.hide()
          @toolbar.find('[name=sidebar-close]').hide();
    ,
      "title": "Toggle or Resize Sidebar"
      "ariaPressed": isSidebarOpen
      "class": "annotator-frame-button--sidebar_toggle h-icon-chevron-left"
      "name": "sidebar-toggle"
      "on":
        "click": (event) =>
          event.preventDefault()
          event.stopPropagation()
          collapsed = @annotator.frame.hasClass('annotator-collapsed')
          if collapsed
            @annotator.show()
            event.target.setAttribute('aria-pressed', true);
          else
            @annotator.hide()
            event.target.setAttribute('aria-pressed', false);
    ,
      "title": "Toggle Highlights Visibility"
      "class": if highlightsAreVisible then 'h-icon-visibility' else 'h-icon-visibility-off'
      "name": "highlight-visibility"
      "ariaPressed": highlightsAreVisible
      "on":
        "click": (event) =>
          event.preventDefault()
          event.stopPropagation()
          state = not @annotator.visibleHighlights
          @annotator.setAllVisibleHighlights state
    ,
      "title": "New Page Note"
      "class": "h-icon-note"
      "name": "insert-comment"
      "on":
        "click": (event) =>
          event.preventDefault()
          event.stopPropagation()
          @annotator.createAnnotation()
          @annotator.show()
    ]
    @buttons = $(makeButton(item) for item in items)

    list = $('<ul></ul>')
    @buttons.appendTo(list)
    @toolbar.append(list)

    # Remove focus from the anchors when clicked, this removes the focus
    # styles intended only for keyboard navigation. IE/FF apply the focus
    # psuedo-class to a clicked element.
    @toolbar.on('mouseup', 'a', (event) -> $(event.target).blur())

  onSetVisibleHighlights: (state) ->
    if state
      @element.find('[name=highlight-visibility]')
      .removeClass('h-icon-visibility-off')
      .addClass('h-icon-visibility')
      .attr('aria-pressed', 'true')
    else
      @element.find('[name=highlight-visibility]')
      .removeClass('h-icon-visibility')
      .addClass('h-icon-visibility-off')
      .attr('aria-pressed', 'false')

  disableMinimizeBtn: () ->
    $('[name=sidebar-toggle]').remove();

  disableHighlightsBtn: () ->
    $('[name=highlight-visibility]').remove();

  disableNewNoteBtn: () ->
    $('[name=insert-comment]').remove();

  disableCloseBtn: () ->
    $('[name=sidebar-close]').remove();

  getWidth: () ->
    return parseInt(window.getComputedStyle(this.toolbar[0]).width)

  hideCloseBtn: () ->
    $('[name=sidebar-close]').hide();

  showCloseBtn: () ->
    $('[name=sidebar-close]').show();

  showCollapseSidebarBtn: () ->
    $('[name=sidebar-toggle]')
    .removeClass('h-icon-chevron-left')
    .addClass('h-icon-chevron-right')

  showExpandSidebarBtn: () ->
    $('[name=sidebar-toggle]')
    .removeClass('h-icon-chevron-right')
    .addClass('h-icon-chevron-left')
