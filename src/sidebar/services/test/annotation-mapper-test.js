'use strict';

const angular = require('angular');
const immutable = require('seamless-immutable');

const events = require('../../events');

describe('annotationMapper', function() {
  const sandbox = sinon.sandbox.create();
  let $rootScope;
  let store;
  let fakeApi;
  let annotationMapper;

  beforeEach(function() {
    fakeApi = {
      annotation: {
        delete: sinon.stub().returns(Promise.resolve({})),
        flag: sinon.stub().returns(Promise.resolve({})),
      },
    };
    angular
      .module('app', [])
      .service('annotationMapper', require('../annotation-mapper'))
      .service('store', require('../../store'))
      .value('api', fakeApi)
      .value('settings', {});
    angular.mock.module('app');

    angular.mock.inject(function(_$rootScope_, _store_, _annotationMapper_) {
      $rootScope = _$rootScope_;
      annotationMapper = _annotationMapper_;
      store = _store_;
    });
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#loadAnnotations()', function() {
    it('triggers the annotationLoaded event', function() {
      sandbox.stub($rootScope, '$broadcast');
      const annotations = [{ id: 1 }, { id: 2 }, { id: 3 }];
      annotationMapper.loadAnnotations(annotations);
      assert.called($rootScope.$broadcast);
      assert.calledWith($rootScope.$broadcast, events.ANNOTATIONS_LOADED, [
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);
    });

    it('also includes replies in the annotationLoaded event', function() {
      sandbox.stub($rootScope, '$broadcast');
      const annotations = [{ id: 1 }];
      const replies = [{ id: 2 }, { id: 3 }];
      annotationMapper.loadAnnotations(annotations, replies);
      assert.called($rootScope.$broadcast);
      assert.calledWith($rootScope.$broadcast, events.ANNOTATIONS_LOADED, [
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);
    });

    it('triggers the annotationUpdated event for each loaded annotation', function() {
      sandbox.stub($rootScope, '$broadcast');
      const annotations = immutable([{ id: 1 }, { id: 2 }, { id: 3 }]);
      store.addAnnotations(angular.copy(annotations));

      annotationMapper.loadAnnotations(annotations);
      assert.called($rootScope.$broadcast);
      assert.calledWith(
        $rootScope.$broadcast,
        events.ANNOTATION_UPDATED,
        annotations[0]
      );
    });

    it('also triggers annotationUpdated for cached replies', function() {
      sandbox.stub($rootScope, '$broadcast');
      const annotations = [{ id: 1 }];
      const replies = [{ id: 2 }, { id: 3 }, { id: 4 }];
      store.addAnnotations([{ id: 3 }]);

      annotationMapper.loadAnnotations(annotations, replies);
      assert(
        $rootScope.$broadcast.calledWith(events.ANNOTATION_UPDATED, { id: 3 })
      );
    });

    it('replaces the properties on the cached annotation with those from the loaded one', function() {
      sandbox.stub($rootScope, '$broadcast');
      const annotations = [{ id: 1, url: 'http://example.com' }];
      store.addAnnotations([{ id: 1, $tag: 'tag1' }]);

      annotationMapper.loadAnnotations(annotations);
      assert.called($rootScope.$broadcast);
      assert.calledWith($rootScope.$broadcast, events.ANNOTATION_UPDATED, {
        id: 1,
        url: 'http://example.com',
      });
    });

    it('excludes cached annotations from the annotationLoaded event', function() {
      sandbox.stub($rootScope, '$broadcast');
      const annotations = [{ id: 1, url: 'http://example.com' }];
      store.addAnnotations([{ id: 1, $tag: 'tag1' }]);

      annotationMapper.loadAnnotations(annotations);
      assert.called($rootScope.$broadcast);
      assert.calledWith($rootScope.$broadcast, events.ANNOTATIONS_LOADED, []);
    });
  });

  describe('#unloadAnnotations()', function() {
    it('triggers the annotationsUnloaded event', function() {
      sandbox.stub($rootScope, '$broadcast');
      const annotations = [{ id: 1 }, { id: 2 }, { id: 3 }];
      annotationMapper.unloadAnnotations(annotations);
      assert.calledWith(
        $rootScope.$broadcast,
        events.ANNOTATIONS_UNLOADED,
        annotations
      );
    });

    it('replaces the properties on the cached annotation with those from the deleted one', function() {
      sandbox.stub($rootScope, '$broadcast');
      const annotations = [{ id: 1, url: 'http://example.com' }];
      store.addAnnotations([{ id: 1, $tag: 'tag1' }]);

      annotationMapper.unloadAnnotations(annotations);
      assert.calledWith($rootScope.$broadcast, events.ANNOTATIONS_UNLOADED, [
        {
          id: 1,
          url: 'http://example.com',
        },
      ]);
    });
  });

  describe('#flagAnnotation()', function() {
    it('flags an annotation', function() {
      const ann = { id: 'test-id' };
      annotationMapper.flagAnnotation(ann);
      assert.calledOnce(fakeApi.annotation.flag);
      assert.calledWith(fakeApi.annotation.flag, { id: ann.id });
    });

    it('emits the "annotationFlagged" event', function(done) {
      sandbox.stub($rootScope, '$broadcast');
      const ann = { id: 'test-id' };
      annotationMapper
        .flagAnnotation(ann)
        .then(function() {
          assert.calledWith(
            $rootScope.$broadcast,
            events.ANNOTATION_FLAGGED,
            ann
          );
        })
        .then(done, done);
    });
  });

  describe('#createAnnotation()', function() {
    it('creates a new annotation resource', function() {
      const ann = {};
      const ret = annotationMapper.createAnnotation(ann);
      assert.equal(ret, ann);
    });

    it('emits the "beforeAnnotationCreated" event', function() {
      sandbox.stub($rootScope, '$broadcast');
      const ann = {};
      annotationMapper.createAnnotation(ann);
      assert.calledWith(
        $rootScope.$broadcast,
        events.BEFORE_ANNOTATION_CREATED,
        ann
      );
    });
  });

  describe('#deleteAnnotation()', function() {
    it('deletes the annotation on the server', function() {
      const ann = { id: 'test-id' };
      annotationMapper.deleteAnnotation(ann);
      assert.calledWith(fakeApi.annotation.delete, { id: 'test-id' });
    });

    it('triggers the "annotationDeleted" event on success', function(done) {
      sandbox.stub($rootScope, '$broadcast');
      const ann = {};
      annotationMapper
        .deleteAnnotation(ann)
        .then(function() {
          assert.calledWith(
            $rootScope.$broadcast,
            events.ANNOTATION_DELETED,
            ann
          );
        })
        .then(done, done);
      $rootScope.$apply();
    });

    it('does not emit an event on error', function(done) {
      sandbox.stub($rootScope, '$broadcast');
      fakeApi.annotation.delete.returns(Promise.reject());
      const ann = { id: 'test-id' };
      annotationMapper
        .deleteAnnotation(ann)
        .catch(function() {
          assert.notCalled($rootScope.$broadcast);
        })
        .then(done, done);
      $rootScope.$apply();
    });
  });
});
