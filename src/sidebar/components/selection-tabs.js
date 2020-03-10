import classnames from 'classnames';
import { createElement } from 'preact';
import { Fragment } from 'preact';
import propTypes from 'prop-types';

import useStore from '../store/use-store';
import uiConstants from '../ui-constants';
import { withServices } from '../util/service-context';

import NewNoteBtn from './new-note-btn';
import SvgIcon from './svg-icon';

/**
 *  Display name of the tab and annotation count.
 */
function Tab({ children, count, isWaitingToAnchor, isSelected, onSelect }) {
  const selectTab = () => {
    if (!isSelected) {
      onSelect();
    }
  };

  return (
    <button
      className={classnames('selection-tabs__type', {
        'is-selected': isSelected,
      })}
      // Listen for `onMouseDown` so that the tab is selected when _pressed_
      // as this makes the UI feel faster. Also listen for `onClick` as a fallback
      // to enable selecting the tab via other input methods.
      onClick={selectTab}
      onMouseDown={selectTab}
      role="tab"
      tabIndex="0"
      aria-selected={isSelected.toString()}
    >
      {children}
      {count > 0 && !isWaitingToAnchor && (
        <span className="selection-tabs__count"> {count}</span>
      )}
    </button>
  );
}

Tab.propTypes = {
  /**
   * Child components.
   */
  children: propTypes.node.isRequired,
  /**
   * The total annotations for this tab.
   */
  count: propTypes.number.isRequired,
  /**
   * Is this tab currently selected?
   */
  isSelected: propTypes.bool.isRequired,
  /**
   * Are there any annotations still waiting to anchor?
   */
  isWaitingToAnchor: propTypes.bool.isRequired,
  /**
   * Callback to invoke when this tab is selected.
   */
  onSelect: propTypes.func.isRequired,
};

/**
 *  Tabbed display of annotations and notes.
 */

function SelectionTabs({ isLoading, settings }) {
  const selectedTab = useStore(store => store.getState().selection.selectedTab);
  const noteCount = useStore(store => store.noteCount());
  const annotationCount = useStore(store => store.annotationCount());
  const orphanCount = useStore(store => store.orphanCount());
  const isWaitingToAnchorAnnotations = useStore(store =>
    store.isWaitingToAnchorAnnotations()
  );
  // actions
  const store = useStore(store => ({
    clearSelectedAnnotations: store.clearSelectedAnnotations,
    selectTab: store.selectTab,
  }));

  const isThemeClean = settings.theme === 'clean';

  const selectTab = tabId => {
    store.clearSelectedAnnotations();
    store.selectTab(tabId);
  };

  const showAnnotationsUnavailableMessage =
    selectedTab === uiConstants.TAB_ANNOTATIONS &&
    annotationCount === 0 &&
    !isWaitingToAnchorAnnotations;

  const showNotesUnavailableMessage =
    selectedTab === uiConstants.TAB_NOTES && noteCount === 0;

  return (
    <Fragment>
      <div
        className={classnames('selection-tabs', {
          'selection-tabs--theme-clean': isThemeClean,
        })}
        role="tablist"
      >
        <Tab
          count={annotationCount}
          isWaitingToAnchor={isWaitingToAnchorAnnotations}
          isSelected={selectedTab === uiConstants.TAB_ANNOTATIONS}
          onSelect={() => selectTab(uiConstants.TAB_ANNOTATIONS)}
        >
          Annotations
        </Tab>
        <Tab
          count={noteCount}
          isWaitingToAnchor={isWaitingToAnchorAnnotations}
          isSelected={selectedTab === uiConstants.TAB_NOTES}
          onSelect={() => selectTab(uiConstants.TAB_NOTES)}
        >
          Page Notes
        </Tab>
        {orphanCount > 0 && (
          <Tab
            count={orphanCount}
            isWaitingToAnchor={isWaitingToAnchorAnnotations}
            isSelected={selectedTab === uiConstants.TAB_ORPHANS}
            onSelect={() => selectTab(uiConstants.TAB_ORPHANS)}
          >
            Orphans
          </Tab>
        )}
      </div>
      {selectedTab === uiConstants.TAB_NOTES &&
        settings.enableExperimentalNewNoteButton && <NewNoteBtn />}
      {!isLoading && (
        <div>
          {showNotesUnavailableMessage && (
            <div className="selection-tabs__message">
              There are no page notes in this group.
            </div>
          )}
          {showAnnotationsUnavailableMessage && (
            <div className="selection-tabs__message">
              There are no annotations in this group.
              <br />
              Create one by selecting some text and clicking the{' '}
              <SvgIcon
                name="annotate"
                inline={true}
                className="selection-tabs__icon"
              />{' '}
              button.
            </div>
          )}
        </div>
      )}
    </Fragment>
  );
}
SelectionTabs.propTypes = {
  /**
   * Are we waiting on any annotations from the server?
   */
  isLoading: propTypes.bool.isRequired,

  // Injected services.
  settings: propTypes.object.isRequired,
};

SelectionTabs.injectedProps = ['settings'];

export default withServices(SelectionTabs);
