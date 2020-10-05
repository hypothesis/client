$ = require('jquery')
{ default: Delegator } = require('../delegator')

scrollIntoView = require('scroll-into-view')

{ findClosestOffscreenAnchor, constructPositionPoints, buildBuckets } = require('../util/buckets')

highlighter = require('../highlighter')

BUCKET_SIZE = 16                              # Regular bucket size
BUCKET_NAV_SIZE = BUCKET_SIZE + 6             # Bucket plus arrow (up/down)
BUCKET_TOP_THRESHOLD = 115 + BUCKET_NAV_SIZE  # Toolbar


# Scroll to the next closest anchor off screen in the given direction.
scrollToClosest = (anchors, direction) ->
  closest = findClosestOffscreenAnchor(anchors, direction)
  scrollIntoView(closest.highlights[0])


module.exports = class BucketBar extends Delegator
  # svg skeleton
  html: """
        <div class="annotator-bucket-bar">
        </div>
        """

  # buckets of annotations that overlap
  buckets: []

  # index for fast hit detection in the buckets
  index: []

  # tab elements
  tabs: null

  constructor: (element, options, annotator) ->
    defaultOptions = {
      # gapSize parameter is used by the clustering algorithm
      # If an annotation is farther then this gapSize from the next bucket
      # then that annotation will not be merged into the bucket
      gapSize: 60

      # Selectors for the scrollable elements on the page
      scrollables: ['body']
    }
    super $(@html), Object.assign(defaultOptions, options)

    if @options.container?
      $(@options.container).append @element
    else
      $(element).append @element

    @annotator = annotator
    @highlighter = options.highlighter ? highlighter  # Test seam.

    $(window).on 'resize scroll', @update

    for scrollable in @options.scrollables ? []
      $(scrollable).on 'resize scroll', @update

  destroy: ->
    $(window).off 'resize scroll', @update

    for scrollable in @options.scrollables ? []
      $(scrollable).off 'resize scroll', @update

  _collate: (a, b) ->
    for i in [0..a.length-1]
      if a[i] < b[i]
        return -1
      if a[i] > b[i]
        return 1
    return 0

  # Update sometime soon
  update: =>
    return if @_updatePending?
    @_updatePending = requestAnimationFrame =>
      delete @_updatePending
      @_update()

  _update: ->
    {above, below, points } = constructPositionPoints(@annotator.anchors)
    fakeBuckets = buildBuckets(points)

    # Accumulate the overlapping anchors into buckets.
    # The algorithm goes like this:
    # - Collate the points by sorting on position then delta (+1 or -1)
    # - Reduce over the sorted points
    #   - For +1 points, add the anchor at this point to an array of
    #     "carried" anchors. If it already exists, increase the
    #     corresponding value in an array of counts which maintains the
    #     number of points that include this anchor.
    #   - For -1 points, decrement the value for the anchor at this point
    #     in the carried array of counts. If the count is now zero, remove the
    #     anchor from the carried array of anchors.
    #   - If this point is the first, last, sufficiently far from the previous,
    #     or there are no more carried anchors, add a bucket marker at this
    #     point.
    #   - Otherwise, if the last bucket was not isolated (the one before it
    #     has at least one anchor) then remove it and ensure that its
    #     anchors and the carried anchors are merged into the previous
    #     bucket.
    {@buckets, @index} = points
    .reduce ({buckets, index, carry}, [x, d, a], i, points) =>
      if d > 0                                            # delta type is "top/start": Add annotation
        if (j = carry.anchors.indexOf a) < 0              # If anchor not in carry
          carry.anchors.unshift a                         # push on to front of carry
          carry.counts.unshift 1                          # initialize counts for this ... bucket?
        else
          carry.counts[j]++                               # increment counts for this ...bucket?
      else                                                # delta type is "bottom/end": Remove annotation
        j = carry.anchors.indexOf a                       # We're assuming this anchor is already in the carry-anchors...
        if --carry.counts[j] is 0                         # if carry.counts[j] === 1 — if the bucket with this anchor has exactly
                                                          # 1 thing in it
          carry.anchors.splice j, 1                       # Remove this anchor from `carry.anchors`
          carry.counts.splice j, 1                        # I'm guessing this..."closes" the last open anchor for now?

      if (
        (index.length is 0 or i is points.length - 1) or  # Is this the first or last point?
        carry.anchors.length is 0 or                      # A zero marker?
        x - index[index.length-1] > @options.gapSize      # A large gap?
      )                                                   # Mark a new bucket.
        buckets.push carry.anchors.slice()
        index.push x
      else
        # Merge the previous bucket, making sure its predecessor contains
        # all the carried anchors and the anchors in the previous
        # bucket.
        if buckets[buckets.length-2]?.length
          last = buckets[buckets.length-2]
          toMerge = buckets.pop()
          index.pop()
        else
          last = buckets[buckets.length-1]
          toMerge = []
        last.push a0 for a0 in toMerge when a0 not in last
        last.push a0 for a0 in carry.anchors when a0 not in last

      {buckets, index, carry}
    ,
      buckets: []
      index: []
      carry:
        anchors: []
        counts: []
        latest: 0

    @buckets.forEach (bucket, bi) =>
      console.assert(@index[bi] is fakeBuckets.index[bi], 'index positions are equal')
      bucket.forEach (anchor, ai) =>
        console.assert(anchor is fakeBuckets.buckets[bi][ai], 'anchors are the same', anchor.annotation.$tag, fakeBuckets.buckets[bi][ai].annotation.$tag)
    # Scroll up
    @buckets.unshift [], above, []
    @index.unshift 0, BUCKET_TOP_THRESHOLD - 1, BUCKET_TOP_THRESHOLD

    # Scroll down
    @buckets.push [], below, []
    @index.push window.innerHeight - BUCKET_NAV_SIZE,
      window.innerHeight - BUCKET_NAV_SIZE + 1,
      window.innerHeight

    # Calculate the total count for each bucket (without replies) and the
    # maximum count.
    max = 0
    for b in @buckets
      max = Math.max max, b.length

    # Update the data bindings
    element = @element

    # Keep track of tabs to keep element creation to a minimum.
    @tabs ||= $([])

    # Remove any extra tabs and update @tabs.
    @tabs.slice(@buckets.length).remove()
    @tabs = @tabs.slice(0, @buckets.length)

    # Create any new tabs if needed.
    $.each @buckets.slice(@tabs.length), =>
      div = $('<div/>').appendTo(element)

      @tabs.push(div[0])

      div.addClass('annotator-bucket-indicator')

      # Focus corresponding highlights bucket when mouse is hovered
      # TODO: This should use event delegation on the container.
      .on 'mousemove', (event) =>
        bucket = @tabs.index(event.currentTarget)
        for anchor in @annotator.anchors
          toggle = anchor in @buckets[bucket]
          $(anchor.highlights).toggleClass('hypothesis-highlight-focused', toggle)

      # Gets rid of them after
      .on 'mouseout', (event) =>
        bucket = @tabs.index(event.currentTarget)
        for anchor in @buckets[bucket]
          $(anchor.highlights).removeClass('hypothesis-highlight-focused')

      # Does one of a few things when a tab is clicked depending on type
      .on 'click', (event) =>
        bucket = @tabs.index(event.currentTarget)
        event.stopPropagation()

        # If it's the upper tab, scroll to next anchor above
        if (@isUpper bucket)
          scrollToClosest(@buckets[bucket], 'up')
        # If it's the lower tab, scroll to next anchor below
        else if (@isLower bucket)
          scrollToClosest(@buckets[bucket], 'down')
        else
          annotations = (anchor.annotation for anchor in @buckets[bucket])
          @annotator.selectAnnotations annotations,
            (event.ctrlKey or event.metaKey),

    this._buildTabs(@tabs, @buckets)

  _buildTabs: ->
    @tabs.each (d, el) =>
      el = $(el)
      bucket = @buckets[d]
      bucketLength = bucket?.length

      title = if bucketLength != 1
        "Show #{bucketLength} annotations"
      else if bucketLength > 0
        'Show one annotation'

      el.attr('title', title)
      el.toggleClass('upper', @isUpper(d))
      el.toggleClass('lower', @isLower(d))

      if @isUpper(d) or @isLower(d)
        bucketSize = BUCKET_NAV_SIZE
      else
        bucketSize = BUCKET_SIZE

      el.css({
        top: (@index[d] + @index[d+1]) / 2
        marginTop: -bucketSize / 2
        display: unless bucketLength then 'none' else ''
      })

      if bucket
        el.html("<div class='label'>#{bucketLength}</div>")

  isUpper:   (i) -> i == 1
  isLower:   (i) -> i == @index.length - 2


# Export constants
BucketBar.BUCKET_SIZE = BUCKET_SIZE
BucketBar.BUCKET_NAV_SIZE = BUCKET_NAV_SIZE
BucketBar.BUCKET_TOP_THRESHOLD = BUCKET_TOP_THRESHOLD
