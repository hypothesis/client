/**
 * The drafts store provides temporary storage for unsaved edits to new or
 * existing annotations.
 */
import type { ThunkDispatch } from 'redux-thunk';
import { createSelector } from 'reselect';

import type { Annotation } from '../../../types/api';
import { createStoreModule, makeAction } from '../create-store';
import { removeAnnotations } from './annotations';

type AnnotationID = Pick<Annotation, 'id' | '$tag'>;

/**
 * Edits made to a new or existing annotation by a user.
 *
 */
type DraftChanges = {
  isPrivate: boolean;
  tags: string[];
  text: string;

  /** Description of what was selected, for image annotations. */
  description?: string;
};

/**
 * An unsaved set of changes to an annotation.
 *
 * This consists of an annotation ID ({@link AnnotationID}) and the edits
 * ({@link DraftChanges}) made by the user.
 */
export class Draft {
  annotation: AnnotationID;
  isPrivate: boolean;
  tags: string[];
  text: string;
  description?: string;

  constructor(annotation: AnnotationID, changes: DraftChanges) {
    this.annotation = { id: annotation.id, $tag: annotation.$tag };
    this.isPrivate = changes.isPrivate;
    this.tags = changes.tags;
    this.text = changes.text;
    this.description = changes.description;
  }
  /**
   * Returns true if this draft matches a given annotation.
   *
   * Annotations are matched by ID or local tag.
   */
  match(annotation: AnnotationID) {
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
    return !this.text && this.tags.length === 0 && !this.description;
  }
}

export type State = {
  drafts: Draft[];
};

const initialState: State = {
  drafts: [],
};

const LOAD_DRAFTS_FROM_STORAGE = 'LOAD_DRAFTS_FROM_STORAGE';

const reducers = {
  DISCARD_ALL_DRAFTS() {
    return { drafts: [] };
  },

  // Action to load drafts from storage.
  // The payload is expected to be an array of objects that look like Drafts.
  [LOAD_DRAFTS_FROM_STORAGE](
    state: State,
    action: { payload: Partial<Draft>[] },
  ) {
    if (!action.payload || !Array.isArray(action.payload)) {
      return state;
    }
    const loadedDrafts = action.payload
      .map(plainDraft => {
        // Ensure the plainDraft has the necessary structure.
        // The Draft constructor expects `annotation` and `changes` (which includes isPrivate, tags, text, description).
        // If plainDraft directly matches DraftChanges and has an annotation property, it can be used.
        if (
          plainDraft.annotation &&
          typeof plainDraft.isPrivate === 'boolean' &&
          Array.isArray(plainDraft.tags) &&
          typeof plainDraft.text === 'string'
        ) {
          // Re-construct Draft instances to ensure they have methods.
          // The second argument to Draft constructor is DraftChanges.
          // plainDraft itself contains these properties.
          return new Draft(plainDraft.annotation, {
            isPrivate: plainDraft.isPrivate,
            tags: plainDraft.tags,
            text: plainDraft.text,
            description: plainDraft.description,
          });
        }
        return null; // Or handle error, log warning
      })
      .filter((draft): draft is Draft => draft !== null); // Filter out any nulls from malformed data

    // Merge with existing drafts if necessary, or replace.
    // For simplicity, this replaces existing drafts if any were loaded.
    // Consider a merging strategy if drafts could be created before storage loads.
    return { drafts: loadedDrafts.length > 0 ? loadedDrafts : state.drafts };
  },

  REMOVE_DRAFT(state: State, action: { annotation: AnnotationID }) {
    const drafts = state.drafts.filter(draft => {
      return !draft.match(action.annotation);
    });
    return { drafts };
  },

  UPDATE_DRAFT(state: State, action: { draft: Draft }) {
    // removes a matching existing draft, then adds
    const drafts = state.drafts.filter(draft => {
      return !draft.match(action.draft.annotation);
    });
    drafts.push(action.draft); // push ok since it's a copy
    return { drafts };
  },
};

// Action creator for loading drafts from storage
// This is not strictly needed if DraftPersistenceService dispatches plain objects
// with type and payload, but can be useful for consistency or if specific
// payload processing is needed before the reducer.
function loadDraftsFromStorage(persistedDrafts: Partial<Draft>[]) {
  return {
    type: LOAD_DRAFTS_FROM_STORAGE,
    payload: persistedDrafts,
  };
};

/**
 * Create or update the draft version for a given annotation by
 * replacing any existing draft or simply creating a new one.
 */
function createDraft(annotation: AnnotationID, changes: DraftChanges) {
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
  return (
    dispatch: ThunkDispatch<{ drafts: State }, void, any>,
    getState: () => { drafts: State },
  ) => {
    const newDrafts = getState().drafts.drafts.filter(draft => {
      return (
        !draft.annotation.id &&
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
 */
function removeDraft(annotation: AnnotationID) {
  return makeAction(reducers, 'REMOVE_DRAFT', { annotation });
}

/**
 * Returns the number of drafts - both unsaved new annotations, and unsaved
 * edits to saved annotations - currently stored.
 */
function countDrafts(state: State) {
  return state.drafts.length;
}

/**
 * Retrieve the draft changes for an annotation.
 */
function getDraft(state: State, annotation: AnnotationID) {
  const drafts = state.drafts;
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
 */
function getDraftIfNotEmpty(state: State, annotation: AnnotationID) {
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
  (state: State) => state.drafts,
  (drafts: Draft[]) =>
    drafts.filter(d => !d.annotation.id).map(d => d.annotation),
);

export const draftsModule = createStoreModule(initialState, {
  namespace: 'drafts',
  reducers,
  actionCreators: {
    createDraft,
    deleteNewAndEmptyDrafts,
    discardAllDrafts,
    removeDraft,
    loadDraftsFromStorage, // Add the new action creator
  },

  // Expose action type for DraftPersistenceService
  actionTypes: {
    LOAD_DRAFTS_FROM_STORAGE,
  },

  selectors: {
    countDrafts,
    getDraft,
    getDraftIfNotEmpty,
    unsavedAnnotations,
  },
});
