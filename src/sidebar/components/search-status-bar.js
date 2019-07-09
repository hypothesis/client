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
function SearchStatusBar({
  selectedTab,
  totalAnnotations,
  totalNotes,
  rootThread,
}) {
  const storeState = useStore(store => store.getState());
  const clearSelection = useStore(store => store.clearSelection);
  const filterQuery = storeState.filterQuery;
  const filterActive = !!storeState.filterQuery;

  const thread = rootThread.thread(storeState);

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
                {totalAnnotations > 1 && <span> ({totalAnnotations})</span>}
              </Fragment>
            )}
            {selectedTab === uiConstants.TAB_NOTES && (
              <Fragment>
                Show all notes
                {totalNotes > 1 && <span> ({totalNotes})</span>}
              </Fragment>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

SearchStatusBar.propTypes = {
  selectedTab: propTypes.oneOf([
    uiConstants.TAB_ANNOTATIONS,
    uiConstants.TAB_ORPHANS,
    uiConstants.TAB_NOTES,
  ]).isRequired,
  totalAnnotations: propTypes.number.isRequired,
  totalNotes: propTypes.number.isRequired,
  rootThread: propTypes.object.isRequired,
};

SearchStatusBar.injectedProps = ['rootThread'];

module.exports = withServices(SearchStatusBar);
