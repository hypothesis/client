EventEmitter = require('tiny-emitter')

AnnotationSync = require('../annotation-sync')

describe 'AnnotationSync', ->
  sandbox = sinon.sandbox.create()
  publish = null
  fakeBridge = null
  createAnnotationSync = null
  createChannel = -> {call: sandbox.stub()}
  options = null
  PARENT_WINDOW = 'PARENT_WINDOW'

  beforeEach ->
    listeners = {}
    publish = (method, args...) -> listeners[method](args...)

    fakeWindow = parent: PARENT_WINDOW
    fakeBridge =
      on: sandbox.spy((method, fn) -> listeners[method] = fn)
      call: sandbox.stub()
      onConnect: sandbox.stub()
      links: []

    emitter = new EventEmitter();

    options =
      on: emitter.on.bind(emitter)
      emit: emitter.emit.bind(emitter)

    createAnnotationSync = ->
      new AnnotationSync(fakeBridge, options)

  afterEach: -> sandbox.restore()

  describe 'channel event handlers', ->
    assertBroadcast = (channelEvent, publishEvent) ->
      it 'broadcasts the "' + publishEvent + '" event over the local event bus', ->
        ann = {id: 1, $$tag: 'tag1'}
        annSync = createAnnotationSync()
        eventStub = sinon.stub()
        options.on(publishEvent, eventStub)

        publish(channelEvent, {msg: ann}, ->)

        assert.calledWith(eventStub, ann)

    assertReturnValue = (channelEvent) ->
      it 'calls back with a formatted annotation', (done) ->
        ann = {id: 1, $$tag: 'tag1'}
        annSync = createAnnotationSync()

        callback = (err, ret) ->
          assert.isNull(err)
          assert.deepEqual(ret, {tag: 'tag1', msg: ann})
          done()
        publish(channelEvent, {msg: ann}, callback)

    assertCacheState = (channelEvent) ->
      it 'removes an existing entry from the cache before the event is triggered', ->
        options.emit = -> assert(!annSync.cache['tag1'])

        ann = {id: 1, $$tag: 'tag1'}
        annSync = createAnnotationSync()
        annSync.cache['tag1'] = ann

        publish(channelEvent, {msg: ann}, ->)

      it 'ensures the annotation is inserted in the cache', ->
        ann = {id: 1, $$tag: 'tag1'}
        annSync = createAnnotationSync()

        publish(channelEvent, {msg: ann}, ->)

        assert.equal(annSync.cache['tag1'], ann)

    describe 'the "deleteAnnotation" event', ->
      assertBroadcast('deleteAnnotation', 'annotationDeleted')
      assertReturnValue('deleteAnnotation')

      it 'removes an existing entry from the cache before the event is triggered', ->
        options.emit = -> assert(!annSync.cache['tag1'])

        ann = {id: 1, $$tag: 'tag1'}
        annSync = createAnnotationSync()
        annSync.cache['tag1'] = ann

        publish('deleteAnnotation', {msg: ann}, ->)

      it 'removes the annotation from the cache', ->
        ann = {id: 1, $$tag: 'tag1'}
        annSync = createAnnotationSync()

        publish('deleteAnnotation', {msg: ann}, ->)

        assert(!annSync.cache['tag1'])

    describe 'the "loadAnnotations" event', ->
      it 'publishes the "annotationsLoaded" event', ->
        loadedStub = sinon.stub()
        options.on('annotationsLoaded', loadedStub)
        annSync = createAnnotationSync()

        annotations = [{id: 1, $$tag: 'tag1'}, {id: 2, $$tag: 'tag2'}, {id: 3, $$tag: 'tag3'}]
        bodies = ({msg: ann, tag: ann.$$tag} for ann in annotations)
        publish('loadAnnotations', bodies, ->)

        assert.calledWith(loadedStub, annotations)

  describe 'event handlers', ->
    describe 'the "beforeAnnotationCreated" event', ->
      it 'proxies the event over the bridge', ->
        ann = {id: 1}
        annSync = createAnnotationSync()
        options.emit('beforeAnnotationCreated', ann)

        assert.called(fakeBridge.call)
        assert.calledWith(fakeBridge.call, 'beforeCreateAnnotation',
          {msg: ann, tag: ann.$$tag}, sinon.match.func)

      it 'returns early if the annotation has a tag', ->
        ann = {id: 1, $$tag: 'tag1'}
        annSync = createAnnotationSync()
        options.emit('beforeAnnotationCreated', ann)

        assert.notCalled(fakeBridge.call)
