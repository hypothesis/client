import { Injector } from '../../../shared/injector';
import events from '../../events';
import annotationMapperFactory from '../annotation-mapper';

describe('annotationMapper', function () {
  let $rootScope;
  let annotationMapper;

  beforeEach(function () {
    $rootScope = {
      $broadcast: sinon.stub(),
    };

    const injector = new Injector()
      .register('$rootScope', { value: $rootScope })
      .register('annotationMapper', annotationMapperFactory);
    annotationMapper = injector.get('annotationMapper');
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
