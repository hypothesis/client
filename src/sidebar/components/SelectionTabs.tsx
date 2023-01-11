import {
  AnnotateIcon,
  Button,
  Card,
  CardContent,
  LinkButton,
  PlusIcon,
} from '@hypothesis/frontend-shared/lib/next';
import classnames from 'classnames';
import type { ComponentChildren } from 'preact';

import type { SidebarSettings } from '../../types/config';
import type { TabName } from '../../types/sidebar';

import { applyTheme } from '../helpers/theme';
import type { AnnotationsService } from '../services/annotations';
import { withServices } from '../service-context';
import { useSidebarStore } from '../store';

type TabProps = {
  children: ComponentChildren;

  /** The total number of annotations for this tab */
  count: number;

  /** Is this tab the currently-active tab? */
  isSelected: boolean;

  /** Are there any annotations still waiting to anchor? */
  isWaitingToAnchor: boolean;

  label: string;

  /** Callback to invoke when this tab is selected */
  onSelect: () => void;
};

/**
 * Display name of the tab and annotation count
 */
function Tab({
  children,
  count,
  isWaitingToAnchor,
  isSelected,
  label,
  onSelect,
}: TabProps) {
  const selectTab = () => {
    if (!isSelected) {
      onSelect();
    }
  };

  const title = count > 0 ? `${label} (${count} available)` : label;

  return (
    <LinkButton
      classes={classnames('bg-transparent min-w-[5.25rem]', {
        'font-bold': isSelected,
      })}
      color="text"
      // Listen for `onMouseDown` so that the tab is selected when _pressed_
      // as this makes the UI feel faster. Also listen for `onClick` as a fallback
      // to enable selecting the tab via other input methods.
      onClick={selectTab}
      onMouseDown={selectTab}
      pressed={!!isSelected}
      role="tab"
      tabIndex={0}
      title={title}
      underline="none"
    >
      <>
        {children}
        {count > 0 && !isWaitingToAnchor && (
          <span className="relative bottom-[3px] left-[2px] text-[10px]">
            {count}
          </span>
        )}
      </>
    </LinkButton>
  );
}

export type SelectionTabProps = {
  /** Are we waiting on any annotations from the server? */
  isLoading: boolean;

  // injected
  settings: SidebarSettings;
  annotationsService: AnnotationsService;
};

/**
 * Tabbed display of annotations and notes
 */
function SelectionTabs({
  annotationsService,
  isLoading,
  settings,
}: SelectionTabProps) {
  const store = useSidebarStore();
  const selectedTab = store.selectedTab();
  const noteCount = store.noteCount();
  const annotationCount = store.annotationCount();
  const orphanCount = store.orphanCount();
  const isWaitingToAnchorAnnotations = store.isWaitingToAnchorAnnotations();

  const selectTab = (tabId: TabName) => {
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
          <Button
            data-testid="new-note-button"
            onClick={() => annotationsService.createPageNote()}
            variant="primary"
            style={applyTheme(['ctaBackgroundColor'], settings)}
          >
            <PlusIcon />
            New note
          </Button>
        </div>
      )}
      {!isLoading && showNotesUnavailableMessage && (
        <Card data-testid="notes-unavailable-message" variant="flat">
          <CardContent classes="text-center">
            There are no page notes in this group.
          </CardContent>
        </Card>
      )}
      {!isLoading && showAnnotationsUnavailableMessage && (
        <Card data-testid="annotations-unavailable-message" variant="flat">
          <CardContent
            // TODO: Remove !important spacing class after
            // https://github.com/hypothesis/frontend-shared/issues/676 is addressed
            classes="text-center !space-y-1"
          >
            <p>There are no annotations in this group.</p>
            <p>
              Create one by selecting some text and clicking the{' '}
              <AnnotateIcon
                className="w-em h-em inline m-0.5 -mt-0.5"
                title="Annotate"
              />{' '}
              button.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default withServices(SelectionTabs, ['annotationsService', 'settings']);
