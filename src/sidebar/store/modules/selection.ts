import type { Dispatch } from 'redux';
import { createSelector } from 'reselect';

import type { Annotation } from '../../../types/api';
import type { SidebarSettings } from '../../../types/config';
import type { TabName } from '../../../types/sidebar';
import * as metadata from '../../helpers/annotation-metadata';
import { countIf, trueKeys, toTrueMap } from '../../util/collections';
import { createStoreModule, makeAction } from '../create-store';

type BooleanMap = Record<string, boolean>;
type SortKey = 'Location' | 'Newest' | 'Oldest';

/**
 * Default sort keys for each tab.
 */
const TAB_SORTKEY_DEFAULT: Record<TabName, SortKey> = {
  annotation: 'Location',
  note: 'Oldest',
  orphan: 'Location',
};

function initialSelection(settings: SidebarSettings): BooleanMap {
  const selection: BooleanMap = {};
  // TODO: Do not take into account existence of `settings.query` here
  // once root-thread-building is fully updated: the decision of whether
  // selection trumps any query is not one for the store to make
  if (settings.annotations && !settings.query) {
    selection[settings.annotations] = true;
  }
  return selection;
}

export type State = {
  /**
   * A set of annotations that are currently "selected" by the user —
   * these will supersede other filters/selections.
   */
  selected: BooleanMap;

  /**
   * Explicitly-expanded or -collapsed annotations (threads). A collapsed
   * annotation thread will not show its replies; an expanded thread will
   * show its replies. Note that there are other factors affecting
   * collapsed states, e.g., top-level threads are collapsed by default
   * until explicitly expanded.
   */
  expanded: BooleanMap;

  /**
   * Set of threads that have been "forced" visible by the user
   * (e.g. by clicking on "Show x more" button) even though they may not
   * match the currently-applied filters.
   */
  forcedVisible: BooleanMap;

  selectedTab: TabName;

  /**
   * Sort order for annotations.
   */
  sortKey: SortKey;

  /**
   * ID or tag of an annotation that should be given keyboard focus.
   */
  focusRequest: string | null;
};

function initialState(settings: SidebarSettings): State {
  return {
    selected: initialSelection(settings),
    expanded: initialSelection(settings),
    forcedVisible: {},
    selectedTab: 'annotation',
    sortKey: TAB_SORTKEY_DEFAULT.annotation,
    focusRequest: null,
  };
}

function setTab(newTab: TabName, oldTab: TabName) {
  // Do nothing if the "new tab" is the same as the tab already selected.
  // This will avoid resetting the `sortKey`, too.
  if (oldTab === newTab) {
    return {};
  }
  return {
    selectedTab: newTab,
    sortKey: TAB_SORTKEY_DEFAULT[newTab],
  };
}

const resetSelection = () => {
  return {
    forcedVisible: {},
    selected: {},
  };
};

const reducers = {
  CLEAR_ANNOTATION_FOCUS_REQUEST() {
    return { focusRequest: null };
  },

  CLEAR_SELECTION() {
    return resetSelection();
  },

  SELECT_ANNOTATIONS(state: State, action: { selection: BooleanMap }) {
    return { selected: action.selection };
  },

  SELECT_TAB(state: State, action: { tab: TabName }) {
    return setTab(action.tab, state.selectedTab);
  },

  SET_EXPANDED(state: State, action: { id: string; expanded: boolean }) {
    const newExpanded = { ...state.expanded };
    newExpanded[action.id] = action.expanded;
    return { expanded: newExpanded };
  },

  SET_ANNOTATION_FOCUS_REQUEST(state: State, action: { id: string }) {
    return { focusRequest: action.id };
  },

  SET_FORCED_VISIBLE(state: State, action: { id: string; visible: boolean }) {
    return {
      forcedVisible: { ...state.forcedVisible, [action.id]: action.visible },
    };
  },

  SET_SORT_KEY(state: State, action: { key: SortKey }) {
    return { sortKey: action.key };
  },

  TOGGLE_SELECTED_ANNOTATIONS(state: State, action: { toggleIds: string[] }) {
    const selection = { ...state.selected };
    action.toggleIds.forEach(id => {
      selection[id] = !selection[id];
    });
    return { selected: selection };
  },

  /** Actions defined in other modules */

  /**
   * Automatically select the Page Notes tab, for convenience, if all of the
   * top-level annotations in `action.annotations` are Page Notes and the
   * previous annotation count was 0 (i.e. collection empty).
   */
  ADD_ANNOTATIONS(
    state: State,
    action: { annotations: Annotation[]; currentAnnotationCount: number },
  ) {
    const topLevelAnnotations = action.annotations.filter(
      annotation => !metadata.isReply(annotation),
    );
    const noteCount = countIf(action.annotations, metadata.isPageNote);

    const haveOnlyPageNotes = noteCount === topLevelAnnotations.length;
    if (action.currentAnnotationCount === 0 && haveOnlyPageNotes) {
      return setTab('note', state.selectedTab);
    }
    return {};
  },

  CHANGE_FOCUS_MODE_USER() {
    return resetSelection();
  },

  SET_FILTER() {
    return { ...resetSelection(), expanded: {} };
  },

  SET_FILTER_QUERY() {
    return { ...resetSelection(), expanded: {} };
  },

  SET_FOCUS_MODE() {
    return resetSelection();
  },

  REMOVE_ANNOTATIONS(
    state: State,
    action: {
      annotationsToRemove: Annotation[];
      remainingAnnotations: Annotation[];
    },
  ) {
    let newTab = state.selectedTab;
    // If the orphans tab is selected but no remaining annotations are orphans,
    // switch back to annotations tab
    if (
      newTab === 'orphan' &&
      countIf(action.remainingAnnotations, metadata.isOrphan) === 0
    ) {
      newTab = 'annotation';
    }

    const removeAnns = (collection: BooleanMap) => {
      action.annotationsToRemove.forEach(annotation => {
        if (annotation.id) {
          delete collection[annotation.id];
        }
        if (annotation.$tag) {
          delete collection[annotation.$tag];
        }
      });
      return collection;
    };
    return {
      ...setTab(newTab, state.selectedTab),
      expanded: removeAnns({ ...state.expanded }),
      forcedVisible: removeAnns({ ...state.forcedVisible }),
      selected: removeAnns({ ...state.selected }),
    };
  },
};

/**
 * Clear all selected annotations and filters. This will leave user-focus
 * alone, however.
 */
function clearSelection() {
  return makeAction(reducers, 'CLEAR_SELECTION', undefined);
}

/**
 * Set the currently selected annotation IDs. This will replace the current
 * selection. All provided annotation ids will be set to `true` in the selection.
 *
 * @param ids - Identifiers of annotations to select
 */
function selectAnnotations(ids: string[]) {
  return (dispatch: Dispatch) => {
    dispatch(clearSelection());
    dispatch(
      makeAction(reducers, 'SELECT_ANNOTATIONS', { selection: toTrueMap(ids) }),
    );
  };
}

/**
 * Request the UI to give keyboard focus to a given annotation.
 *
 * Once the UI has processed this request, it should be cleared with
 * {@link clearAnnotationFocusRequest}.
 */
function setAnnotationFocusRequest(id: string) {
  return makeAction(reducers, 'SET_ANNOTATION_FOCUS_REQUEST', { id });
}

/**
 * Clear an annotation focus request created with {@link setAnnotationFocusRequest}.
 */
function clearAnnotationFocusRequest() {
  return makeAction(reducers, 'CLEAR_ANNOTATION_FOCUS_REQUEST', undefined);
}

/**
 * Set the currently-selected tab to `tabKey`.
 */
function selectTab(tabKey: TabName) {
  return makeAction(reducers, 'SELECT_TAB', { tab: tabKey });
}

/**
 * Set the expanded state for a single annotation/thread.
 *
 * @param id - annotation (or thread) id
 * @param expanded - `true` for expanded replies, `false` to collapse
 */
function setExpanded(id: string, expanded: boolean) {
  return makeAction(reducers, 'SET_EXPANDED', { id, expanded });
}

/**
 * A user may "force" an thread to be visible, even if it would be otherwise
 * not be visible because of applied filters. Set the force-visibility for a
 * single thread, without affecting other forced-visible threads.
 *
 * @param id - Thread id
 * @param visible - Should this annotation be visible, even if it conflicts
 *   with current filters?
 */
function setForcedVisible(id: string, visible: boolean) {
  return makeAction(reducers, 'SET_FORCED_VISIBLE', { id, visible });
}

/**
 * Sets the sort key for the annotation list.
 */
function setSortKey(key: SortKey) {
  return makeAction(reducers, 'SET_SORT_KEY', { key });
}

/**
 * Toggle the selected state for the annotations in `toggledAnnotations`:
 * unselect any that are selected; select any that are unselected.
 *
 * @param toggleIds - identifiers of annotations to toggle
 */
function toggleSelectedAnnotations(toggleIds: string[]) {
  return makeAction(reducers, 'TOGGLE_SELECTED_ANNOTATIONS', { toggleIds });
}

/**
 * Retrieve map of expanded/collapsed annotations (threads)
 */
function expandedMap(state: State) {
  return state.expanded;
}

function annotationFocusRequest(state: State) {
  return state.focusRequest;
}

const forcedVisibleThreads = createSelector(
  (state: State) => state.forcedVisible,
  forcedVisible => trueKeys(forcedVisible),
);

/**
 * Are any annotations currently selected?
 */
const hasSelectedAnnotations = createSelector(
  (state: State) => state.selected,
  selection => trueKeys(selection).length > 0,
);

const selectedAnnotations = createSelector(
  (state: State) => state.selected,
  selection => trueKeys(selection),
);

/**
 * Return the currently-selected tab
 */
function selectedTab(state: State) {
  return state.selectedTab;
}

const selectionState = createSelector(
  (state: State) => state,
  selection => {
    return {
      expanded: expandedMap(selection),
      forcedVisible: forcedVisibleThreads(selection),
      selected: selectedAnnotations(selection),
      sortKey: sortKey(selection),
      selectedTab: selectedTab(selection),
    };
  },
);

/**
 * Retrieve the current sort option key.
 */
function sortKey(state: State) {
  return state.sortKey;
}

/**
 * Retrieve applicable sort options for the currently-selected tab.
 */
const sortKeys = createSelector(
  (state: State) => state.selectedTab,
  selectedTab => {
    const sortKeysForTab: SortKey[] = ['Newest', 'Oldest'];
    if (selectedTab !== 'note') {
      // Location is inapplicable to Notes tab
      sortKeysForTab.push('Location');
    }
    return sortKeysForTab;
  },
);

export const selectionModule = createStoreModule(initialState, {
  namespace: 'selection',
  reducers,

  actionCreators: {
    clearAnnotationFocusRequest,
    clearSelection,
    selectAnnotations,
    selectTab,
    setAnnotationFocusRequest,
    setExpanded,
    setForcedVisible,
    setSortKey,
    toggleSelectedAnnotations,
  },

  selectors: {
    expandedMap,
    annotationFocusRequest,
    forcedVisibleThreads,
    hasSelectedAnnotations,
    selectedAnnotations,
    selectedTab,
    selectionState,
    sortKey,
    sortKeys,
  },
});
