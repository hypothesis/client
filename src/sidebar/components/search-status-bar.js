'use strict';

const { Fragment, createElement } = require('preact');
const propTypes = require('prop-types');
const { useMemo } = require('preact/hooks');

const { withServices } = require('../util/service-context');
const uiConstants = require('../ui-constants');
const useStore = require('../store/use-store');

/**
 * Of the annotations in the thread `annThread`, how many
 * are currently `visible` in the browser (sidebar)?
 *
 * TODO: This function should be a selector or a reusable util
 */
const countVisibleAnns = annThread => {
  return annThread.children.reduce(
    function(count, child) {
      return count + countVisibleAnns(child);
    },
    annThread.visible ? 1 : 0
  );
};

/**
 * A bar where the user can clear a selection or search and see whether
 * any search results were found.
 * */
function SearchStatusBar({ rootThread }) {
  const actions = useStore(store => ({
    clearSelection: store.clearSelection,
  }));

  const storeState = useStore(store => ({
    annotationCount: store.annotationCount(),
    directLinkedGroupFetchFailed: store.getRootState().directLinked
      .directLinkedGroupFetchFailed,
    filterQuery: store.getRootState().selection.filterQuery,
    focusModeFocused: store.focusModeFocused(),
    focusModeUserPrettyName: store.focusModeUserPrettyName(),
    noteCount: store.noteCount(),
    selectedAnnotationMap: store.getRootState().selection.selectedAnnotationMap,
    selectedTab: store.getRootState().selection.selectedTab,
  }));

  const filterActive = !!storeState.filterQuery;

  const thread = useStore(store => rootThread.thread(store.getRootState()));

  const visibleCount = useMemo(() => {
    return countVisibleAnns(thread);
  }, [thread]);

  const filterResults = (() => {
    switch (visibleCount) {
      case 0:
        return `No results for "${storeState.filterQuery}"`;
      case 1:
        return '1 search result';
      default:
        return `${visibleCount} search results`;
    }
  })();

  const focusResults = (() => {
    switch (visibleCount) {
      case 0:
        return `No annotations for ${storeState.focusModeUserPrettyName}`;
      case 1:
        return 'Showing 1 annotation';
      default:
        return `Showing ${visibleCount} annotations`;
    }
  })();

  const areNotAllAnnotationsVisible = () => {
    if (storeState.directLinkedGroupFetchFailed) {
      return true;
    }
    const selection = storeState.selectedAnnotationMap;
    if (!selection) {
      return false;
    }
    return Object.keys(selection).length > 0;
  };

  return (
    <div>
      {filterActive && (
        <div className="search-status-bar">
          <button
            className="primary-action-btn primary-action-btn--short"
            onClick={actions.clearSelection}
            title="Clear the search filter and show all annotations"
          >
            <i className="primary-action-btn__icon h-icon-close" />
            Clear search
          </button>
          <span>{filterResults}</span>
        </div>
      )}
      {!filterActive && storeState.focusModeFocused && (
        <div className="search-status-bar">
          <strong>{focusResults}</strong>
        </div>
      )}
      {!filterActive && areNotAllAnnotationsVisible() && (
        <div className="search-status-bar">
          <button
            className="primary-action-btn primary-action-btn--short"
            onClick={actions.clearSelection}
            title="Clear the selection and show all annotations"
          >
            {storeState.selectedTab === uiConstants.TAB_ORPHANS && (
              <Fragment>Show all annotations and notes</Fragment>
            )}
            {storeState.selectedTab === uiConstants.TAB_ANNOTATIONS && (
              <Fragment>
                Show all annotations
                {storeState.annotationCount > 1 && (
                  <span> ({storeState.annotationCount})</span>
                )}
              </Fragment>
            )}
            {storeState.selectedTab === uiConstants.TAB_NOTES && (
              <Fragment>
                Show all notes
                {storeState.noteCount > 1 && (
                  <span> ({storeState.noteCount})</span>
                )}
              </Fragment>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

SearchStatusBar.propTypes = {
  // Injected services.
  rootThread: propTypes.object.isRequired,
};

SearchStatusBar.injectedProps = ['rootThread'];

module.exports = withServices(SearchStatusBar);
