/**
 * Store module which tracks activity happening in the application that may
 * need to be reflected in the UI.
 */
import { createStoreModule, makeAction } from '../create-store';

/** @typedef {import('../../../types/api').Annotation} Annotation */

const initialState = {
  /**
   * Annotation `$tag`s that correspond to annotations with active API requests
   *
   * @type {string[]}
   */
  activeAnnotationSaveRequests: [],
  /**
   * The number of API requests that have started and not yet completed.
   */
  activeApiRequests: 0,
  /**
   * The number of annotation fetches that have started and not yet completed.
   */
  activeAnnotationFetches: 0,
  /**
   * Have annotations ever been fetched?
   */
  hasFetchedAnnotations: false,
  /**
   * The number of total annotation results the service reported as
   * matching the most recent load/search request
   *
   * @type {number|null}
   */
  annotationResultCount: null,
};

/** @typedef {typeof initialState} State */

const reducers = {
  /** @param {State} state */
  API_REQUEST_STARTED(state) {
    return {
      ...state,
      activeApiRequests: state.activeApiRequests + 1,
    };
  },

  /** @param {State} state */
  API_REQUEST_FINISHED(state) {
    if (state.activeApiRequests === 0) {
      throw new Error(
        'API_REQUEST_FINISHED action when no requests were active'
      );
    }

    return {
      ...state,
      activeApiRequests: state.activeApiRequests - 1,
    };
  },

  /**
   * @param {State} state
   * @param {{ annotation: Annotation }} action
   */
  ANNOTATION_SAVE_STARTED(state, action) {
    let addToStarted = [];
    if (
      action.annotation.$tag &&
      !state.activeAnnotationSaveRequests.includes(action.annotation.$tag)
    ) {
      addToStarted.push(action.annotation.$tag);
    }
    const updatedSaves =
      state.activeAnnotationSaveRequests.concat(addToStarted);
    return {
      ...state,
      activeAnnotationSaveRequests: updatedSaves,
    };
  },

  /**
   * @param {State} state
   * @param {{ annotation: Annotation }} action
   */
  ANNOTATION_SAVE_FINISHED(state, action) {
    const updatedSaves = state.activeAnnotationSaveRequests.filter(
      $tag => $tag !== action.annotation.$tag
    );
    return {
      ...state,
      activeAnnotationSaveRequests: updatedSaves,
    };
  },

  /** @param {State} state */
  ANNOTATION_FETCH_STARTED(state) {
    return {
      ...state,
      activeAnnotationFetches: state.activeAnnotationFetches + 1,
    };
  },

  /** @param {State} state */
  ANNOTATION_FETCH_FINISHED(state) {
    if (state.activeAnnotationFetches === 0) {
      throw new Error(
        'ANNOTATION_FETCH_FINISHED action when no annotation fetches were active'
      );
    }

    return {
      ...state,
      hasFetchedAnnotations: true,
      activeAnnotationFetches: state.activeAnnotationFetches - 1,
    };
  },

  /**
   * @param {State} state
   * @param {{ resultCount: number }} action
   */
  SET_ANNOTATION_RESULT_COUNT(state, action) {
    return {
      annotationResultCount: action.resultCount,
    };
  },
};

function annotationFetchStarted() {
  return makeAction(reducers, 'ANNOTATION_FETCH_STARTED', undefined);
}

function annotationFetchFinished() {
  return makeAction(reducers, 'ANNOTATION_FETCH_FINISHED', undefined);
}

/**
 * @param {Annotation} annotation — annotation object with a `$tag` property
 */
function annotationSaveStarted(annotation) {
  return makeAction(reducers, 'ANNOTATION_SAVE_STARTED', { annotation });
}

/**
 * @param {Annotation} annotation — annotation object with a `$tag` property
 */
function annotationSaveFinished(annotation) {
  return makeAction(reducers, 'ANNOTATION_SAVE_FINISHED', { annotation });
}

function apiRequestStarted() {
  return makeAction(reducers, 'API_REQUEST_STARTED', undefined);
}

function apiRequestFinished() {
  return makeAction(reducers, 'API_REQUEST_FINISHED', undefined);
}

/** @param {number} resultCount */
function setAnnotationResultCount(resultCount) {
  return makeAction(reducers, 'SET_ANNOTATION_RESULT_COUNT', { resultCount });
}

/** Selectors */

/** @param {State} state */
function annotationResultCount(state) {
  return state.annotationResultCount;
}

/** @param {State} state */
function hasFetchedAnnotations(state) {
  return state.hasFetchedAnnotations;
}

/**
 * Return true when annotations are actively being fetched.
 *
 * @param {State} state
 */
function isFetchingAnnotations(state) {
  return state.activeAnnotationFetches > 0;
}

/**
 * Return true when any activity is happening in the app that needs to complete
 * before the UI is ready for interactivity with annotations.
 *
 * @param {State} state
 */
function isLoading(state) {
  return state.activeApiRequests > 0 || !state.hasFetchedAnnotations;
}

/**
 * Return `true` if `$tag` exists in the array of annotation `$tag`s that
 * have in-flight save requests, i.e. the annotation in question is actively
 * being saved to a remote service.
 *
 * @param {State} state
 * @param {Annotation} annotation
 */
function isSavingAnnotation(state, annotation) {
  if (!annotation.$tag) {
    return false;
  }
  return state.activeAnnotationSaveRequests.includes(annotation.$tag);
}

export const activityModule = createStoreModule(initialState, {
  reducers,
  namespace: 'activity',

  actionCreators: {
    annotationFetchStarted,
    annotationFetchFinished,
    annotationSaveStarted,
    annotationSaveFinished,
    apiRequestStarted,
    apiRequestFinished,
    setAnnotationResultCount,
  },

  selectors: {
    hasFetchedAnnotations,
    isLoading,
    isFetchingAnnotations,
    isSavingAnnotation,
    annotationResultCount,
  },
});
