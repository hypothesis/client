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

  describe('#loadAnnotations', function () {
    it('adds annotations and replies to the store', () => {
      store.addAnnotations = sinon.stub();
      const annotations = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const replies = [{ id: 4 }];

      annotationMapper.loadAnnotations(annotations, replies);

      assert.calledWith(store.addAnnotations, [...annotations, ...replies]);
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
