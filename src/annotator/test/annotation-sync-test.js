'use strict';

var EventEmitter = require('tiny-emitter');

var AnnotationSync = require('../annotation-sync');

describe('AnnotationSync', function() {
  var createAnnotationSync;
  var fakeBridge;
  var options;
  var publish;
  var sandbox = sinon.sandbox.create();

  beforeEach(function() {
    var emitter = new EventEmitter();
    var listeners = {};

    createAnnotationSync = function() {
      return new AnnotationSync(fakeBridge, options);
    };

    fakeBridge = {
      on: sandbox.spy(function(method, fn) {
        listeners[method] = fn;
      }),
      call: sandbox.stub(),
      onConnect: sandbox.stub(),
      links: [],
    };

    options = {
      on: emitter.on.bind(emitter), // eslint-disable-line no-restricted-properties
      emit: emitter.emit.bind(emitter), // eslint-disable-line no-restricted-properties
    };

    publish = function() {
      var method = arguments[0];
      var args = [].slice.call(arguments, 1);

      listeners[method].apply(listeners, args);
    };
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#constructor', function() {
    context('when "deleteAnnotation" is published', function() {
      it('calls emit("annotationDeleted")', function() {
        var ann = {id: 1, $tag: 'tag1'};
        var eventStub = sinon.stub();
        options.on('annotationDeleted', eventStub);
        createAnnotationSync();

        publish('deleteAnnotation', {msg: ann}, function() {});

        assert.calledWith(eventStub, ann);
      });

      it("calls the 'deleteAnnotation' event's callback function", function(done) {
        var ann = {id: 1, $tag: 'tag1'};
        var callback = function(err, ret) {
          assert.isNull(err);
          assert.deepEqual(ret, {tag: 'tag1', msg: ann});
          done();
        };
        createAnnotationSync();

        publish('deleteAnnotation', {msg: ann}, callback);
      });

      it('deletes any existing annotation from its cache before calling emit', function() {
        var ann = {id: 1, $tag: 'tag1'};
        var annSync = createAnnotationSync();
        annSync.cache.tag1 = ann;
        options.emit = function() { assert(!annSync.cache.tag1); };

        publish('deleteAnnotation', {msg: ann}, function() {});
      });

      it('deletes any existing annotation from its cache', function() {
        var ann = {id: 1, $tag: 'tag1'};
        var annSync = createAnnotationSync();
        annSync.cache.tag1 = ann;

        publish('deleteAnnotation', {msg: ann}, function() {});

        assert(!annSync.cache.tag1);
      });
    });

    context('when "loadAnnotations" is published', function() {
      it('calls emit("annotationsLoaded")', function() {
        var annotations = [
          {id: 1, $tag: 'tag1'},
          {id: 2, $tag: 'tag2'},
          {id: 3, $tag: 'tag3'},
        ];
        var bodies = [
          {msg: annotations[0], tag: annotations[0].$tag},
          {msg: annotations[1], tag: annotations[1].$tag},
          {msg: annotations[2], tag: annotations[2].$tag},
        ];
        var loadedStub = sinon.stub();
        options.on('annotationsLoaded', loadedStub);
        createAnnotationSync();

        publish('loadAnnotations', bodies, function() {});

        assert.calledWith(loadedStub, annotations);
      });
    });

    context('when "beforeAnnotationCreated" is emitted', function() {
      it('calls bridge.call() passing the event', function() {
        var ann = {id: 1};
        createAnnotationSync();

        options.emit('beforeAnnotationCreated', ann);

        assert.called(fakeBridge.call);
        assert.calledWith(
          fakeBridge.call, 'beforeCreateAnnotation', {msg: ann, tag: ann.$tag},
          sinon.match.func);
      });

      context('if the annotation has a $tag', function() {
        it('does not call bridge.call()', function() {
          var ann = {id: 1, $tag: 'tag1'};
          createAnnotationSync();

          options.emit('beforeAnnotationCreated', ann);

          assert.notCalled(fakeBridge.call);
        });
      });
    });
  });
});
