Plugin = require('../plugin')
$ = require('jquery')

makeButton = (item) ->
  anchor = $('<button></button>')
  .attr('href', '')
  .attr('title', item.title)
  .attr('name', item.name)
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
      "class": "annotator-frame-button--sidebar_toggle h-icon-chevron-left"
      "name": "sidebar-toggle"
      "on":
        "click": (event) =>
          event.preventDefault()
          event.stopPropagation()
          collapsed = @annotator.frame.hasClass('annotator-collapsed')
          if collapsed
            @annotator.show()
          else
            @annotator.hide()
    ,
      "title": "Hide Highlights"
      "class": "h-icon-visibility"
      "name": "highlight-visibility"
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
      $('[name=highlight-visibility]')
      .removeClass('h-icon-visibility-off')
      .addClass('h-icon-visibility')
      .prop('title', 'Hide Highlights');
    else
      $('[name=highlight-visibility]')
      .removeClass('h-icon-visibility')
      .addClass('h-icon-visibility-off')
      .prop('title', 'Show Highlights');

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
