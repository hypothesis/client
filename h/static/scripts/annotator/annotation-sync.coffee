# AnnotationSync listens for messages from the sidebar app indicating that
# annotations have been added or removed and relays them to Annotator.
#
# It also listens for events from Annotator when new annotations are created or
# annotations successfully anchor and relays these to the sidebar app.

module.exports = class AnnotationSync
  # Cache of annotations which have crossed the bridge for fast, encapsulated
  # association of annotations received in arguments to window-local copies.
  cache: null

  constructor: (@bridge, options) ->
    if !options.on
      throw new Error('options.on unspecified for AnnotationSync.')

    if !options.emit
      throw new Error('options.emit unspecified for AnnotationSync.')

    @cache = {}

    @_on = options.on
    @_emit = options.emit

    # Listen locally for interesting events
    for event, handler of @_eventListeners
      this._on(event, handler.bind(this))

    # Register remotely invokable methods
    for method, func of @_channelListeners
      @bridge.on(method, func.bind(this))

  sync: (annotations) ->
    annotations = (this._format a for a in annotations)
    @bridge.call 'sync', annotations, (err, annotations = []) =>
      for a in annotations
        this._parse(a)
    this

  # Handlers for messages arriving through a channel
  _channelListeners:
    'deleteAnnotation': (body, cb) ->
      annotation = this._parse(body)
      delete @cache[annotation.$$tag]
      @_emit('annotationDeleted', annotation)
      cb(null, this._format(annotation))

    'loadAnnotations': (bodies, cb) ->
      annotations = (this._parse(a) for a in bodies)
      @_emit('annotationsLoaded', annotations)
      cb(null, annotations)

  # Handlers for events coming from this frame, to send them across the channel
  _eventListeners:
    'beforeAnnotationCreated': (annotation) ->
      return if annotation.$$tag?
      this._mkCallRemotelyAndParseResults('beforeCreateAnnotation')(annotation)

  _mkCallRemotelyAndParseResults: (method, callBack) ->
    (annotation) =>
      # Wrap the callback function to first parse returned items
      wrappedCallback = (failure, results) =>
        unless failure?
          this._parseResults results
        callBack? failure, results

      # Call the remote method
      @bridge.call(method, this._format(annotation), wrappedCallback)

  # Parse returned message bodies to update cache with any changes made remotely
  _parseResults: (results) ->
    for bodies in results
      bodies = [].concat(bodies) # Ensure always an array.
      this._parse(body) for body in bodies when body != null
    return

  # Assign a non-enumerable tag to objects which cross the bridge.
  # This tag is used to identify the objects between message.
  _tag: (ann, tag) ->
    return ann if ann.$$tag
    tag = tag or window.btoa(Math.random())
    Object.defineProperty(ann, '$$tag', value: tag)
    @cache[tag] = ann
    ann

  # Parse a message body from a RPC call with the provided parser.
  _parse: (body) ->
    local = @cache[body.tag]
    remote = body.msg
    merged = Object.assign(local || {}, remote)
    this._tag(merged, body.tag)

  # Format an annotation into an RPC message body with the provided formatter.
  _format: (ann) ->
    this._tag(ann)
    {
      tag: ann.$$tag
      msg: ann
    }
