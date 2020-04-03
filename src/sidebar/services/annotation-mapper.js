import events from '../events';

// Legacy service for making annotations API requests and emitting events /
// updating the store afterwards. This is being removed.
//
// @ngInject
export default function annotationMapper($rootScope, store, api) {
  function loadAnnotations(annotations, replies = []) {
    store.addAnnotations([...annotations, ...replies]);
  }

  function createAnnotation(annotation) {
    $rootScope.$broadcast(events.BEFORE_ANNOTATION_CREATED, annotation);
    return annotation;
  }

  function deleteAnnotation(annotation) {
    return api.annotation
      .delete({
        id: annotation.id,
      })
      .then(function () {
        store.removeAnnotations([annotation]);
        return annotation;
      });
  }

  function flagAnnotation(annot) {
    return api.annotation
      .flag({
        id: annot.id,
      })
      .then(function () {
        return annot;
      });
  }

  return {
    loadAnnotations: loadAnnotations,
    createAnnotation: createAnnotation,
    deleteAnnotation: deleteAnnotation,
    flagAnnotation: flagAnnotation,
  };
}
