import classnames from 'classnames';
import { SvgIcon } from '@hypothesis/frontend-shared';
import { createElement } from 'preact';
import propTypes from 'prop-types';

import { useStoreProxy } from '../store/use-store';
import uiConstants from '../ui-constants';
import { withServices } from '../service-context';

import NewNoteBtn from './NewNoteBtn';

/**
 * @typedef {import('../../types/config').MergedConfig} MergedConfig
 */

/**
 * @typedef TabProps
 * @prop {Object} children - Child components.
 * @prop {number} count - The total annotations for this tab.
 * @prop {boolean} isSelected - Is this tab currently selected?
 * @prop {boolean} isWaitingToAnchor - Are there any annotations still waiting to anchor?
 * @prop {string} label - A string label to use for `aria-label` and `title`
 * @prop {() => any} onSelect - Callback to invoke when this tab is selected.
 */

/**
 * Display name of the tab and annotation count.
 *
 * @param {TabProps} props
 */
function Tab({
  children,
  count,
  isWaitingToAnchor,
  isSelected,
  label,
  onSelect,
}) {
  const selectTab = () => {
    if (!isSelected) {
      onSelect();
    }
  };

  const title = count > 0 ? `${label} (${count} available)` : label;

  return (
    <div>
      <button
        className={classnames('SelectionTabs__type', {
          'is-selected': isSelected,
        })}
        // Listen for `onMouseDown` so that the tab is selected when _pressed_
        // as this makes the UI feel faster. Also listen for `onClick` as a fallback
        // to enable selecting the tab via other input methods.
        onClick={selectTab}
        onMouseDown={selectTab}
        role="tab"
        tabIndex={0}
        title={title}
        aria-label={title}
        aria-selected={isSelected.toString()}
      >
        {children}
        {count > 0 && !isWaitingToAnchor && (
          <span className="SelectionTabs__count"> {count}</span>
        )}
      </button>
    </div>
  );
}

Tab.propTypes = {
  children: propTypes.node.isRequired,
  count: propTypes.number.isRequired,
  isSelected: propTypes.bool.isRequired,
  isWaitingToAnchor: propTypes.bool.isRequired,
  label: propTypes.string.isRequired,
  onSelect: propTypes.func.isRequired,
};

/**
 * @typedef SelectionTabsProps
 * @prop {boolean} isLoading - Are we waiting on any annotations from the server?
 * @prop {MergedConfig} settings - Injected service.
 */

/**
 * Tabbed display of annotations and notes.
 *
 * @param {SelectionTabsProps} props
 */
function SelectionTabs({ isLoading, settings }) {
  const store = useStoreProxy();
  const selectedTab = store.selectedTab();
  const noteCount = store.noteCount();
  const annotationCount = store.annotationCount();
  const orphanCount = store.orphanCount();
  const isWaitingToAnchorAnnotations = store.isWaitingToAnchorAnnotations();

  const selectTab = tabId => {
    store.clearSelection();
    store.selectTab(tabId);
  };

  const showAnnotationsUnavailableMessage =
    selectedTab === uiConstants.TAB_ANNOTATIONS &&
    annotationCount === 0 &&
    !isWaitingToAnchorAnnotations;

  const showNotesUnavailableMessage =
    selectedTab === uiConstants.TAB_NOTES && noteCount === 0;

  return (
    <div className="SelectionTabs-container">
      <div className="SelectionTabs" role="tablist">
        <Tab
          count={annotationCount}
          isWaitingToAnchor={isWaitingToAnchorAnnotations}
          isSelected={selectedTab === uiConstants.TAB_ANNOTATIONS}
          label="Annotations"
          onSelect={() => selectTab(uiConstants.TAB_ANNOTATIONS)}
        >
          Annotations
        </Tab>
        <Tab
          count={noteCount}
          isWaitingToAnchor={isWaitingToAnchorAnnotations}
          isSelected={selectedTab === uiConstants.TAB_NOTES}
          label="Page notes"
          onSelect={() => selectTab(uiConstants.TAB_NOTES)}
        >
          Page Notes
        </Tab>
        {orphanCount > 0 && (
          <Tab
            count={orphanCount}
            isWaitingToAnchor={isWaitingToAnchorAnnotations}
            isSelected={selectedTab === uiConstants.TAB_ORPHANS}
            label="Orphans"
            onSelect={() => selectTab(uiConstants.TAB_ORPHANS)}
          >
            Orphans
          </Tab>
        )}
      </div>
      {selectedTab === uiConstants.TAB_NOTES &&
        settings.enableExperimentalNewNoteButton && <NewNoteBtn />}
      {!isLoading && showNotesUnavailableMessage && (
        <div className="SelectionTabs__message">
          There are no page notes in this group.
        </div>
      )}
      {!isLoading && showAnnotationsUnavailableMessage && (
        <div className="SelectionTabs__message">
          There are no annotations in this group.
          <br />
          Create one by selecting some text and clicking the{' '}
          <SvgIcon
            name="annotate"
            inline={true}
            className="SelectionTabs__icon"
          />{' '}
          button.
        </div>
      )}
    </div>
  );
}
SelectionTabs.propTypes = {
  isLoading: propTypes.bool.isRequired,
  settings: propTypes.object.isRequired,
};

SelectionTabs.injectedProps = ['settings'];

export default withServices(SelectionTabs);
