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
function Tab({
  children,
  count,
  isWaitingToAnchor,
  onChangeTab,
  selected,
  type,
}) {
  return (
    <button
      className={classnames('selection-tabs__type', {
        'is-selected': selected,
      })}
      onMouseDown={onChangeTab.bind(this, type)}
      onTouchStart={onChangeTab.bind(this, type)}
      role="tab"
      tabIndex="0"
      aria-selected={selected.toString()}
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
   * Are there any annotations still waiting to anchor?
   */
  isWaitingToAnchor: propTypes.bool.isRequired,
  /**
   * Callback when this tab is active with type as a parameter.
   */
  onChangeTab: propTypes.func.isRequired,
  /**
   * Is this tab currently selected?
   */
  selected: propTypes.bool.isRequired,
  /**
   * The type value for this tab. One of
   * 'annotation', 'note', or 'orphan'.
   */
  type: propTypes.oneOf(['annotation', 'note', 'orphan']).isRequired,
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

  const selectTab = function(type) {
    store.clearSelectedAnnotations();
    store.selectTab(type);
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
          selected={selectedTab === uiConstants.TAB_ANNOTATIONS}
          type={uiConstants.TAB_ANNOTATIONS}
          onChangeTab={selectTab}
        >
          Annotations
        </Tab>
        <Tab
          count={noteCount}
          isWaitingToAnchor={isWaitingToAnchorAnnotations}
          selected={selectedTab === uiConstants.TAB_NOTES}
          type={uiConstants.TAB_NOTES}
          onChangeTab={selectTab}
        >
          Page Notes
        </Tab>
        {orphanCount > 0 && (
          <Tab
            count={orphanCount}
            isWaitingToAnchor={isWaitingToAnchorAnnotations}
            selected={selectedTab === uiConstants.TAB_ORPHANS}
            type={uiConstants.TAB_ORPHANS}
            onChangeTab={selectTab}
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
