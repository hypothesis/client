import { Injector } from '../../../shared/injector';
import events from '../../events';
import storeFactory from '../../store';
import annotationMapperFactory from '../annotation-mapper';
import immutable from '../../util/immutable';

describe('annotationMapper', function () {
  let $rootScope;
  let store;
  let fakeApi;
  let annotationMapper;

  beforeEach(function () {
    fakeApi = {
      annotation: {
        delete: sinon.stub().returns(Promise.resolve({})),
        flag: sinon.stub().returns(Promise.resolve({})),
      },
    };

    $rootScope = {
      // nb. `$applyAsync` is needed because this test uses the real `store`
      // service.
      $applyAsync: sinon.stub().yields(),
      $broadcast: sinon.stub(),
    };

    const injector = new Injector()
      .register('$rootScope', { value: $rootScope })
      .register('api', { value: fakeApi })
      .register('settings', { value: {} })
      .register('store', storeFactory)
      .register('annotationMapper', annotationMapperFactory);
    store = injector.get('store');
    annotationMapper = injector.get('annotationMapper');
  });

  describe('#loadAnnotations()', function () {
    it('triggers the annotationLoaded event', function () {
      const annotations = [{ id: 1 }, { id: 2 }, { id: 3 }];
      annotationMapper.loadAnnotations(annotations);
      assert.called($rootScope.$broadcast);
      assert.calledWith($rootScope.$broadcast, events.ANNOTATIONS_LOADED, [
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);
    });

    it('also includes replies in the annotationLoaded event', function () {
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

    it('triggers the annotationUpdated event for each loaded annotation', function () {
      const annotations = immutable([{ id: 1 }, { id: 2 }, { id: 3 }]);
      store.addAnnotations(annotations);

      annotationMapper.loadAnnotations(annotations);
      assert.called($rootScope.$broadcast);
      assert.calledWith(
        $rootScope.$broadcast,
        events.ANNOTATION_UPDATED,
        annotations[0]
      );
    });

    it('also triggers annotationUpdated for cached replies', function () {
      const annotations = [{ id: 1 }];
      const replies = [{ id: 2 }, { id: 3 }, { id: 4 }];
      store.addAnnotations([{ id: 3 }]);

      annotationMapper.loadAnnotations(annotations, replies);
      assert(
        $rootScope.$broadcast.calledWith(events.ANNOTATION_UPDATED, { id: 3 })
      );
    });

    it('replaces the properties on the cached annotation with those from the loaded one', function () {
      const annotations = [{ id: 1, url: 'http://example.com' }];
      store.addAnnotations([{ id: 1, $tag: 'tag1' }]);

      annotationMapper.loadAnnotations(annotations);
      assert.called($rootScope.$broadcast);
      assert.calledWith($rootScope.$broadcast, events.ANNOTATION_UPDATED, {
        id: 1,
        url: 'http://example.com',
      });
    });

    it('excludes cached annotations from the annotationLoaded event', function () {
      const annotations = [{ id: 1, url: 'http://example.com' }];
      store.addAnnotations([{ id: 1, $tag: 'tag1' }]);

      annotationMapper.loadAnnotations(annotations);
      assert.called($rootScope.$broadcast);
      assert.calledWith($rootScope.$broadcast, events.ANNOTATIONS_LOADED, []);
    });
  });

  describe('#flagAnnotation()', function () {
    it('flags an annotation', function () {
      const ann = { id: 'test-id' };
      annotationMapper.flagAnnotation(ann);
      assert.calledOnce(fakeApi.annotation.flag);
      assert.calledWith(fakeApi.annotation.flag, { id: ann.id });
    });
  });

  describe('#createAnnotation()', function () {
    it('creates a new annotation resource', function () {
      const ann = {};
      const ret = annotationMapper.createAnnotation(ann);
      assert.equal(ret, ann);
    });

    it('emits the "beforeAnnotationCreated" event', function () {
      const ann = {};
      annotationMapper.createAnnotation(ann);
      assert.calledWith(
        $rootScope.$broadcast,
        events.BEFORE_ANNOTATION_CREATED,
        ann
      );
    });
  });

  describe('#deleteAnnotation', function () {
    beforeEach(() => {
      store.removeAnnotations = sinon.stub();
    });

    it('deletes the annotation on the server', function () {
      const ann = { id: 'test-id' };
      annotationMapper.deleteAnnotation(ann);
      assert.calledWith(fakeApi.annotation.delete, { id: 'test-id' });
    });

    it('removes the annotation from the store on success', async () => {
      const ann = {};
      await annotationMapper.deleteAnnotation(ann);
      assert.calledWith(store.removeAnnotations, [ann]);
    });

    it('does not remove the annotation from the store on error', () => {
      fakeApi.annotation.delete.returns(Promise.reject());
      const ann = { id: 'test-id' };
      return annotationMapper.deleteAnnotation(ann).catch(function () {
        assert.notCalled(store.removeAnnotations);
      });
    });
  });
});
