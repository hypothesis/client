import {
  Frame,
  Icon,
  LabeledButton,
  LinkButton,
} from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import { applyTheme } from '../helpers/theme';
import { useStoreProxy } from '../store/use-store';
import { withServices } from '../service-context';

/**
 * @typedef {import('../../types/config').SidebarSettings} SidebarSettings
 * @typedef {import('../../types/sidebar').TabName} TabName
 */

/**
 * @typedef {import('preact').ComponentChildren} Children
 *
 * @typedef TabProps
 * @prop {Children} children
 * @prop {number} count - The total annotations for this tab
 * @prop {boolean} isSelected - Is this tab currently selected?
 * @prop {boolean} isWaitingToAnchor - Are there any annotations still waiting to anchor?
 * @prop {string} label - A string label to use for a11y
 * @prop {() => any} onSelect - Callback to invoke when this tab is selected
 */

/**
 * Display name of the tab and annotation count
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
    <LinkButton
      classes={classnames(
        'inline bg-transparent min-w-[5.25rem] text-color-text hover:!no-underline',
        {
          'font-bold': isSelected,
        }
      )}
      // Listen for `onMouseDown` so that the tab is selected when _pressed_
      // as this makes the UI feel faster. Also listen for `onClick` as a fallback
      // to enable selecting the tab via other input methods.
      onClick={selectTab}
      onMouseDown={selectTab}
      pressed={!!isSelected}
      role="tab"
      tabIndex={0}
      title={title}
    >
      <>
        {children}
        {count > 0 && !isWaitingToAnchor && (
          <span className="relative bottom-[3px] left-[2px] text-tiny">
            {count}
          </span>
        )}
      </>
    </LinkButton>
  );
}

/**
 * @typedef SelectionTabsProps
 * @prop {boolean} isLoading - Are we waiting on any annotations from the server?
 * @prop {SidebarSettings} settings - Injected service.
 * @prop {import('../services/annotations').AnnotationsService} annotationsService
 */

/**
 * Tabbed display of annotations and notes
 *
 * @param {SelectionTabsProps} props
 */
function SelectionTabs({ annotationsService, isLoading, settings }) {
  const store = useStoreProxy();
  const selectedTab = store.selectedTab();
  const noteCount = store.noteCount();
  const annotationCount = store.annotationCount();
  const orphanCount = store.orphanCount();
  const isWaitingToAnchorAnnotations = store.isWaitingToAnchorAnnotations();

  /**
   * @param {TabName} tabId
   */
  const selectTab = tabId => {
    store.clearSelection();
    store.selectTab(tabId);
  };

  const showAnnotationsUnavailableMessage =
    selectedTab === 'annotation' &&
    annotationCount === 0 &&
    !isWaitingToAnchorAnnotations;

  const showNotesUnavailableMessage = selectedTab === 'note' && noteCount === 0;

  return (
    <div
      className={classnames(
        // 9px balances out the space above the tabs
        'space-y-3 pb-[9px]'
      )}
    >
      <div className="flex gap-x-6 theme-clean:ml-[15px]" role="tablist">
        <Tab
          count={annotationCount}
          isWaitingToAnchor={isWaitingToAnchorAnnotations}
          isSelected={selectedTab === 'annotation'}
          label="Annotations"
          onSelect={() => selectTab('annotation')}
        >
          Annotations
        </Tab>
        <Tab
          count={noteCount}
          isWaitingToAnchor={isWaitingToAnchorAnnotations}
          isSelected={selectedTab === 'note'}
          label="Page notes"
          onSelect={() => selectTab('note')}
        >
          Page Notes
        </Tab>
        {orphanCount > 0 && (
          <Tab
            count={orphanCount}
            isWaitingToAnchor={isWaitingToAnchorAnnotations}
            isSelected={selectedTab === 'orphan'}
            label="Orphans"
            onSelect={() => selectTab('orphan')}
          >
            Orphans
          </Tab>
        )}
      </div>
      {selectedTab === 'note' && settings.enableExperimentalNewNoteButton && (
        <div className="flex justify-end">
          <LabeledButton
            data-testid="new-note-button"
            icon="add"
            onClick={() => annotationsService.createPageNote()}
            variant="primary"
            style={applyTheme(['ctaBackgroundColor'], settings)}
          >
            New note
          </LabeledButton>
        </div>
      )}
      {!isLoading && showNotesUnavailableMessage && (
        <Frame classes="text-center">
          <span data-testid="notes-unavailable-message">
            There are no page notes in this group.
          </span>
        </Frame>
      )}
      {!isLoading && showAnnotationsUnavailableMessage && (
        <Frame classes="text-center">
          <span data-testid="annotations-unavailable-message">
            There are no annotations in this group.
            <br />
            Create one by selecting some text and clicking the{' '}
            <Icon
              classes="inline m-0.5 -mt-0.5"
              name="annotate"
              title="Annotate"
            />{' '}
            button.
          </span>
        </Frame>
      )}
    </div>
  );
}

export default withServices(SelectionTabs, ['annotationsService', 'settings']);
