adder = require('../adder')
Observable = require('../util/observable').Observable
Plugin = require('../plugin')

{ default: Delegator } = require('../delegator')
$ = require('jquery')

{ default: Guest } = require('../guest')
{ $imports } = require('../guest')
rangeUtil = null
selections = null

scrollIntoView = sinon.stub()

class FakeAdder
  instance: null

  constructor: (container, options) ->
    FakeAdder::instance = this

    this.hide = sinon.stub()
    this.showAt = sinon.stub()
    this.target = sinon.stub()
    this.options = options

class FakePlugin extends Plugin
  instance: null

  constructor: ->
    FakePlugin::instance = this
    super

  pluginInit: sinon.stub()

# A little helper which returns a promise that resolves after a timeout
timeoutPromise = (millis = 0) ->
  new Promise((resolve) -> setTimeout(resolve, millis))

describe 'Guest', ->
  sandbox = sinon.createSandbox()
  CrossFrame = null
  fakeCrossFrame = null
  highlighter = null
  guestConfig = null
  htmlAnchoring = null

  createGuest = (config={}) ->
    config = Object.assign({}, guestConfig, config)
    element = document.createElement('div')
    guest = new Guest(element, config)
    return guest

  beforeEach ->
    sinon.stub(console, 'warn')

    FakeAdder::instance = null
    rangeUtil = {
      itemsForRange: sinon.stub().returns([])
      isSelectionBackwards: sinon.stub()
      selectionFocusRect: sinon.stub()
    }
    selections = null
    guestConfig = {pluginClasses: {}}
    highlighter = {
      highlightRange: sinon.stub()
      removeHighlights: sinon.stub()
    }
    htmlAnchoring = {
      anchor: sinon.stub()
    }

    sinon.stub(window, 'requestAnimationFrame').yields()

    $imports.$mock({
      './adder': {Adder: FakeAdder},
      './anchoring/html': htmlAnchoring,
      './highlighter': highlighter,
      './range-util': rangeUtil,
      './selections': (document) ->
        new Observable((obs) ->
          selections = obs
          return () ->
        )
      './delegator': Delegator,
      'scroll-into-view': scrollIntoView,
    })

    fakeCrossFrame = {
      onConnect: sinon.stub()
      on: sinon.stub()
      call: sinon.stub()
      sync: sinon.stub()
      destroy: sinon.stub()
    }

    CrossFrame = sandbox.stub().returns(fakeCrossFrame)
    guestConfig.pluginClasses['CrossFrame'] = CrossFrame

  afterEach ->
    window.requestAnimationFrame.restore()
    sandbox.restore()
    console.warn.restore()
    $imports.$restore()

  describe 'plugins', ->
    fakePlugin = null
    guest = null

    beforeEach ->
      FakePlugin::instance = null
      guestConfig.pluginClasses['FakePlugin'] = FakePlugin
      guest = createGuest(FakePlugin: {})
      fakePlugin = FakePlugin::instance

    it 'load and "pluginInit" gets called', ->
      assert.calledOnce(fakePlugin.pluginInit)

    it 'hold reference to instance', ->
      assert.equal(fakePlugin.annotator, guest)

    it 'destroy when instance is destroyed', ->
      sandbox.spy(fakePlugin, 'destroy')
      guest.destroy()
      assert.called(fakePlugin.destroy)

  describe 'cross frame', ->

    it 'provides an event bus for the annotation sync module', ->
      guest = createGuest()
      options = CrossFrame.lastCall.args[1]
      assert.isFunction(options.on)
      assert.isFunction(options.emit)

    it 'publishes the "panelReady" event when a connection is established', ->
      handler = sandbox.stub()
      guest = createGuest()
      guest.subscribe('panelReady', handler)
      fakeCrossFrame.onConnect.yield()
      assert.called(handler)

    describe 'event subscription', ->
      options = null
      guest = null

      beforeEach ->
        guest = createGuest()
        options = CrossFrame.lastCall.args[1]

      it 'proxies the event into the annotator event system', ->
        fooHandler = sandbox.stub()
        barHandler = sandbox.stub()

        options.on('foo', fooHandler)
        options.on('bar', barHandler)

        guest.publish('foo', ['1', '2'])
        guest.publish('bar', ['1', '2'])

        assert.calledWith(fooHandler, '1', '2')
        assert.calledWith(barHandler, '1', '2')

    describe 'event publication', ->
      options = null
      guest = null

      beforeEach ->
        guest = createGuest()
        options = CrossFrame.lastCall.args[1]

      it 'detaches annotations on "annotationDeleted"', ->
        ann = {id: 1, $tag: 'tag1'}
        sandbox.stub(guest, 'detach')
        options.emit('annotationDeleted', ann)
        assert.calledOnce(guest.detach)
        assert.calledWith(guest.detach, ann)

      it 'anchors annotations on "annotationsLoaded"', ->
        ann1 = {id: 1, $tag: 'tag1'}
        ann2 = {id: 2, $tag: 'tag2'}
        sandbox.stub(guest, 'anchor')
        options.emit('annotationsLoaded', [ann1, ann2])
        assert.calledTwice(guest.anchor)
        assert.calledWith(guest.anchor, ann1)
        assert.calledWith(guest.anchor, ann2)

      it 'proxies all other events into the annotator event system', ->
        fooHandler = sandbox.stub()
        barHandler = sandbox.stub()

        guest.subscribe('foo', fooHandler)
        guest.subscribe('bar', barHandler)

        options.emit('foo', '1', '2')
        options.emit('bar', '1', '2')

        assert.calledWith(fooHandler, '1', '2')
        assert.calledWith(barHandler, '1', '2')

  describe 'annotation UI events', ->
    emitGuestEvent = (event, args...) ->
      fn(args...) for [evt, fn] in fakeCrossFrame.on.args when event == evt

    describe 'on "focusAnnotations" event', ->
      it 'focuses any annotations with a matching tag', ->
        highlight0 = $('<span></span>')
        highlight1 = $('<span></span>')
        guest = createGuest()
        guest.anchors = [
          {annotation: {$tag: 'tag1'}, highlights: highlight0.toArray()}
          {annotation: {$tag: 'tag2'}, highlights: highlight1.toArray()}
        ]
        emitGuestEvent('focusAnnotations', ['tag1'])
        assert.isTrue(highlight0.hasClass('hypothesis-highlight-focused'))

      it 'unfocuses any annotations without a matching tag', ->
        highlight0 = $('<span class="hypothesis-highlight-focused"></span>')
        highlight1 = $('<span class="hypothesis-highlight-focused"></span>')
        guest = createGuest()
        guest.anchors = [
          {annotation: {$tag: 'tag1'}, highlights: highlight0.toArray()}
          {annotation: {$tag: 'tag2'}, highlights: highlight1.toArray()}
        ]
        emitGuestEvent('focusAnnotations', 'ctx', ['tag1'])
        assert.isFalse(highlight1.hasClass('hypothesis-highlight-focused'))

    describe 'on "scrollToAnnotation" event', ->

      beforeEach ->
        scrollIntoView.reset()

      it 'scrolls to the anchor with the matching tag', ->
        highlight = $('<span></span>')
        guest = createGuest()
        guest.anchors = [
          {annotation: {$tag: 'tag1'}, highlights: highlight.toArray()}
        ]
        emitGuestEvent('scrollToAnnotation', 'tag1')
        assert.called(scrollIntoView)
        assert.calledWith(scrollIntoView, highlight[0])

      context 'when dispatching the "scrolltorange" event', ->

        it 'emits with the range', ->
          highlight = $('<span></span>')
          guest = createGuest()
          fakeRange = sinon.stub()
          guest.anchors = [
            {annotation: {$tag: 'tag1'}, highlights: highlight.toArray(), range: fakeRange}
          ]

          return new Promise (resolve) ->
            guest.element.on 'scrolltorange', (event) ->
              assert.equal(event.detail, fakeRange)
              resolve()

            emitGuestEvent('scrollToAnnotation', 'tag1')

        it 'allows the default scroll behaviour to be prevented', ->
          highlight = $('<span></span>')
          guest = createGuest()
          fakeRange = sinon.stub()
          guest.anchors = [
            {annotation: {$tag: 'tag1'}, highlights: highlight.toArray(), range: fakeRange}
          ]

          guest.element.on 'scrolltorange', (event) -> event.preventDefault()
          emitGuestEvent('scrollToAnnotation', 'tag1')
          assert.notCalled(scrollIntoView)


    describe 'on "getDocumentInfo" event', ->
      guest = null

      beforeEach ->
        document.title = 'hi'
        guest = createGuest()
        guest.plugins.PDF =
          uri: sandbox.stub().returns(window.location.href)
          getMetadata: sandbox.stub()

      afterEach ->
        sandbox.restore()

      it 'calls the callback with the href and pdf metadata', (done) ->
        assertComplete = (err, payload) ->
          try
            assert.equal(payload.uri, document.location.href)
            assert.equal(payload.metadata, metadata)
            done()
          catch e
            done(e)

        metadata = {title: 'hi'}
        promise = Promise.resolve(metadata)
        guest.plugins.PDF.getMetadata.returns(promise)

        emitGuestEvent('getDocumentInfo', assertComplete)

      it 'calls the callback with the href and basic metadata if pdf fails', (done) ->
        assertComplete = (err, payload) ->
          try
            assert.equal(payload.uri, window.location.href)
            assert.deepEqual(payload.metadata, metadata)
            done()
          catch e
            done(e)

        metadata = {title: 'hi', link: [{href: window.location.href}]}
        promise = Promise.reject(new Error('Not a PDF document'))
        guest.plugins.PDF.getMetadata.returns(promise)

        emitGuestEvent('getDocumentInfo', assertComplete)

  describe 'document events', ->

    fakeSidebarFrame = null
    guest = null
    rootElement = null

    methods =
      'click': 'onElementClick'
      'touchstart': 'onElementTouchStart'

    beforeEach ->
      fakeSidebarFrame = null
      guest = createGuest()
      rootElement = guest.element[0]

    afterEach ->
      fakeSidebarFrame?.remove()

    it 'hides sidebar when the user taps or clicks in the page', ->
      for event in ['click', 'touchstart']
        rootElement.dispatchEvent(new Event(event))
        assert.calledWith(guest.plugins.CrossFrame.call, 'hideSidebar')

    it 'does not hide sidebar if configured not to close sidebar on document click', ->
      for event in ['click', 'touchstart']
        guest.closeSidebarOnDocumentClick = false
        rootElement.dispatchEvent(new Event(event))
        assert.notCalled(guest.plugins.CrossFrame.call)

    it 'does not hide sidebar if event occurs inside annotator UI', ->
      fakeSidebarFrame = document.createElement('div')
      fakeSidebarFrame.className = 'annotator-frame'
      rootElement.appendChild(fakeSidebarFrame)

      for event in ['click', 'touchstart']
        fakeSidebarFrame.dispatchEvent(new Event(event, { bubbles: true }))
        assert.notCalled(guest.plugins.CrossFrame.call)


  describe 'when the selection changes', ->
    container = null

    beforeEach ->
      container = document.createElement('div')
      container.innerHTML = 'test text'
      document.body.appendChild(container)
      window.getSelection().selectAllChildren(container)

    afterEach ->
      container.remove()

    simulateSelectionWithText = ->
      rangeUtil.selectionFocusRect.returns({left: 0, top: 0, width: 5, height: 5})
      FakeAdder::instance.target.returns({
        left: 0, top: 0, arrowDirection: adder.ARROW_POINTING_UP
      })
      selections.next({})

    simulateSelectionWithoutText = ->
      rangeUtil.selectionFocusRect.returns(null)
      selections.next({})

    it 'shows the adder if the selection contains text', ->
      guest = createGuest()
      simulateSelectionWithText()
      assert.called FakeAdder::instance.showAt

    it 'sets the annotations associated with the selection', ->
      guest = createGuest()
      ann = {}
      $(container).data('annotation', ann)
      rangeUtil.itemsForRange.callsFake((range, callback) ->
        [callback(range.startContainer)]
      )
      simulateSelectionWithText()

      assert.deepEqual FakeAdder::instance.annotationsForSelection, [ann]

    it 'hides the adder if the selection does not contain text', ->
      guest = createGuest()

      simulateSelectionWithoutText()

      assert.called FakeAdder::instance.hide
      assert.notCalled FakeAdder::instance.showAt

    it 'hides the adder if the selection is empty', ->
      guest = createGuest()
      selections.next(null)
      assert.called FakeAdder::instance.hide

    it "sets the toolbar's `newAnnotationType` to 'annotation' if there is a selection", ->
      guest = createGuest()
      guest.toolbar = {}

      simulateSelectionWithText()

      assert.equal guest.toolbar.newAnnotationType, 'annotation'

    it "sets the toolbar's `newAnnotationType` to 'note' if the selection is empty", ->
      guest = createGuest()
      guest.toolbar = {}

      simulateSelectionWithoutText()

      assert.equal guest.toolbar.newAnnotationType, 'note'

  describe 'when adder toolbar buttons are clicked', ->
    # TODO - Add tests for "Annotate" and "Highlight" buttons.

    it 'shows annotations if "Show" is clicked', ->
      createGuest()

      FakeAdder::instance.options.onShowAnnotations([{ $tag: 'ann1' }]);

      assert.calledWith(fakeCrossFrame.call, 'showSidebar')
      assert.calledWith(fakeCrossFrame.call, 'showAnnotations', ['ann1'])

  describe '#getDocumentInfo()', ->
    guest = null

    beforeEach ->
      guest = createGuest()
      guest.plugins.PDF =
        uri: -> 'urn:x-pdf:001122'
        getMetadata: sandbox.stub()

    it 'preserves the components of the URI other than the fragment', ->
      guest.plugins.PDF = null
      guest.plugins.Document =
        uri: -> 'http://foobar.com/things?id=42'
        metadata: {}
      return guest.getDocumentInfo().then ({uri}) ->
        assert.equal uri, 'http://foobar.com/things?id=42'

    it 'removes the fragment identifier from URIs', () ->
      guest.plugins.PDF.uri = -> 'urn:x-pdf:aabbcc#'
      return guest.getDocumentInfo().then ({uri}) ->
        assert.equal uri, 'urn:x-pdf:aabbcc'

  describe '#createAnnotation()', ->
    it 'adds metadata to the annotation object', ->
      guest = createGuest()
      sinon.stub(guest, 'getDocumentInfo').returns(Promise.resolve({
        metadata: {title: 'hello'}
        uri: 'http://example.com/'
      }))
      annotation = {}

      guest.createAnnotation(annotation)

      timeoutPromise()
      .then ->
        assert.equal(annotation.uri, 'http://example.com/')
        assert.deepEqual(annotation.document, {title: 'hello'})

    it 'treats an argument as the annotation object', ->
      guest = createGuest()
      annotation = {foo: 'bar'}
      annotation = guest.createAnnotation(annotation)
      assert.equal(annotation.foo, 'bar')

    it 'triggers a beforeAnnotationCreated event', (done) ->
      guest = createGuest()
      guest.subscribe('beforeAnnotationCreated', -> done())

      guest.createAnnotation()

  describe '#createComment()', ->
    it 'adds metadata to the annotation object', ->
      guest = createGuest()
      sinon.stub(guest, 'getDocumentInfo').returns(Promise.resolve({
        metadata: {title: 'hello'}
        uri: 'http://example.com/'
      }))

      annotation = guest.createComment()

      timeoutPromise()
      .then ->
        assert.equal(annotation.uri, 'http://example.com/')
        assert.deepEqual(annotation.document, {title: 'hello'})

    it 'adds a single target with a source property', ->
      guest = createGuest()
      sinon.stub(guest, 'getDocumentInfo').returns(Promise.resolve({
        metadata: {title: 'hello'}
        uri: 'http://example.com/'
      }))

      annotation = guest.createComment()

      timeoutPromise()
      .then ->
        assert.deepEqual(annotation.target, [{source: 'http://example.com/'}])

    it 'triggers a beforeAnnotationCreated event', (done) ->
      guest = createGuest()
      guest.subscribe('beforeAnnotationCreated', -> done())

      guest.createComment()

  describe '#anchor()', ->
    el = null
    range = null

    beforeEach ->
      el = document.createElement('span')
      txt = document.createTextNode('hello')
      el.appendChild(txt)
      document.body.appendChild(el)
      range = document.createRange()
      range.selectNode(el)

    afterEach ->
      document.body.removeChild(el)

    it "doesn't mark an annotation lacking targets as an orphan", ->
      guest = createGuest()
      annotation = target: []

      guest.anchor(annotation).then ->
        assert.isFalse(annotation.$orphan)

    it "doesn't mark an annotation with a selectorless target as an orphan", ->
      guest = createGuest()
      annotation = {target: [{source: 'wibble'}]}

      guest.anchor(annotation).then ->
        assert.isFalse(annotation.$orphan)

    it "doesn't mark an annotation with only selectorless targets as an orphan", ->
      guest = createGuest()
      annotation = {target: [{source: 'foo'}, {source: 'bar'}]}

      guest.anchor(annotation).then ->
        assert.isFalse(annotation.$orphan)

    it "doesn't mark an annotation in which the target anchors as an orphan", ->
      guest = createGuest()
      annotation = {
        target: [
          {selector: [{type: 'TextQuoteSelector', exact: 'hello'}]},
        ]
      }
      htmlAnchoring.anchor.returns(Promise.resolve(range))

      guest.anchor(annotation).then ->
        assert.isFalse(annotation.$orphan)

    it "doesn't mark an annotation in which at least one target anchors as an orphan", ->
      guest = createGuest()
      annotation = {
        target: [
          {selector: [{type: 'TextQuoteSelector', exact: 'notinhere'}]},
          {selector: [{type: 'TextQuoteSelector', exact: 'hello'}]},
        ]
      }
      htmlAnchoring.anchor
        .onFirstCall().returns(Promise.reject())
        .onSecondCall().returns(Promise.resolve(range))

      guest.anchor(annotation).then ->
        assert.isFalse(annotation.$orphan)

    it "marks an annotation in which the target fails to anchor as an orphan", ->
      guest = createGuest()
      annotation = {
        target: [
          {selector: [{type: 'TextQuoteSelector', exact: 'notinhere'}]},
        ]
      }
      htmlAnchoring.anchor.returns(Promise.reject())

      guest.anchor(annotation).then ->
        assert.isTrue(annotation.$orphan)

    it "marks an annotation in which all (suitable) targets fail to anchor as an orphan", ->
      guest = createGuest()
      annotation = {
        target: [
          {selector: [{type: 'TextQuoteSelector', exact: 'notinhere'}]},
          {selector: [{type: 'TextQuoteSelector', exact: 'neitherami'}]},
        ]
      }
      htmlAnchoring.anchor.returns(Promise.reject())

      guest.anchor(annotation).then ->
        assert.isTrue(annotation.$orphan)

    it "marks an annotation where the target has no TextQuoteSelectors as an orphan", ->
      guest = createGuest()
      annotation = {
        target: [
          {selector: [{type: 'TextPositionSelector', start: 0, end: 5}]},
        ]
      }
      # This shouldn't be called, but if it is, we successfully anchor so that
      # this test is guaranteed to fail.
      htmlAnchoring.anchor.returns(Promise.resolve(range))

      guest.anchor(annotation).then ->
        assert.isTrue(annotation.$orphan)

    it "does not attempt to anchor targets which have no TextQuoteSelector", ->
      guest = createGuest()
      annotation = {
        target: [
          {selector: [{type: 'TextPositionSelector', start: 0, end: 5}]},
        ]
      }

      guest.anchor(annotation).then ->
        assert.notCalled(htmlAnchoring.anchor)

    it 'updates the cross frame and bucket bar plugins', () ->
      guest = createGuest()
      guest.plugins.CrossFrame =
        sync: sinon.stub()
      guest.plugins.BucketBar =
        update: sinon.stub()
      annotation = {}
      return guest.anchor(annotation).then ->
        assert.called(guest.plugins.BucketBar.update)
        assert.called(guest.plugins.CrossFrame.sync)

    it 'returns a promise of the anchors for the annotation', () ->
      guest = createGuest()
      highlights = [document.createElement('span')]
      htmlAnchoring.anchor.returns(Promise.resolve(range))
      highlighter.highlightRange.returns(highlights)
      target = {selector: [{type: 'TextQuoteSelector', exact: 'hello'}]}
      return guest.anchor({target: [target]}).then (anchors) ->
        assert.equal(anchors.length, 1)

    it 'adds the anchor to the "anchors" instance property"', () ->
      guest = createGuest()
      highlights = [document.createElement('span')]
      htmlAnchoring.anchor.returns(Promise.resolve(range))
      highlighter.highlightRange.returns(highlights)
      target = {selector: [{type: 'TextQuoteSelector', exact: 'hello'}]}
      annotation = {target: [target]}
      return guest.anchor(annotation).then ->
        assert.equal(guest.anchors.length, 1)
        assert.strictEqual(guest.anchors[0].annotation, annotation)
        assert.strictEqual(guest.anchors[0].target, target)
        assert.strictEqual(guest.anchors[0].range, range)
        assert.strictEqual(guest.anchors[0].highlights, highlights)

    it 'destroys targets that have been removed from the annotation', () ->
      annotation = {}
      target = {}
      highlights = []
      guest = createGuest()
      guest.anchors = [{annotation, target, highlights}]
      removeHighlights = highlighter.removeHighlights

      return guest.anchor(annotation).then ->
        assert.equal(guest.anchors.length, 0)
        assert.calledOnce(removeHighlights)
        assert.calledWith(removeHighlights, highlights)

    it 'does not reanchor targets that are already anchored', () ->
      guest = createGuest()
      annotation = target: [{selector: [{type: 'TextQuoteSelector', exact: 'hello'}]}]
      htmlAnchoring.anchor.returns(Promise.resolve(range))
      return guest.anchor(annotation).then ->
        guest.anchor(annotation).then ->
          assert.equal(guest.anchors.length, 1)
          assert.calledOnce(htmlAnchoring.anchor)

  describe '#detach()', ->
    it 'removes the anchors from the "anchors" instance variable', ->
      guest = createGuest()
      annotation = {}
      guest.anchors.push({annotation})
      guest.detach(annotation)
      assert.equal(guest.anchors.length, 0)

    it 'updates the bucket bar plugin', ->
      guest = createGuest()
      guest.plugins.BucketBar = update: sinon.stub()
      annotation = {}

      guest.anchors.push({annotation})
      guest.detach(annotation)
      assert.calledOnce(guest.plugins.BucketBar.update)

    it 'publishes the "annotationDeleted" event', ->
      guest = createGuest()
      annotation = {}
      publish = sandbox.stub(guest, 'publish')

      guest.deleteAnnotation(annotation)

      assert.calledOnce(publish)
      assert.calledWith(publish, 'annotationDeleted', [annotation])

    it 'removes any highlights associated with the annotation', ->
      guest = createGuest()
      annotation = {}
      highlights = [document.createElement('span')]
      removeHighlights = highlighter.removeHighlights

      guest.anchors.push({annotation, highlights})
      guest.deleteAnnotation(annotation)

      assert.calledOnce(removeHighlights)
      assert.calledWith(removeHighlights, highlights)
