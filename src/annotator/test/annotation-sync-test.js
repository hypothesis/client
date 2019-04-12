'use strict';

const EventEmitter = require('tiny-emitter');

const AnnotationSync = require('../annotation-sync');

describe('AnnotationSync', function() {
  let createAnnotationSync;
  let fakeBridge;
  let options;
  let publish;
  const sandbox = sinon.sandbox.create();

  beforeEach(function() {
    const emitter = new EventEmitter();
    const listeners = {};

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
      const method = arguments[0];
      const args = [].slice.call(arguments, 1);

      listeners[method].apply(listeners, args);
    };
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#constructor', function() {
    context('when "deleteAnnotation" is published', function() {
      it('calls emit("annotationDeleted")', function() {
        const ann = { id: 1, $tag: 'tag1' };
        const eventStub = sinon.stub();
        options.on('annotationDeleted', eventStub);
        createAnnotationSync();

        publish('deleteAnnotation', { msg: ann }, function() {});

        assert.calledWith(eventStub, ann);
      });

      it("calls the 'deleteAnnotation' event's callback function", function(done) {
        const ann = { id: 1, $tag: 'tag1' };
        const callback = function(err, ret) {
          assert.isNull(err);
          assert.deepEqual(ret, { tag: 'tag1', msg: ann });
          done();
        };
        createAnnotationSync();

        publish('deleteAnnotation', { msg: ann }, callback);
      });

      it('deletes any existing annotation from its cache before calling emit', function() {
        const ann = { id: 1, $tag: 'tag1' };
        const annSync = createAnnotationSync();
        annSync.cache.tag1 = ann;
        options.emit = function() {
          assert(!annSync.cache.tag1);
        };

        publish('deleteAnnotation', { msg: ann }, function() {});
      });

      it('deletes any existing annotation from its cache', function() {
        const ann = { id: 1, $tag: 'tag1' };
        const annSync = createAnnotationSync();
        annSync.cache.tag1 = ann;

        publish('deleteAnnotation', { msg: ann }, function() {});

        assert(!annSync.cache.tag1);
      });
    });

    context('when "loadAnnotations" is published', function() {
      it('calls emit("annotationsLoaded")', function() {
        const annotations = [
          { id: 1, $tag: 'tag1' },
          { id: 2, $tag: 'tag2' },
          { id: 3, $tag: 'tag3' },
        ];
        const bodies = [
          { msg: annotations[0], tag: annotations[0].$tag },
          { msg: annotations[1], tag: annotations[1].$tag },
          { msg: annotations[2], tag: annotations[2].$tag },
        ];
        const loadedStub = sinon.stub();
        options.on('annotationsLoaded', loadedStub);
        createAnnotationSync();

        publish('loadAnnotations', bodies, function() {});

        assert.calledWith(loadedStub, annotations);
      });
    });

    context('when "beforeAnnotationCreated" is emitted', function() {
      it('calls bridge.call() passing the event', function() {
        const ann = { id: 1 };
        createAnnotationSync();

        options.emit('beforeAnnotationCreated', ann);

        assert.called(fakeBridge.call);
        assert.calledWith(
          fakeBridge.call,
          'beforeCreateAnnotation',
          { msg: ann, tag: ann.$tag },
          sinon.match.func
        );
      });

      context('if the annotation has a $tag', function() {
        it('does not call bridge.call()', function() {
          const ann = { id: 1, $tag: 'tag1' };
          createAnnotationSync();

          options.emit('beforeAnnotationCreated', ann);

          assert.notCalled(fakeBridge.call);
        });
      });
    });
  });
});
