'use strict';

const angular = require('angular');

const events = require('../events');

function getExistingAnnotation(store, id) {
  return store.getState().annotations.find(function(annot) {
    return annot.id === id;
  });
}

// Wraps the annotation store to trigger events for the CRUD actions
// @ngInject
function annotationMapper($rootScope, store, api) {
  function loadAnnotations(annotations, replies) {
    annotations = annotations.concat(replies || []);

    const loaded = [];
    annotations.forEach(function(annotation) {
      const existing = getExistingAnnotation(store, annotation.id);
      if (existing) {
        $rootScope.$broadcast(events.ANNOTATION_UPDATED, annotation);
        return;
      }
      loaded.push(annotation);
    });

    $rootScope.$broadcast(events.ANNOTATIONS_LOADED, loaded);
  }

  function unloadAnnotations(annotations) {
    const unloaded = annotations.map(function(annotation) {
      const existing = getExistingAnnotation(store, annotation.id);
      if (existing && annotation !== existing) {
        annotation = angular.copy(annotation, existing);
      }
      return annotation;
    });
    $rootScope.$broadcast(events.ANNOTATIONS_UNLOADED, unloaded);
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
      .then(function() {
        $rootScope.$broadcast(events.ANNOTATION_DELETED, annotation);
        return annotation;
      });
  }

  function flagAnnotation(annot) {
    return api.annotation
      .flag({
        id: annot.id,
      })
      .then(function() {
        $rootScope.$broadcast(events.ANNOTATION_FLAGGED, annot);
        return annot;
      });
  }

  return {
    loadAnnotations: loadAnnotations,
    unloadAnnotations: unloadAnnotations,
    createAnnotation: createAnnotation,
    deleteAnnotation: deleteAnnotation,
    flagAnnotation: flagAnnotation,
  };
}

module.exports = annotationMapper;
