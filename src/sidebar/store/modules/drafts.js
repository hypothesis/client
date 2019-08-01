'use strict';

const metadata = require('../../util/annotation-metadata');
const util = require('../util');

/**
 * The drafts store provides temporary storage for unsaved edits to new or
 * existing annotations.
 */

function init() {
  return {
    drafts: [],
  };
}

/**
 * Helper class to encapsulate the draft properties and a few simple methods.
 *
 *  A draft consists of:
 *
 * 1. `annotation` which is the original annotation object which the
 *    draft is associated with. If this is just a draft, then this may
 *    not have an id yet and instead, $tag is used.
 *
 * 2. `isPrivate` (boolean), `tags` (array of objects) and `text` (string)
 *    which are the user's draft changes to the annotation. These are returned
 *    from the drafts store selector by `drafts.getDraft()`.
 */
class Draft {
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

/* Reducer */

const update = {
  DISCARD_ALL_DRAFTS: function() {
    return {
      drafts: [],
    };
  },
  REMOVE_DRAFT: function(state, action) {
    const drafts = state.drafts.filter(draft => {
      return !draft.match(action.annotation);
    });
    return {
      drafts,
    };
  },
  UPDATE_DRAFT: function(state, action) {
    // removes a matching existing draft, then adds
    const drafts = state.drafts.filter(draft => {
      return !draft.match(action.draft.annotation);
    });
    drafts.push(action.draft); // push ok since its a copy
    return {
      drafts,
    };
  },
};

const actions = util.actionTypes(update);

/* Actions */

/**
 * Create or update the draft version for a given annotation by
 * replacing any existing draft or simply creating a new one.
 */
function createDraft(annotation, changes) {
  return {
    type: actions.UPDATE_DRAFT,
    draft: new Draft(annotation, changes),
  };
}

/**
 * Remove any drafts that are empty.
 *
 * An empty draft has no text and no reference tags.
 */

function deleteNewAndEmptyDrafts() {
  const annotations = require('./annotations');
  return (dispatch, getState) => {
    const newDrafts = getState().drafts.filter(draft => {
      return (
        metadata.isNew(draft.annotation) &&
        !getDraftIfNotEmpty(getState(), draft.annotation)
      );
    });
    const removedAnnotations = newDrafts.map(draft => {
      dispatch(removeDraft(draft.annotation));
      return draft.annotation;
    });
    dispatch(annotations.actions.removeAnnotations(removedAnnotations));
  };
}

/**
 * Remove all drafts.
 * */
function discardAllDrafts() {
  return {
    type: actions.DISCARD_ALL_DRAFTS,
  };
}

/**
 * Remove the draft version of an annotation.
 */
function removeDraft(annotation) {
  return {
    type: actions.REMOVE_DRAFT,
    annotation,
  };
}

/* Selectors */

/**
 * Returns the number of drafts - both unsaved new annotations, and unsaved
 * edits to saved annotations - currently stored.
 *
 * @return {number}
 */
function countDrafts(state) {
  return state.drafts.length;
}

/**
 * Retrieve the draft changes for an annotation.
 *
 * @return {Draft|null}
 */
function getDraft(state, annotation) {
  for (let i = 0; i < state.drafts.length; i++) {
    const draft = state.drafts[i];
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
 * @return {Draft|null}
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
 *
 * @return {Object[]}
 */
function unsavedAnnotations(state) {
  return state.drafts
    .filter(draft => !draft.annotation.id)
    .map(draft => draft.annotation);
}

module.exports = {
  init,
  update,
  actions: {
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
  Draft,
};
