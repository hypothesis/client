'use strict';

var AnnotationSync;
var EventEmitter;
var slice = [].slice;

EventEmitter = require('tiny-emitter');

AnnotationSync = require('../annotation-sync');

describe('AnnotationSync', function() {
  var createAnnotationSync;
  var fakeBridge;
  var options;
  var publish;
  var sandbox;

  sandbox = sinon.sandbox.create();
  publish = null;
  fakeBridge = null;
  createAnnotationSync = null;
  options = null;
  beforeEach(function() {
    var emitter;
    var listeners;

    listeners = {};
    publish = function() {
      var method = arguments[0];
      var args = slice.call(arguments, 1);

      return listeners[method].apply(listeners, args);
    };
    fakeBridge = {
      on: sandbox.spy(function(method, fn) {
        return listeners[method] = fn;
      }),
      call: sandbox.stub(),
      onConnect: sandbox.stub(),
      links: [],
    };
    emitter = new EventEmitter();
    options = {
      on: emitter.on.bind(emitter),
      emit: emitter.emit.bind(emitter),
    };
    return createAnnotationSync = function() {
      return new AnnotationSync(fakeBridge, options);
    };
  });

  afterEach(function() {
    return sandbox.restore();
  });

  describe('channel event handlers', function() {
    var assertBroadcast;
    var assertReturnValue;
    assertBroadcast = function(channelEvent, publishEvent) {
      return it('broadcasts the "' + publishEvent + '" event over the local event bus', function() {
        var ann;
        var eventStub;
        ann = {
          id: 1,
          $tag: 'tag1',
        };
        createAnnotationSync();
        eventStub = sinon.stub();
        options.on(publishEvent, eventStub);
        publish(channelEvent, {
          msg: ann,
        }, function() {});
        return assert.calledWith(eventStub, ann);
      });
    };
    assertReturnValue = function(channelEvent) {
      return it('calls back with a formatted annotation', function(done) {
        var ann;
        var callback;

        ann = {
          id: 1,
          $tag: 'tag1',
        };
        createAnnotationSync();
        callback = function(err, ret) {
          assert.isNull(err);
          assert.deepEqual(ret, {
            tag: 'tag1',
            msg: ann,
          });
          return done();
        };
        return publish(channelEvent, {
          msg: ann,
        }, callback);
      });
    };
    describe('the "deleteAnnotation" event', function() {
      assertBroadcast('deleteAnnotation', 'annotationDeleted');
      assertReturnValue('deleteAnnotation');
      it('removes an existing entry from the cache before the event is triggered', function() {
        var ann;
        var annSync;
        options.emit = function() {
          return assert(!annSync.cache.tag1);
        };
        ann = {
          id: 1,
          $tag: 'tag1',
        };
        annSync = createAnnotationSync();
        annSync.cache.tag1 = ann;
        return publish('deleteAnnotation', {
          msg: ann,
        }, function() {});
      });
      return it('removes the annotation from the cache', function() {
        var ann;
        var annSync;
        ann = {
          id: 1,
          $tag: 'tag1',
        };
        annSync = createAnnotationSync();
        publish('deleteAnnotation', {
          msg: ann,
        }, function() {});
        return assert(!annSync.cache.tag1);
      });
    });
    return describe('the "loadAnnotations" event', function() {
      return it('publishes the "annotationsLoaded" event', function() {
        var ann;
        var annotations;
        var bodies;
        var loadedStub;

        loadedStub = sinon.stub();
        options.on('annotationsLoaded', loadedStub);
        createAnnotationSync();
        annotations = [
          {
            id: 1,
            $tag: 'tag1',
          }, {
            id: 2,
            $tag: 'tag2',
          }, {
            id: 3,
            $tag: 'tag3',
          },
        ];
        bodies = (function() {
          var i;
          var len;
          var results;

          results = [];
          for (i = 0, len = annotations.length; i < len; i++) {
            ann = annotations[i];
            results.push({
              msg: ann,
              tag: ann.$tag,
            });
          }
          return results;
        })();
        publish('loadAnnotations', bodies, function() {});
        return assert.calledWith(loadedStub, annotations);
      });
    });
  });
  return describe('event handlers', function() {
    return describe('the "beforeAnnotationCreated" event', function() {
      it('proxies the event over the bridge', function() {
        var ann;
        ann = {
          id: 1,
        };
        createAnnotationSync();
        options.emit('beforeAnnotationCreated', ann);
        assert.called(fakeBridge.call);
        return assert.calledWith(fakeBridge.call, 'beforeCreateAnnotation', {
          msg: ann,
          tag: ann.$tag,
        }, sinon.match.func);
      });
      return it('returns early if the annotation has a tag', function() {
        var ann;
        ann = {
          id: 1,
          $tag: 'tag1',
        };
        createAnnotationSync();
        options.emit('beforeAnnotationCreated', ann);
        return assert.notCalled(fakeBridge.call);
      });
    });
  });
});
