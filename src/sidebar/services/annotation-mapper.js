import events from '../events';

// Legacy service for making annotations API requests and emitting events /
// updating the store afterwards. This is being removed.
//
// @ngInject
export default function annotationMapper($rootScope) {
  function createAnnotation(annotation) {
    $rootScope.$broadcast(events.BEFORE_ANNOTATION_CREATED, annotation);
    return annotation;
  }

  return {
    createAnnotation: createAnnotation,
  };
}
