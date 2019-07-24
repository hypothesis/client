'use strict';

const { Fragment, createElement } = require('preact');
const propTypes = require('prop-types');
const { useMemo } = require('preact/hooks');

const { withServices } = require('../util/service-context');
const uiConstants = require('../ui-constants');
const useStore = require('../store/use-store');

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
  const {
    directLinkedGroupFetchFailed,
    filterQuery,
    selectedAnnotationMap,
    selectedTab,
  } = useStore(store => ({
    directLinkedGroupFetchFailed: store.getState().directLinkedGroupFetchFailed,
    filterQuery: store.getState().filterQuery,
    selectedAnnotationMap: store.getState().selectedAnnotationMap,
    selectedTab: store.getState().selectedTab,
  }));
  const clearSelection = useStore(store => store.clearSelection);
  const filterActive = !!filterQuery;
  const annotationCount = useStore(store => store.annotationCount());
  const noteCount = useStore(store => store.noteCount());

  const thread = useStore(store => rootThread.thread(store.getState()));

  const visibleCount = useMemo(() => {
    return countVisibleAnns(thread);
  }, [thread]);

  const filterResults = () => {
    const resultsCount = visibleCount;
    switch (resultsCount) {
      case 0:
        return 'No results for "' + filterQuery + '"';
      case 1:
        return '1 search result';
      default:
        return resultsCount + ' search results';
    }
  };

  const areNotAllAnnotationsVisible = () => {
    if (directLinkedGroupFetchFailed) {
      return true;
    }
    const selection = selectedAnnotationMap;
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
            onClick={clearSelection}
            title="Clear the search filter and show all annotations"
          >
            <i className="primary-action-btn__icon h-icon-close" />
            Clear search
          </button>
          <span>{filterResults()}</span>
        </div>
      )}
      {!filterActive && areNotAllAnnotationsVisible() && (
        <div className="search-status-bar">
          <button
            className="primary-action-btn primary-action-btn--short"
            onClick={clearSelection}
            title="Clear the selection and show all annotations"
          >
            {selectedTab === uiConstants.TAB_ORPHANS && (
              <Fragment>Show all annotations and notes</Fragment>
            )}
            {selectedTab === uiConstants.TAB_ANNOTATIONS && (
              <Fragment>
                Show all annotations
                {annotationCount > 1 && <span> ({annotationCount})</span>}
              </Fragment>
            )}
            {selectedTab === uiConstants.TAB_NOTES && (
              <Fragment>
                Show all notes
                {noteCount > 1 && <span> ({noteCount})</span>}
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
