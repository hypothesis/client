BucketBar = require('../bucket-bar')

# Return DOM elements for non-empty bucket indicators in a `BucketBar`.
nonEmptyBuckets = (bucketBar) ->
  buckets = bucketBar.element[0].querySelectorAll('.annotator-bucket-indicator')
  Array.from(buckets)
    .filter((bucket) ->
      label = bucket.querySelector('.label')
      parseInt(label.textContent) > 0
    )


createMouseEvent = (type, { ctrlKey, metaKey } = {}) ->
  # In a modern browser we could use `new MouseEvent` constructor and pass
  # `ctrlKey` and `metaKey` via the init object.
  event = new Event(type)
  event.ctrlKey = Boolean(ctrlKey)
  event.metaKey = Boolean(metaKey)
  event


describe 'BucketBar', ->
  createBucketBar = (options) ->
    element = document.createElement('div')
    new BucketBar(element, options || {})

  # Create a fake anchor, which is a combination of annotation object and
  # associated highlight elements.
  createAnchor = ->
    annotation: { $tag: 'ann1' },
    highlights: [document.createElement('span')]

  context 'when a bucket is clicked', ->
    bucketBar = null

    fakeHighlighter = null
    fakeAnnotator = null

    beforeEach ->
      fakeHighlighter =
        getBoundingClientRect: -> { left: 0, top: 200, right: 200, bottom: 250 }

      bucketBar = createBucketBar(highlighter: fakeHighlighter)

      # This setup is done by `Guest#addPlugin` in the actual app.
      bucketBar.annotator = {
        anchors: [],
        selectAnnotations: sinon.stub(),
      }

      # Create fake anchors and render buckets.
      anchors = [createAnchor()]
      bucketBar.annotator.anchors = anchors
      bucketBar._update()

    it 'selects the annotations', ->
      # Click on the indicator for the non-empty bucket.
      bucketEls = nonEmptyBuckets(bucketBar)
      assert.equal(bucketEls.length, 1)
      bucketEls[0].dispatchEvent(createMouseEvent('click'))

      anns = bucketBar.annotator.anchors.map((anchor) -> anchor.annotation)
      assert.calledWith(bucketBar.annotator.selectAnnotations, anns, false)

    [
      { ctrlKey: true, metaKey: false },
      { ctrlKey: false, metaKey: true },
    ].forEach(({ ctrlKey, metaKey }) ->
      it 'toggles selection of the annotations if Ctrl or Alt is pressed', ->
        # Click on the indicator for the non-empty bucket.
        bucketEls = nonEmptyBuckets(bucketBar)
        assert.equal(bucketEls.length, 1)
        bucketEls[0].dispatchEvent(
          createMouseEvent('click', ctrlKey: ctrlKey, metaKey: metaKey)
        )

        anns = bucketBar.annotator.anchors.map((anchor) -> anchor.annotation)
        assert.calledWith(bucketBar.annotator.selectAnnotations, anns, true)
    )


  # Yes this is testing a private method. Yes this is bad practice, but I'd
  # rather test this functionality in a private method than not test it at all.
  #
  # Note: This could be tested using only the public APIs of the `BucketBar`
  # class using the approach of the "when a bucket is clicked" tests above.
  describe '_buildTabs', ->
    setup = (tabs) ->
      bucketBar = createBucketBar()
      bucketBar.tabs = tabs
      bucketBar.buckets = [['AN ANNOTATION?']]
      bucketBar.index = [
        0,
        BucketBar.BUCKET_TOP_THRESHOLD - 1,
        BucketBar.BUCKET_TOP_THRESHOLD,
      ]
      bucketBar

    it 'creates a tab with a title', ->
      tab = $('<div />')
      bucketBar = setup(tab)

      bucketBar._buildTabs()
      assert.equal(tab.attr('title'), 'Show one annotation')

    it 'creates a tab with a pluralized title', ->
      tab = $('<div />')
      bucketBar = setup(tab)
      bucketBar.buckets[0].push('Another Annotation?')

      bucketBar._buildTabs()
      assert.equal(tab.attr('title'), 'Show 2 annotations')

    it 'sets the tab text to the number of annotations', ->
      tab = $('<div />')
      bucketBar = setup(tab)
      bucketBar.buckets[0].push('Another Annotation?')

      bucketBar._buildTabs()
      assert.equal(tab.text(), '2')

    it 'sets the tab text to the number of annotations', ->
      tab = $('<div />')
      bucketBar = setup(tab)
      bucketBar.buckets[0].push('Another Annotation?')

      bucketBar._buildTabs()
      assert.equal(tab.text(), '2')

    it 'adds the class "upper" if the annotation is at the top', ->
      tab = $('<div />')
      bucketBar = setup(tab)
      sinon.stub(bucketBar, 'isUpper').returns(true)

      bucketBar._buildTabs()
      assert.equal(tab.hasClass('upper'), true)

    it 'removes the class "upper" if the annotation is not at the top', ->
      tab = $('<div />').addClass('upper')
      bucketBar = setup(tab)
      sinon.stub(bucketBar, 'isUpper').returns(false)

      bucketBar._buildTabs()
      assert.equal(tab.hasClass('upper'), false)

    it 'adds the class "lower" if the annotation is at the top', ->
      tab = $('<div />')
      bucketBar = setup(tab)
      sinon.stub(bucketBar, 'isLower').returns(true)

      bucketBar._buildTabs()
      assert.equal(tab.hasClass('lower'), true)

    it 'removes the class "lower" if the annotation is not at the top', ->
      tab = $('<div />').addClass('lower')
      bucketBar = setup(tab)
      sinon.stub(bucketBar, 'isLower').returns(false)

      bucketBar._buildTabs()
      assert.equal(tab.hasClass('lower'), false)

    it 'reveals the tab if there are annotations in the bucket', ->
      tab = $('<div />')
      bucketBar = setup(tab)

      bucketBar._buildTabs()
      assert.equal(tab.css('display'), '')

    it 'hides the tab if there are no annotations in the bucket', ->
      tab = $('<div />')
      bucketBar = setup(tab)
      bucketBar.buckets = []

      bucketBar._buildTabs()
      assert.equal(tab.css('display'), 'none')
