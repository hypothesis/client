'use strict';

const classnames = require('classnames');
const propTypes = require('prop-types');
const { createElement } = require('preact');
const { Fragment } = require('preact');

const NewNoteBtn = require('./new-note-btn');
const sessionUtil = require('../util/session-util');
const uiConstants = require('../ui-constants');
const useStore = require('../store/use-store');
const { withServices } = require('../util/service-context');

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
    <a
      className={classnames('selection-tabs__type', {
        'is-selected': selected,
      })}
      onMouseDown={onChangeTab.bind(this, type)}
      onTouchStart={onChangeTab.bind(this, type)}
    >
      {children}
      {count > 0 && !isWaitingToAnchor && (
        <span className="selection-tabs__count"> {count}</span>
      )}
    </a>
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

function SelectionTabs({ isLoading, settings, session }) {
  const selectedTab = useStore(store => store.getState().selectedTab);
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

  const showSidebarTutorial = sessionUtil.shouldShowSidebarTutorial(
    session.state
  );

  return (
    <Fragment>
      <div
        className={classnames('selection-tabs', {
          'selection-tabs--theme-clean': isThemeClean,
        })}
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
        <div className="selection-tabs__empty-message">
          {showNotesUnavailableMessage && (
            <div className="annotation-unavailable-message">
              <p className="annotation-unavailable-message__label">
                There are no page notes in this group.
                {settings.enableExperimentalNewNoteButton &&
                  !showSidebarTutorial && (
                    <div className="annotation-unavailable-message__tutorial">
                      Create one by clicking the{' '}
                      <i className="help-icon h-icon-note" /> button.
                    </div>
                  )}
              </p>
            </div>
          )}
          {showAnnotationsUnavailableMessage && (
            <div className="annotation-unavailable-message">
              <p className="annotation-unavailable-message__label">
                There are no annotations in this group.
                {!showSidebarTutorial && (
                  <div className="annotation-unavailable-message__tutorial">
                    Create one by selecting some text and clicking the{' '}
                    <i className="help-icon h-icon-annotate" /> button.
                  </div>
                )}
              </p>
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
  session: propTypes.object.isRequired,
};

SelectionTabs.injectedProps = ['session', 'settings'];

module.exports = withServices(SelectionTabs);
