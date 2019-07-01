'use strict';

const { createElement } = require('preact');
const classnames = require('classnames');
const propTypes = require('prop-types');

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
      onClick={onChangeTab.bind(this, type)}
      onTouchStart={onChangeTab.bind(this, type)}
    >
      <span>
        {children}
        {count > 0 && !isWaitingToAnchor && (
          <span className="selection-tabs__count">{count}</span>
        )}
      </span>
    </a>
  );
}
Tab.propTypes = {
  /**
   * Child components
   */
  children: propTypes.node.isRequired,
  /**
   * The total annotations for this tab.
   */
  count: propTypes.number.isRequired,
  /**
   * Are there any annotations still waiting to anchor?.
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
  type: propTypes.string.isRequired,
};

/**
 *  Tabbed display of annotations and notes.
 */

function SelectionTabs({
  isWaitingToAnchorAnnotations,
  isLoading,
  selectedTab,
  totalAnnotations,
  totalNotes,
  totalOrphans,
  settings,
  session,
}) {
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

  const showAnnotationsUnavailableMessage = (() => {
    return (
      selectedTab === uiConstants.TAB_ANNOTATIONS &&
      totalAnnotations === 0 &&
      !isWaitingToAnchorAnnotations
    );
  })();

  const showNotesUnavailableMessage = (() => {
    return selectedTab === uiConstants.TAB_NOTES && totalNotes === 0;
  })();

  const showSidebarTutorial = (() => {
    return sessionUtil.shouldShowSidebarTutorial(session.state);
  })();

  return (
    <div>
      <div
        className={classnames('selection-tabs', {
          'selection-tabs--theme-clean': isThemeClean,
        })}
      >
        <Tab
          count={totalAnnotations}
          isWaitingToAnchor={isWaitingToAnchorAnnotations}
          selected={selectedTab === uiConstants.TAB_ANNOTATIONS}
          type={uiConstants.TAB_ANNOTATIONS}
          onChangeTab={selectTab}
        >
          Annotations
        </Tab>
        <Tab
          count={totalNotes}
          isWaitingToAnchor={isWaitingToAnchorAnnotations}
          selected={selectedTab === uiConstants.TAB_NOTES}
          type={uiConstants.TAB_NOTES}
          onChangeTab={selectTab}
        >
          Page Notes
        </Tab>
        <Tab
          count={totalOrphans}
          isWaitingToAnchor={isWaitingToAnchorAnnotations}
          selected={selectedTab === uiConstants.TAB_ORPHANS}
          type={uiConstants.TAB_ORPHANS}
          onChangeTab={selectTab}
        >
          Orphans
        </Tab>
      </div>
      {/*
        Issue: #1206
        uiConstants.TAB_NOTES
        {settings.enableExperimentalNewNoteButton && selectedTab === uiConstants.TAB_NOTES &&
          <new-note-btn></new-note-btn>
        }
        */}
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
    </div>
  );
}
SelectionTabs.propTypes = {
  /**
   * Are we waiting on any annotations from the server?
   */
  isLoading: propTypes.bool.isRequired,
  /**
   * Are there any annotations still waiting to anchor?
   */
  isWaitingToAnchorAnnotations: propTypes.bool.isRequired,
  /**
   * The currently selected tab (annotations, notes or orphans).
   */
  selectedTab: propTypes.string.isRequired,
  /**
   * The totals for each respect tab.
   */
  totalAnnotations: propTypes.number.isRequired,
  totalNotes: propTypes.number.isRequired,
  totalOrphans: propTypes.number.isRequired,

  // Injected services.
  settings: propTypes.object.isRequired,
  session: propTypes.object.isRequired,
};

SelectionTabs.injectedProps = ['session', 'settings'];

module.exports = withServices(SelectionTabs);
