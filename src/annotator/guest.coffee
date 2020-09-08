scrollIntoView = require('scroll-into-view')
CustomEvent = require('custom-event')

Delegator = require('./delegator')
$ = require('jquery')

adder = require('./adder')
htmlAnchoring = require('./anchoring/html')
highlighter = require('./highlighter')
rangeUtil = require('./range-util')
{ default: selections } = require('./selections')
xpathRange = require('./anchoring/range')
{ closest } = require('../shared/dom-element')
{ normalizeURI } = require('./util/url')

animationPromise = (fn) ->
  return new Promise (resolve, reject) ->
    requestAnimationFrame ->
      try
        resolve(fn())
      catch error
        reject(error)

annotationsForSelection = () ->
  selection = window.getSelection()
  range = selection.getRangeAt(0)
  return rangeUtil.itemsForRange(range, (node) -> $(node).data('annotation'))

# Return the annotations associated with any highlights that contain a given
# DOM node.
annotationsAt = (node) ->
  if node.nodeType != Node.ELEMENT_NODE
    node = node.parentElement

  highlights = []

  while node
    if node.classList.contains('hypothesis-highlight')
      highlights.push(node)
    node = node.parentElement

  return highlights.map((h) => $(h).data('annotation'))

# A selector which matches elements added to the DOM by Hypothesis (eg. for
# highlights and annotation UI).
#
# We can simplify this once all classes are converted from an "annotator-"
# prefix to a "hypothesis-" prefix.
IGNORE_SELECTOR = '[class^="annotator-"],[class^="hypothesis-"]'

module.exports = class Guest extends Delegator
  SHOW_HIGHLIGHTS_CLASS = 'hypothesis-highlights-always-on'

  options:
    Document: {}
    TextSelection: {}

  # Anchoring module
  anchoring: null

  # Internal state
  plugins: null
  anchors: null
  visibleHighlights: false
  frameIdentifier: null

  html:
    adder: '<hypothesis-adder></hypothesis-adder>'

  constructor: (element, config, anchoring = htmlAnchoring) ->
    super

    this.adder = $(this.html.adder).appendTo(@element).hide()

    self = this
    this.adderCtrl = new adder.Adder(@adder[0], {
      onAnnotate: ->
        self.createAnnotation()
        document.getSelection().removeAllRanges()
      onHighlight: ->
        self.setVisibleHighlights(true)
        self.createHighlight()
        document.getSelection().removeAllRanges()
      onShowAnnotations: (anns) ->
        self.selectAnnotations(anns)
    })
    this.selections = selections(document).subscribe
      next: (range) ->
        if range
          self._onSelection(range)
        else
          self._onClearSelection()

    this.plugins = {}
    this.anchors = []

    # Set the frame identifier if it's available.
    # The "top" guest instance will have this as null since it's in a top frame not a sub frame
    this.frameIdentifier = config.subFrameIdentifier || null

    this.anchoring = anchoring

    cfOptions =
      config: config
      on: (event, handler) =>
        this.subscribe(event, handler)
      emit: (event, args...) =>
        this.publish(event, args)

    this.addPlugin('CrossFrame', cfOptions)
    @crossframe = this.plugins.CrossFrame

    @crossframe.onConnect(=> this._setupInitialState(config))

    # Whether clicks on non-highlighted text should close the sidebar
    this.closeSidebarOnDocumentClick = true
    this._connectAnnotationSync(@crossframe)
    this._connectAnnotationUISync(@crossframe)

    # Load plugins
    for own name, opts of @options
      if not @plugins[name] and @options.pluginClasses[name]
        this.addPlugin(name, opts)

    # Setup event handlers on the root element
    this._elementEventListeners = []
    this._setupElementEvents()


  # Add DOM event listeners for clicks, taps etc. on the document and
  # highlights.
  _setupElementEvents: ->
    addListener = (event, callback) =>
      @element[0].addEventListener(event, callback)
      this._elementEventListeners.push({ event, callback })

    # Hide the sidebar in response to a document click or tap, so it doesn't obscure
    # the document content.
    maybeHideSidebar = (event) =>
      if !this.closeSidebarOnDocumentClick || this.isEventInAnnotator(event) || @selectedTargets?.length
        # Don't hide the sidebar if event occurred inside Hypothesis UI, or
        # the user is making a selection, or the behavior was disabled because
        # the sidebar doesn't overlap the content.
        return
      @crossframe?.call('hideSidebar')

    addListener 'click', (event) =>
      annotations = annotationsAt(event.target)
      if annotations.length and @visibleHighlights
        toggle = event.metaKey or event.ctrlKey
        this.selectAnnotations(annotations, toggle)
      else maybeHideSidebar(event)

    # Allow taps on the document to hide the sidebar as well as clicks, because
    # on touch-input devices, not all elements will generate a "click" event.
    addListener 'touchstart', (event) =>
      if !annotationsAt(event.target).length
        maybeHideSidebar(event)

    addListener 'mouseover', (event) =>
      annotations = annotationsAt(event.target)
      if annotations.length and @visibleHighlights
        this.focusAnnotations(annotations)

    addListener 'mouseout', (event) =>
      if @visibleHighlights
        this.focusAnnotations []

  _removeElementEvents: ->
    this._elementEventListeners.forEach ({ event, callback }) =>
      @element[0].removeEventListener(event, callback)

  addPlugin: (name, options) ->
    if @plugins[name]
      console.error("You cannot have more than one instance of any plugin.")
    else
      klass = @options.pluginClasses[name]
      if typeof klass is 'function'
        @plugins[name] = new klass(@element[0], options)
        @plugins[name].annotator = this
        @plugins[name].pluginInit?()
      else
        console.error("Could not load " + name + " plugin. Have you included the appropriate <script> tag?")
    this # allow chaining

  # Get the document info
  getDocumentInfo: ->
    if @plugins.PDF?
      metadataPromise = Promise.resolve(@plugins.PDF.getMetadata())
      uriPromise = Promise.resolve(@plugins.PDF.uri())
    else if @plugins.Document?
      uriPromise = Promise.resolve(@plugins.Document.uri())
      metadataPromise = Promise.resolve(@plugins.Document.metadata)
    else
      uriPromise = Promise.reject()
      metadataPromise = Promise.reject()

    uriPromise = uriPromise.catch(-> decodeURIComponent(window.location.href))
    metadataPromise = metadataPromise.catch(-> {
      title: document.title
      link: [{href: decodeURIComponent(window.location.href)}]
    })

    return Promise.all([metadataPromise, uriPromise]).then ([metadata, href]) =>
      return {
        uri: normalizeURI(href),
        metadata,
        frameIdentifier: this.frameIdentifier
      }

  _setupInitialState: (config) ->
    this.publish('panelReady')
    this.setVisibleHighlights(config.showHighlights == 'always')

  _connectAnnotationSync: (crossframe) ->
    this.subscribe 'annotationDeleted', (annotation) =>
      this.detach(annotation)

    this.subscribe 'annotationsLoaded', (annotations) =>
      for annotation in annotations
        this.anchor(annotation)

  _connectAnnotationUISync: (crossframe) ->
    crossframe.on 'focusAnnotations', (tags=[]) =>
      for anchor in @anchors when anchor.highlights?
        toggle = anchor.annotation.$tag in tags
        $(anchor.highlights).toggleClass('hypothesis-highlight-focused', toggle)

    crossframe.on 'scrollToAnnotation', (tag) =>
      for anchor in @anchors when anchor.highlights?
        if anchor.annotation.$tag is tag
          event = new CustomEvent('scrolltorange', {
            bubbles: true
            cancelable: true
            detail: anchor.range
          })
          defaultNotPrevented = @element[0].dispatchEvent(event)
          if defaultNotPrevented
            scrollIntoView(anchor.highlights[0])

    crossframe.on 'getDocumentInfo', (cb) =>
      this.getDocumentInfo()
      .then((info) -> cb(null, info))
      .catch((reason) -> cb(reason))

    crossframe.on 'setVisibleHighlights', (state) =>
      this.setVisibleHighlights(state)

  destroy: ->
    this._removeElementEvents()
    this.selections.unsubscribe()
    @adder.remove()

    @element.find('.hypothesis-highlight').each ->
      $(this).contents().insertBefore(this)
      $(this).remove()

    @element.data('annotator', null)

    for name, plugin of @plugins
      @plugins[name].destroy()

    super

  anchor: (annotation) ->
    self = this
    root = @element[0]

    # Anchors for all annotations are in the `anchors` instance property. These
    # are anchors for this annotation only. After all the targets have been
    # processed these will be appended to the list of anchors known to the
    # instance. Anchors hold an annotation, a target of that annotation, a
    # document range for that target and an Array of highlights.
    anchors = []

    # The targets that are already anchored. This function consults this to
    # determine which targets can be left alone.
    anchoredTargets = []

    # These are the highlights for existing anchors of this annotation with
    # targets that have since been removed from the annotation. These will
    # be removed by this function.
    deadHighlights = []

    # Initialize the target array.
    annotation.target ?= []

    locate = (target) ->
      # Check that the anchor has a TextQuoteSelector -- without a
      # TextQuoteSelector we have no basis on which to verify that we have
      # reanchored correctly and so we shouldn't even try.
      #
      # Returning an anchor without a range will result in this annotation being
      # treated as an orphan (assuming no other targets anchor).
      if not (target.selector ? []).some((s) => s.type == 'TextQuoteSelector')
        return Promise.resolve({annotation, target})

      # Find a target using the anchoring module.
      options = {
        cache: self.anchoringCache
        ignoreSelector: IGNORE_SELECTOR
      }
      return self.anchoring.anchor(root, target.selector, options)
      .then((range) -> {annotation, target, range})
      .catch(-> {annotation, target})

    highlight = (anchor) ->
      # Highlight the range for an anchor.
      return anchor unless anchor.range?
      return animationPromise ->
        range = xpathRange.sniff(anchor.range)
        normedRange = range.normalize(root)
        highlights = highlighter.highlightRange(normedRange)

        $(highlights).data('annotation', anchor.annotation)
        anchor.highlights = highlights
        return anchor

    sync = (anchors) ->
      # Store the results of anchoring.

      # An annotation is considered to be an orphan if it has at least one
      # target with selectors, and all targets with selectors failed to anchor
      # (i.e. we didn't find it in the page and thus it has no range).
      hasAnchorableTargets = false
      hasAnchoredTargets = false
      for anchor in anchors
        if anchor.target.selector?
          hasAnchorableTargets = true
          if anchor.range?
            hasAnchoredTargets = true
            break
      annotation.$orphan = hasAnchorableTargets and not hasAnchoredTargets

      # Add the anchors for this annotation to instance storage.
      self.anchors = self.anchors.concat(anchors)

      # Let plugins know about the new information.
      self.plugins.BucketBar?.update()
      self.plugins.CrossFrame?.sync([annotation])

      return anchors

    # Remove all the anchors for this annotation from the instance storage.
    for anchor in self.anchors.splice(0, self.anchors.length)
      if anchor.annotation is annotation
        # Anchors are valid as long as they still have a range and their target
        # is still in the list of targets for this annotation.
        if anchor.range? and anchor.target in annotation.target
          anchors.push(anchor)
          anchoredTargets.push(anchor.target)
        else if anchor.highlights?
          # These highlights are no longer valid and should be removed.
          deadHighlights = deadHighlights.concat(anchor.highlights)
          delete anchor.highlights
          delete anchor.range
      else
        # These can be ignored, so push them back onto the new list.
        self.anchors.push(anchor)

    # Remove all the highlights that have no corresponding target anymore.
    requestAnimationFrame -> highlighter.removeHighlights(deadHighlights)

    # Anchor any targets of this annotation that are not anchored already.
    for target in annotation.target when target not in anchoredTargets
      anchor = locate(target).then(highlight)
      anchors.push(anchor)

    return Promise.all(anchors).then(sync)

  detach: (annotation) ->
    anchors = []
    targets = []
    unhighlight = []

    for anchor in @anchors
      if anchor.annotation is annotation
        unhighlight.push(anchor.highlights ? [])
      else
        anchors.push(anchor)

    this.anchors = anchors

    unhighlight = Array::concat(unhighlight...)
    requestAnimationFrame =>
      highlighter.removeHighlights(unhighlight)
      this.plugins.BucketBar?.update()

  createAnnotation: (annotation = {}) ->
    self = this
    root = @element[0]

    ranges = @selectedRanges ? []
    @selectedRanges = null

    getSelectors = (range) ->
      options = {
        cache: self.anchoringCache
        ignoreSelector: IGNORE_SELECTOR
      }
      # Returns an array of selectors for the passed range.
      return self.anchoring.describe(root, range, options)

    setDocumentInfo = (info) ->
      annotation.document = info.metadata
      annotation.uri = info.uri

    setTargets = ([info, selectors]) ->
      # `selectors` is an array of arrays: each item is an array of selectors
      # identifying a distinct target.
      source = info.uri
      annotation.target = ({source, selector} for selector in selectors)

    info = this.getDocumentInfo()
    selectors = Promise.all(ranges.map(getSelectors))

    metadata = info.then(setDocumentInfo)
    targets = Promise.all([info, selectors]).then(setTargets)

    targets.then(-> self.publish('beforeAnnotationCreated', [annotation]))
    targets.then(-> self.anchor(annotation))

    @crossframe?.call('showSidebar') unless annotation.$highlight
    annotation

  createHighlight: ->
    return this.createAnnotation({$highlight: true})

  # Create a blank comment (AKA "page note")
  createComment: () ->
    annotation = {}
    self = this

    prepare = (info) ->
      annotation.document = info.metadata
      annotation.uri = info.uri
      annotation.target = [{source: info.uri}]

    this.getDocumentInfo()
      .then(prepare)
      .then(-> self.publish('beforeAnnotationCreated', [annotation]))

    annotation

  # Public: Deletes the annotation by removing the highlight from the DOM.
  # Publishes the 'annotationDeleted' event on completion.
  #
  # annotation - An annotation Object to delete.
  #
  # Returns deleted annotation.
  deleteAnnotation: (annotation) ->
    if annotation.highlights?
      for h in annotation.highlights when h.parentNode?
        $(h).replaceWith(h.childNodes)

    this.publish('annotationDeleted', [annotation])
    annotation

  showAnnotations: (annotations) ->
    tags = (a.$tag for a in annotations)
    @crossframe?.call('showAnnotations', tags)
    @crossframe?.call('showSidebar')

  toggleAnnotationSelection: (annotations) ->
    tags = (a.$tag for a in annotations)
    @crossframe?.call('toggleAnnotationSelection', tags)

  updateAnnotations: (annotations) ->
    tags = (a.$tag for a in annotations)
    @crossframe?.call('updateAnnotations', tags)

  focusAnnotations: (annotations) ->
    tags = (a.$tag for a in annotations)
    @crossframe?.call('focusAnnotations', tags)

  _onSelection: (range) ->
    selection = document.getSelection()
    isBackwards = rangeUtil.isSelectionBackwards(selection)
    focusRect = rangeUtil.selectionFocusRect(selection)
    if !focusRect
      # The selected range does not contain any text
      this._onClearSelection()
      return

    @selectedRanges = [range]
    @toolbar?.newAnnotationType = 'annotation'

    {left, top, arrowDirection} = this.adderCtrl.target(focusRect, isBackwards)
    this.adderCtrl.annotationsForSelection = annotationsForSelection()
    this.adderCtrl.showAt(left, top, arrowDirection)

  _onClearSelection: () ->
    this.adderCtrl.hide()
    @selectedRanges = []
    @toolbar?.newAnnotationType = 'note'

  selectAnnotations: (annotations, toggle) ->
    if toggle
      this.toggleAnnotationSelection annotations
    else
      this.showAnnotations annotations

  # Did an event originate from an element in the annotator UI? (eg. the sidebar
  # frame, or its toolbar)
  isEventInAnnotator: (event) ->
    return closest(event.target, '.annotator-frame') != null

  # Pass true to show the highlights in the frame or false to disable.
  setVisibleHighlights: (shouldShowHighlights) ->
    this.toggleHighlightClass(shouldShowHighlights)

  toggleHighlightClass: (shouldShowHighlights) ->
    if shouldShowHighlights
      @element.addClass(SHOW_HIGHLIGHTS_CLASS)
    else
      @element.removeClass(SHOW_HIGHLIGHTS_CLASS)

    @visibleHighlights = shouldShowHighlights
    @toolbar?.highlightsVisible = shouldShowHighlights
