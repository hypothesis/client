import { createSelector } from 'reselect';

import * as metadata from '../../helpers/annotation-metadata';
import { createStoreModule, makeAction } from '../create-store';
import { removeAnnotations } from './annotations';

/** @typedef {import('../../../types/api').Annotation} Annotation */

/**
 * The drafts store provides temporary storage for unsaved edits to new or
 * existing annotations.
 */

/** @type {Draft[]} */
const initialState = [];

/** @typedef {typeof initialState} State */

/**
 * @typedef {Pick<Annotation, 'id'|'$tag'>} AnnotationID
 */

/**
 * Edits made to a new or existing annotation by a user.
 *
 * @typedef DraftChanges
 * @prop {boolean} isPrivate
 * @prop {string[]} tags
 * @prop {string} text
 */

/**
 * An unsaved set of changes to an annotation.
 *
 * This consists of an annotation ID ({@link AnnotationID}) and the edits
 * ({@link DraftChanges}) made by the user.
 */
export class Draft {
  /**
   * @param {AnnotationID} annotation
   * @param {DraftChanges} changes
   */
  constructor(annotation, changes) {
    this.annotation = { id: annotation.id, $tag: annotation.$tag };
    this.isPrivate = changes.isPrivate;
    this.tags = changes.tags;
    this.text = changes.text;
  }
  /**
   * Returns true if this draft matches a given annotation.
   *
   * Annotations are matched by ID or local tag.
   *
   * @param {AnnotationID} annotation
   */
  match(annotation) {
    return (
      (this.annotation.$tag && annotation.$tag === this.annotation.$tag) ||
      (this.annotation.id && annotation.id === this.annotation.id)
    );
  }
  /**
   * Return true if this draft is empty and can be discarded without losing
   * any user input.
   */
  isEmpty() {
    return !this.text && this.tags.length === 0;
  }
}

const reducers = {
  DISCARD_ALL_DRAFTS() {
    return [];
  },

  /**
   * @param {State} state
   * @param {{ annotation: AnnotationID }} action
   */
  REMOVE_DRAFT(state, action) {
    const drafts = state.filter(draft => {
      return !draft.match(action.annotation);
    });
    return drafts;
  },

  /**
   * @param {State} state
   * @param {{ draft: Draft }} action
   */
  UPDATE_DRAFT(state, action) {
    // removes a matching existing draft, then adds
    const drafts = state.filter(draft => {
      return !draft.match(action.draft.annotation);
    });
    drafts.push(action.draft); // push ok since its a copy
    return drafts;
  },
};

/**
 * Create or update the draft version for a given annotation by
 * replacing any existing draft or simply creating a new one.
 *
 * @param {AnnotationID} annotation
 * @param {DraftChanges} changes
 */
function createDraft(annotation, changes) {
  return makeAction(reducers, 'UPDATE_DRAFT', {
    draft: new Draft(annotation, changes),
  });
}

/**
 * Remove any drafts that are empty.
 *
 * An empty draft has no text and no reference tags.
 */
function deleteNewAndEmptyDrafts() {
  return (dispatch, getState) => {
    const newDrafts = getState().drafts.filter(draft => {
      return (
        metadata.isNew(draft.annotation) &&
        !getDraftIfNotEmpty(getState().drafts, draft.annotation)
      );
    });
    const removedAnnotations = newDrafts.map(draft => {
      dispatch(removeDraft(draft.annotation));
      return draft.annotation;
    });
    dispatch(removeAnnotations(removedAnnotations));
  };
}

/**
 * Remove all drafts.
 */
function discardAllDrafts() {
  return makeAction(reducers, 'DISCARD_ALL_DRAFTS', undefined);
}

/**
 * Remove the draft version of an annotation.
 *
 * @param {AnnotationID} annotation
 */
function removeDraft(annotation) {
  return makeAction(reducers, 'REMOVE_DRAFT', { annotation });
}

/**
 * Returns the number of drafts - both unsaved new annotations, and unsaved
 * edits to saved annotations - currently stored.
 *
 * @param {State} state
 */
function countDrafts(state) {
  return state.length;
}

/**
 * Retrieve the draft changes for an annotation.
 *
 * @param {State} state
 * @param {AnnotationID} annotation
 */
function getDraft(state, annotation) {
  const drafts = state;
  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i];
    if (draft.match(annotation)) {
      return draft;
    }
  }

  return null;
}

/**
 * Returns the draft changes for an annotation, or null if no draft exists
 * or the draft is empty.
 *
 * @param {State} state
 * @param {AnnotationID} annotation
 */
function getDraftIfNotEmpty(state, annotation) {
  const draft = getDraft(state, annotation);
  if (!draft) {
    return null;
  }
  return draft.isEmpty() ? null : draft;
}

/**
 * Returns a list of draft annotations which have no id.
 */
const unsavedAnnotations = createSelector(
  /** @param {State} state */
  state => state,
  drafts => drafts.filter(d => !d.annotation.id).map(d => d.annotation)
);

export const draftsModule = createStoreModule(initialState, {
  namespace: 'drafts',
  reducers,
  actionCreators: {
    createDraft,
    deleteNewAndEmptyDrafts,
    discardAllDrafts,
    removeDraft,
  },

  selectors: {
    countDrafts,
    getDraft,
    getDraftIfNotEmpty,
    unsavedAnnotations,
  },
});
