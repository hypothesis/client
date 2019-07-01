'use strict';

/**
 * Store module which tracks activity happening in the application that may
 * need to be reflected in the UI.
 */

const { actionTypes } = require('../util');

function init() {
  return {
    activity: {
      /**
       * The number of API requests that have started and not yet completed.
       */
      activeApiRequests: 0,
      /**
       * The number of annotation fetches that have started and not yet completed.
       */
      activeAnnotationFetches: 0,
    },
  };
}

const update = {
  API_REQUEST_STARTED(state) {
    const { activity } = state;
    return {
      activity: {
        ...activity,
        activeApiRequests: activity.activeApiRequests + 1,
      },
    };
  },

  API_REQUEST_FINISHED(state) {
    const { activity } = state;
    if (activity.activeApiRequests === 0) {
      throw new Error(
        'API_REQUEST_FINISHED action when no requests were active'
      );
    }

    return {
      activity: {
        ...activity,
        activeApiRequests: activity.activeApiRequests - 1,
      },
    };
  },

  ANNOTATION_FETCH_STARTED(state) {
    const { activity } = state;
    return {
      activity: {
        ...activity,
        activeAnnotationFetches: activity.activeAnnotationFetches + 1,
      },
    };
  },

  ANNOTATION_FETCH_FINISHED(state) {
    const { activity } = state;
    if (activity.activeAnnotationFetches === 0) {
      throw new Error(
        'ANNOTATION_FETCH_FINISHED action when no annotation fetches were active'
      );
    }

    return {
      activity: {
        ...activity,
        activeAnnotationFetches: activity.activeAnnotationFetches - 1,
      },
    };
  },
};

const actions = actionTypes(update);

function apiRequestStarted() {
  return { type: actions.API_REQUEST_STARTED };
}

function apiRequestFinished() {
  return { type: actions.API_REQUEST_FINISHED };
}

function annotationFetchStarted() {
  return { type: actions.ANNOTATION_FETCH_STARTED };
}

function annotationFetchFinished() {
  return { type: actions.ANNOTATION_FETCH_FINISHED };
}

/**
 * Return true when any activity is happening in the app that needs to complete
 * before the UI will be idle.
 */
function isLoading(state) {
  return state.activity.activeApiRequests > 0;
}

/**
 * Return true when annotations are actively being fetched.
 */
function isFetchingAnnotations(state) {
  return state.activity.activeAnnotationFetches > 0;
}

module.exports = {
  init,
  update,

  actions: {
    apiRequestStarted,
    apiRequestFinished,
    annotationFetchStarted,
    annotationFetchFinished,
  },

  selectors: {
    isLoading,
    isFetchingAnnotations,
  },
};
