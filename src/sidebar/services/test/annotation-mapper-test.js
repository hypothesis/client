import { Injector } from '../../../shared/injector';
import events from '../../events';
import annotationMapperFactory from '../annotation-mapper';

describe('annotationMapper', function () {
  let $rootScope;
  let fakeStore;
  let annotationMapper;

  beforeEach(function () {
    $rootScope = {
      $broadcast: sinon.stub(),
    };

    fakeStore = {
      addAnnotations: sinon.stub(),
      removeAnnotations: sinon.stub(),
    };

    const injector = new Injector()
      .register('$rootScope', { value: $rootScope })
      .register('store', { value: fakeStore })
      .register('annotationMapper', annotationMapperFactory);
    annotationMapper = injector.get('annotationMapper');
  });

  describe('#loadAnnotations', function () {
    it('adds annotations and replies to the store', () => {
      const annotations = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const replies = [{ id: 4 }];

      annotationMapper.loadAnnotations(annotations, replies);

      assert.calledWith(fakeStore.addAnnotations, [...annotations, ...replies]);
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
});
