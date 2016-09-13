'use strict';

/**
 * AnnotationUI provides the central store of UI state for the application,
 * using [Redux](http://redux.js.org/).
 *
 * Redux is used to provide a predictable way of updating UI state and
 * responding to UI state changes.
 */

var immutable = require('seamless-immutable');
var redux = require('redux');

var metadata = require('./annotation-metadata');
var uiConstants = require('./ui-constants');
var arrayUtil = require('./util/array-util');

/**
 * Default starting tab.
 */
var TAB_DEFAULT = uiConstants.TAB_ANNOTATIONS;

/**
 * Default sort keys for each tab.
 */
var TAB_SORTKEY_DEFAULT = {};
TAB_SORTKEY_DEFAULT[uiConstants.TAB_ANNOTATIONS] = 'Location';
TAB_SORTKEY_DEFAULT[uiConstants.TAB_NOTES] = 'Oldest';
TAB_SORTKEY_DEFAULT[uiConstants.TAB_ORPHANS] = 'Location';

/**
 * Available sort keys for each tab.
 */
var TAB_SORTKEYS_AVAILABLE = {};
TAB_SORTKEYS_AVAILABLE[uiConstants.TAB_ANNOTATIONS] = ['Newest', 'Oldest', 'Location'];
TAB_SORTKEYS_AVAILABLE[uiConstants.TAB_NOTES] = ['Newest', 'Oldest'];
TAB_SORTKEYS_AVAILABLE[uiConstants.TAB_ORPHANS] = ['Newest', 'Oldest', 'Location'];

function freeze(selection) {
  if (Object.keys(selection).length) {
    return immutable(selection);
  } else {
    return null;
  }
}

function toSet(list) {
  return list.reduce(function (set, key) {
    set[key] = true;
    return set;
  }, {});
}

function initialSelection(settings) {
  var selection = {};
  if (settings.annotations) {
    selection[settings.annotations] = true;
  }
  return freeze(selection);
}

function initialState(settings) {
  return Object.freeze({
    // Flag that indicates whether the app is the sidebar and connected to
    // a page where annotations are being shown in context
    isSidebar: true,

    // List of all loaded annotations
    annotations: [],

    visibleHighlights: false,

    // Contains a map of annotation tag:true pairs.
    focusedAnnotationMap: null,

    // Contains a map of annotation id:true pairs.
    selectedAnnotationMap: initialSelection(settings),

    // Map of annotation IDs to expanded/collapsed state. For annotations not
    // present in the map, the default state is used which depends on whether
    // the annotation is a top-level annotation or a reply, whether it is
    // selected and whether it matches the current filter.
    expanded: initialSelection(settings) || {},

    // Set of IDs of annotations that have been explicitly shown
    // by the user even if they do not match the current search filter
    forceVisible: {},

    // IDs of annotations that should be highlighted
    highlighted: [],

    filterQuery: null,

    selectedTab: TAB_DEFAULT,

    // Key by which annotations are currently sorted.
    sortKey: TAB_SORTKEY_DEFAULT[TAB_DEFAULT],
    // Keys by which annotations can be sorted.
    sortKeysAvailable: TAB_SORTKEYS_AVAILABLE[TAB_DEFAULT],
  });
}

var types = {
  CLEAR_SELECTION: 'CLEAR_SELECTION',
  SELECT_ANNOTATIONS: 'SELECT_ANNOTATIONS',
  FOCUS_ANNOTATIONS: 'FOCUS_ANNOTATIONS',
  HIGHLIGHT_ANNOTATIONS: 'HIGHLIGHT_ANNOTATIONS',
  SET_HIGHLIGHTS_VISIBLE: 'SET_HIGHLIGHTS_VISIBLE',
  SET_FORCE_VISIBLE: 'SET_FORCE_VISIBLE',
  SET_EXPANDED: 'SET_EXPANDED',
  ADD_ANNOTATIONS: 'ADD_ANNOTATIONS',
  REMOVE_ANNOTATIONS: 'REMOVE_ANNOTATIONS',
  CLEAR_ANNOTATIONS: 'CLEAR_ANNOTATIONS',
  SET_FILTER_QUERY: 'SET_FILTER_QUERY',
  SET_SORT_KEY: 'SET_SORT_KEY',
  SELECT_TAB: 'SELECT_TAB',
  /**
   * Update an annotation's status flags after attempted anchoring in the
   * document completes.
   */
  UPDATE_ANCHOR_STATUS: 'UPDATE_ANCHOR_STATUS',
  /**
   * Set whether the app is the sidebar or not.
   *
   * When not in the sidebar, we do not expect annotations to anchor and always
   * display all annotations, rather than only those in the current tab.
   */
  SET_SIDEBAR: 'SET_SIDEBAR',
};

/**
 * Return a copy of `current` with all matching annotations in `annotations`
 * removed.
 */
function excludeAnnotations(current, annotations) {
  var ids = {};
  var tags = {};
  annotations.forEach(function (annot) {
    if (annot.id) {
      ids[annot.id] = true;
    }
    if (annot.$$tag) {
      tags[annot.$$tag] = true;
    }
  });
  return current.filter(function (annot) {
    var shouldRemove = (annot.id && (annot.id in ids)) ||
                       (annot.$$tag && (annot.$$tag in tags));
    return !shouldRemove;
  });
}

function findByID(annotations, id) {
  return annotations.find(function (annot) {
    return annot.id === id;
  });
}

function findByTag(annotations, tag) {
  return annotations.find(function (annot) {
    return annot.$$tag === tag;
  });
}

/**
 * Initialize the status flags and properties of a new annotation.
 */
function initializeAnnot(annotation) {
  if (annotation.id) {
    return annotation;
  }

  // Currently the user ID, permissions and group of new annotations are
  // initialized in the <annotation> component controller because the session
  // state and focused group are not stored in the Redux store. Once they are,
  // that initialization should be moved here.

  return Object.assign({}, annotation, {
    // Copy $$tag explicitly because it is non-enumerable
    $$tag: annotation.$$tag,
    // New annotations must be anchored
    $orphan: false,
  });
}


/**
 * Return state updates necessary to select a different tab.
 *
 * This function accepts the name of a tab and returns an object which must be
 * merged into the current state to achieve the desired tab change.
 */
function selectTab(newTab) {
  // Do nothing if the "new tab" is not a valid tab.
  if ([uiConstants.TAB_ANNOTATIONS,
       uiConstants.TAB_NOTES,
       uiConstants.TAB_ORPHANS].indexOf(newTab) === -1) {
    return {};
  }
  return {
    selectedTab: newTab,
    sortKey: TAB_SORTKEY_DEFAULT[newTab],
    sortKeysAvailable: TAB_SORTKEYS_AVAILABLE[newTab],
  };
}


function annotationsReducer(state, action) {
  switch (action.type) {
  case types.ADD_ANNOTATIONS:
    {
      var updatedIDs = {};
      var updatedTags = {};

      var added = [];
      var unchanged = [];
      var updated = [];

      action.annotations.forEach(function (annot) {
        var existing;
        if (annot.id) {
          existing = findByID(state.annotations, annot.id);
        }
        if (!existing && annot.$$tag) {
          existing = findByTag(state.annotations, annot.$$tag);
        }

        if (existing) {
          // Merge the updated annotation with the private fields from the local
          // annotation
          updated.push(Object.assign({}, existing, annot));
          if (annot.id) {
            updatedIDs[annot.id] = true;
          }
          if (existing.$$tag) {
            updatedTags[existing.$$tag] = true;
          }
        } else {
          added.push(initializeAnnot(annot));
        }
      });

      state.annotations.forEach(function (annot) {
        if (!updatedIDs[annot.id] && !updatedTags[annot.$$tag]) {
          unchanged.push(annot);
        }
      });

      return Object.assign({}, state, {
        annotations: added.concat(updated).concat(unchanged),
      });
    }
  case types.REMOVE_ANNOTATIONS:
    {
      var annots = excludeAnnotations(state.annotations, action.annotations);
      var selectedTab = state.selectedTab;
      if (selectedTab === uiConstants.TAB_ORPHANS &&
          arrayUtil.countIf(annots, metadata.isOrphan) === 0) {
        selectedTab = uiConstants.TAB_ANNOTATIONS;
      }
      return Object.assign(
        {},
        state,
        {annotations: annots},
        selectTab(selectedTab)
      );
    }
  case types.CLEAR_ANNOTATIONS:
    return Object.assign({}, state, {annotations: []});
  case types.UPDATE_ANCHOR_STATUS:
    {
      var annotations = state.annotations.map(function (annot) {
        var match = (annot.id && annot.id === action.id) ||
                    (annot.$$tag && annot.$$tag === action.tag);
        if (match) {
          return Object.assign({}, annot, {
            $orphan: action.isOrphan,
            $$tag: action.tag,
          });
        } else {
          return annot;
        }
      });
      return Object.assign({}, state, {annotations: annotations});
    }
  default:
    return state;
  }
}

function reducer(state, action) {
  /*jshint maxcomplexity: false*/
  state = annotationsReducer(state, action);

  switch (action.type) {
  case types.CLEAR_SELECTION:
    return Object.assign({}, state, {
      filterQuery: null,
      selectedAnnotationMap: null,
    });
  case types.SELECT_ANNOTATIONS:
    return Object.assign({}, state, {selectedAnnotationMap: action.selection});
  case types.FOCUS_ANNOTATIONS:
    return Object.assign({}, state, {focusedAnnotationMap: action.focused});
  case types.SET_HIGHLIGHTS_VISIBLE:
    return Object.assign({}, state, {visibleHighlights: action.visible});
  case types.SET_FORCE_VISIBLE:
    return Object.assign({}, state, {forceVisible: action.forceVisible});
  case types.SET_EXPANDED:
    return Object.assign({}, state, {expanded: action.expanded});
  case types.HIGHLIGHT_ANNOTATIONS:
    return Object.assign({}, state, {highlighted: action.highlighted});
  case types.SELECT_TAB:
    return Object.assign({}, state, selectTab(action.tab));
  case types.SET_FILTER_QUERY:
    return Object.assign({}, state, {
      filterQuery: action.query,
      forceVisible: {},
      expanded: {},
    });
  case types.SET_SIDEBAR:
    return Object.assign({}, state, {isSidebar: action.isSidebar});
  case types.SET_SORT_KEY:
    return Object.assign({}, state, {sortKey: action.key});
  default:
    return state;
  }
}

/**
 * Redux middleware which triggers an Angular change-detection cycle
 * if no cycle is currently in progress.
 *
 * This ensures that Angular UI components are updated after the UI
 * state changes in response to external inputs (eg. WebSocket messages,
 * messages arriving from other frames in the page, async network responses).
 *
 * See http://redux.js.org/docs/advanced/Middleware.html
 */
function angularDigestMiddleware($rootScope) {
  return function (next) {
    return function (action) {
      next(action);

      // '$$phase' is set if Angular is in the middle of a digest cycle already
      if (!$rootScope.$$phase) {
        // $applyAsync() is similar to $apply() but provides debouncing.
        // See http://stackoverflow.com/questions/30789177
        $rootScope.$applyAsync(function () {});
      }
    };
  };
}

/**
 * Stores the UI state of the annotator in connected clients.
 *
 * This includes:
 * - The IDs of annotations that are currently selected or focused
 * - The state of the bucket bar
 */
// @ngInject
module.exports = function ($rootScope, settings) {
  var enhancer = redux.applyMiddleware(
    angularDigestMiddleware.bind(null, $rootScope)
  );
  var store = redux.createStore(reducer, initialState(settings), enhancer);

  function select(annotations) {
    store.dispatch({
      type: types.SELECT_ANNOTATIONS,
      selection: freeze(annotations),
    });
  }

  function findByID(id) {
    return store.getState().annotations.find(function (annot) {
      return annot.id === id;
    });
  }

  return {
    /**
     * Return the current UI state of the sidebar. This should not be modified
     * directly but only though the helper methods below.
     */
    getState: store.getState,

    /** Listen for changes to the UI state of the sidebar. */
    subscribe: store.subscribe,

    /**
     * Sets whether annotation highlights in connected documents are shown
     * or not.
     */
    setShowHighlights: function (show) {
      store.dispatch({
        type: types.SET_HIGHLIGHTS_VISIBLE,
        visible: show,
      });
    },

    /**
     * Sets which annotations are currently focused.
     *
     * @param {Array<string>} Tags of annotations to focus
     */
    focusAnnotations: function (tags) {
      store.dispatch({
        type: types.FOCUS_ANNOTATIONS,
        focused: freeze(toSet(tags)),
      });
    },

    /**
     * Return true if any annotations are currently selected.
     */
    hasSelectedAnnotations: function () {
      return !!store.getState().selectedAnnotationMap;
    },

    /**
     * Sets whether replies to the annotation with ID `id` are collapsed.
     *
     * @param {string} id - Annotation ID
     * @param {boolean} collapsed
     */
    setCollapsed: function (id, collapsed) {
      var expanded = Object.assign({}, store.getState().expanded);
      expanded[id] = !collapsed;
      store.dispatch({
        type: types.SET_EXPANDED,
        expanded: expanded,
      });
    },

    /**
     * Sets whether a given annotation should be visible, even if it does not
     * match the current search query.
     *
     * @param {string} id - Annotation ID
     * @param {boolean} visible
     */
    setForceVisible: function (id, visible) {
      var forceVisible = Object.assign({}, store.getState().forceVisible);
      forceVisible[id] = visible;
      store.dispatch({
        type: types.SET_FORCE_VISIBLE,
        forceVisible: forceVisible,
      });
    },

    /**
     * Returns true if the annotation with the given `id` is selected.
     */
    isAnnotationSelected: function (id) {
      return (store.getState().selectedAnnotationMap || {}).hasOwnProperty(id);
    },

    /**
     * Set the currently selected annotation IDs.
     */
    selectAnnotations: function (ids) {
      select(toSet(ids));
    },

    /** Toggle whether annotations are selected or not. */
    toggleSelectedAnnotations: function (ids) {
      var selection = Object.assign({}, store.getState().selectedAnnotationMap);
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if (selection[id]) {
          delete selection[id];
        } else {
          selection[id] = true;
        }
      }
      select(selection);
    },

    /** De-select an annotation. */
    removeSelectedAnnotation: function (id) {
      var selection = Object.assign({}, store.getState().selectedAnnotationMap);
      if (!selection || !id) {
        return;
      }
      delete selection[id];
      select(selection);
    },

    /** De-select all annotations. */
    clearSelectedAnnotations: function () {
      store.dispatch({type: 'CLEAR_SELECTION'});
    },

    /** Add annotations to the currently displayed set. */
    addAnnotations: function (annotations) {
      var added = annotations.filter(function (annot) {
        return !findByID(annot.id);
      });

      store.dispatch({
        type: types.ADD_ANNOTATIONS,
        annotations: annotations,
      });

      if (!store.getState().isSidebar) {
        return;
      }

      // If anchoring fails to complete in a reasonable amount of time, then
      // we assume that the annotation failed to anchor. If it does later
      // successfully anchor then the status will be updated.
      var ANCHORING_TIMEOUT = 500;

      var anchoringAnnots = added.filter(metadata.isWaitingToAnchor);
      if (anchoringAnnots.length) {
        setTimeout(function () {
          arrayUtil
            .filterMap(anchoringAnnots, function (annot) {
              return findByID(annot.id);
            })
            .filter(metadata.isWaitingToAnchor)
            .forEach(function (orphan) {
              store.dispatch({
                type: types.UPDATE_ANCHOR_STATUS,
                id: orphan.id,
                tag: orphan.$$tag,
                isOrphan: true,
              });
            });
        }, ANCHORING_TIMEOUT);
      }
    },

    /** Remove annotations from the currently displayed set. */
    removeAnnotations: function (annotations) {
      store.dispatch({
        type: types.REMOVE_ANNOTATIONS,
        annotations: annotations,
      });
    },

    /** Set the currently displayed annotations to the empty set. */
    clearAnnotations: function () {
      store.dispatch({type: types.CLEAR_ANNOTATIONS});
    },

    /**
     * Updating the local tag and anchoring status of an annotation.
     *
     * @param {string|null} id - Annotation ID
     * @param {string} tag - The local tag assigned to this annotation to link
     *        the object in the page and the annotation in the sidebar
     * @param {boolean} isOrphan - True if the annotation failed to anchor
     */
    updateAnchorStatus: function (id, tag, isOrphan) {
      store.dispatch({
        type: types.UPDATE_ANCHOR_STATUS,
        id: id,
        tag: tag,
        isOrphan: isOrphan,
      });
    },

    /** Set the type annotations to be displayed. */
    selectTab: function (type) {
      store.dispatch({
        type: types.SELECT_TAB,
        tab: type,
      });
    },

    /** Set the query used to filter displayed annotations. */
    setFilterQuery: function (query) {
      store.dispatch({
        type: types.SET_FILTER_QUERY,
        query: query,
      });
    },

    /** Sets the sort key for the annotation list. */
    setSortKey: function (key) {
      store.dispatch({
        type: types.SET_SORT_KEY,
        key: key,
      });
    },

    /**
     * Highlight annotations with the given `ids`.
     *
     * This is used to indicate the specific annotation in a thread that was
     * linked to for example.
     */
    highlightAnnotations: function (ids) {
      store.dispatch({
        type: types.HIGHLIGHT_ANNOTATIONS,
        highlighted: ids,
      });
    },

    /** Set whether the app is the sidebar */
    setAppIsSidebar: function (isSidebar) {
      store.dispatch({type: types.SET_SIDEBAR, isSidebar: isSidebar});
    },
  };
};
